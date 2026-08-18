import { prisma } from "@/lib/prisma";
import { dayNumber } from "@/lib/dates";
import { ReportDateRangeError, ReportNotFoundError } from "@/lib/reports";
import type { GitHubCommit, GitHubRepository } from "@/lib/github";

export class GitHubOwnershipError extends Error {
  constructor(message = "github-not-found") {
    super(message);
    this.name = "GitHubOwnershipError";
  }
}

export class GitHubNotConnectedError extends Error {
  constructor(message = "github-not-connected") {
    super(message);
    this.name = "GitHubNotConnectedError";
  }
}

export async function getConnectionForUser(userId: string) {
  return prisma.gitHubConnection.findUnique({
    where: { userId },
    include: { repositories: { orderBy: { fullName: "asc" } } },
  });
}

export async function findConnectionByGithubUserId(githubUserId: number) {
  return prisma.gitHubConnection.findFirst({
    where: { githubUserId: String(githubUserId) },
    select: { userId: true },
  });
}

export async function saveConnectionForUser(
  userId: string,
  data: {
    githubUserId: string;
    githubUsername: string;
    accessTokenEncrypted: string;
  }
) {
  return prisma.gitHubConnection.upsert({
    where: { userId },
    create: {
      userId,
      githubUserId: data.githubUserId,
      githubUsername: data.githubUsername,
      accessTokenEncrypted: data.accessTokenEncrypted,
    },
    update: {
      githubUserId: data.githubUserId,
      githubUsername: data.githubUsername,
      accessTokenEncrypted: data.accessTokenEncrypted,
    },
  });
}

export async function deleteConnectionForUser(userId: string) {
  const result = await prisma.gitHubConnection.deleteMany({
    where: { userId },
  });
  if (result.count === 0) {
    throw new GitHubNotConnectedError();
  }
  return result;
}

export async function listRepositoriesForUser(userId: string) {
  return prisma.repository.findMany({
    where: { userId },
    orderBy: [{ isSelected: "desc" }, { fullName: "asc" }],
  });
}

export async function syncRepositoriesForUser(
  userId: string,
  repos: GitHubRepository[]
) {
  const connection = await prisma.gitHubConnection.findUnique({
    where: { userId },
    select: { id: true },
  });
  if (!connection) {
    throw new GitHubNotConnectedError();
  }

  await prisma.$transaction(
    repos.map((repo) =>
      prisma.repository.upsert({
        where: {
          connectionId_githubId: {
            connectionId: connection.id,
            githubId: repo.id,
          },
        },
        create: {
          connectionId: connection.id,
          userId,
          githubId: repo.id,
          name: repo.name,
          fullName: repo.full_name,
          owner: repo.owner.login,
          defaultBranch: repo.default_branch,
          lastFetchedAt: new Date(),
        },
        update: {
          name: repo.name,
          fullName: repo.full_name,
          owner: repo.owner.login,
          defaultBranch: repo.default_branch,
          lastFetchedAt: new Date(),
        },
      })
    )
  );

  return prisma.repository.findMany({
    where: { userId },
    orderBy: [{ isSelected: "desc" }, { fullName: "asc" }],
  });
}

export async function setRepositorySelected(
  userId: string,
  repositoryId: string,
  selected: boolean
) {
  const owned = await prisma.repository.findFirst({
    where: { id: repositoryId, userId },
    select: { id: true },
  });
  if (!owned) {
    throw new GitHubOwnershipError();
  }
  return prisma.repository.update({
    where: { id: repositoryId },
    data: { isSelected: selected },
  });
}

export async function getOwnedRepository(userId: string, repositoryId: string) {
  const repository = await prisma.repository.findFirst({
    where: { id: repositoryId, userId },
    include: {
      connection: { select: { accessTokenEncrypted: true } },
    },
  });
  if (!repository) {
    throw new GitHubOwnershipError();
  }
  return repository;
}

export async function cacheCommitsForRepository(
  userId: string,
  repositoryId: string,
  commits: GitHubCommit[]
) {
  await getOwnedRepository(userId, repositoryId);

  return prisma.$transaction(
    commits.map((commit) =>
      prisma.commit.upsert({
        where: {
          repositoryId_sha: { repositoryId, sha: commit.sha },
        },
        create: {
          repositoryId,
          sha: commit.sha,
          message:
            commit.commit.message.split("\n")[0] || "Tanpa pesan",
          authorName: commit.commit.author?.name ?? "Unknown",
          authorEmail: commit.commit.author?.email ?? "",
          committedAt: new Date(commit.commit.author?.date ?? new Date()),
          url:
            commit.html_url || `https://github.com/${repositoryId}/${commit.sha}`,
        },
        update: {
          url: commit.html_url,
          authorName: commit.commit.author?.name ?? "Unknown",
          authorEmail: commit.commit.author?.email ?? "",
          committedAt: new Date(commit.commit.author?.date ?? new Date()),
          message: commit.commit.message.split("\n")[0] || "Tanpa pesan",
        },
      })
    )
  );
}

export async function listCachedCommits(
  userId: string,
  repositoryId: string,
  since?: Date,
  until?: Date
) {
  await getOwnedRepository(userId, repositoryId);
  return prisma.commit.findMany({
    where: {
      repositoryId,
      ...(since ? { committedAt: { gte: since } } : {}),
      ...(until ? { committedAt: { lte: until } } : {}),
    },
    orderBy: { committedAt: "desc" },
  });
}

export async function attachCommitToDailyLog(
  userId: string,
  reportId: string,
  date: Date,
  commitId: string
) {
  const report = await prisma.weeklyReport.findFirst({
    where: { id: reportId, userId },
    select: { id: true, startDate: true, endDate: true },
  });
  if (!report) {
    throw new ReportNotFoundError();
  }
  if (date < report.startDate || date > report.endDate) {
    throw new ReportDateRangeError();
  }

  const number = dayNumber(date);
  let dailyLog = await prisma.dailyLog.findFirst({
    where: { weeklyReportId: report.id, date },
    select: { id: true },
  });

  if (!dailyLog) {
    dailyLog = await prisma.dailyLog.create({
      data: {
        weeklyReportId: report.id,
        date,
        dayNumber: number,
        startTime: "",
        endTime: "",
        location: "",
      },
    });
  }

  const commit = await prisma.commit.findFirst({
    where: { id: commitId, repository: { userId } },
    select: { id: true },
  });
  if (!commit) {
    throw new GitHubOwnershipError("commit-not-found");
  }

  return prisma.logbookCommit.upsert({
    where: { dailyLogId_commitId: { dailyLogId: dailyLog.id, commitId: commit.id } },
    create: { dailyLogId: dailyLog.id, commitId: commit.id },
    update: {},
    include: {
      commit: { include: { repository: { select: { fullName: true } } } },
    },
  });
}

export async function detachCommitFromDailyLog(
  userId: string,
  reportId: string,
  date: Date,
  commitId: string
) {
  const report = await prisma.weeklyReport.findFirst({
    where: { id: reportId, userId },
    select: { id: true },
  });
  if (!report) {
    throw new ReportNotFoundError();
  }

  const dailyLog = await prisma.dailyLog.findFirst({
    where: { weeklyReportId: report.id, date },
    select: { id: true },
  });
  if (!dailyLog) {
    throw new GitHubOwnershipError("day-not-found");
  }

  const result = await prisma.logbookCommit.deleteMany({
    where: { dailyLogId: dailyLog.id, commitId },
  });
  if (result.count === 0) {
    throw new GitHubOwnershipError("commit-attachment-not-found");
  }
  return result;
}

export async function listCommitsForDailyLog(userId: string, dailyLogId: string) {
  const dailyLog = await prisma.dailyLog.findFirst({
    where: { id: dailyLogId, weeklyReport: { userId } },
    select: { id: true },
  });
  if (!dailyLog) {
    throw new GitHubOwnershipError("day-not-found");
  }
  return prisma.logbookCommit.findMany({
    where: { dailyLogId: dailyLog.id },
    include: {
      commit: { include: { repository: { select: { fullName: true } } } },
    },
    orderBy: { commit: { committedAt: "desc" } },
  });
}
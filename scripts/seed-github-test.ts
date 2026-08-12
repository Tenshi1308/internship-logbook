import "./env";
import { prisma } from "../lib/prisma";
import { hashPassword } from "../lib/password";
import { encryptSecret } from "../lib/encrypt";

async function main() {
  const email = "ghflow@example.com";
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    await prisma.user.delete({ where: { id: existing.id } });
  }

  const hash = await hashPassword("password123");
  const user = await prisma.user.create({
    data: {
      name: "GitHub Flow User",
      nim: "5554443332",
      email,
      passwordHash: hash,
      scheme: "Community Developer",
      partner: "Lavendrie Laundry",
    },
  });

  const tokenEncrypted = await encryptSecret("gho_mock-token-for-testing");

  const connection = await prisma.gitHubConnection.create({
    data: {
      userId: user.id,
      githubUserId: "90210",
      githubUsername: "ghflowuser",
      accessTokenEncrypted: tokenEncrypted,
      repositories: {
        create: [
          {
            githubId: 101,
            userId: user.id,
            name: "internship-logbook",
            fullName: "ghflowuser/internship-logbook",
            owner: "ghflowuser",
            defaultBranch: "main",
            isSelected: true,
            commits: {
              create: [
                {
                  sha: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
                  message: "feat: add authentication flow",
                  authorName: "GitHub Flow User",
                  authorEmail: "ghflow@example.com",
                  committedAt: new Date("2026-08-10T02:30:00Z"),
                  url: "https://github.com/ghflowuser/internship-logbook/commit/aaaaaaaa...",
                },
                {
                  sha: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
                  message: "fix: handle empty state",
                  authorName: "GitHub Flow User",
                  authorEmail: "ghflow@example.com",
                  committedAt: new Date("2026-08-10T06:15:00Z"),
                  url: "https://github.com/ghflowuser/internship-logbook/commit/bbbbbbbb...",
                },
                {
                  sha: "cccccccccccccccccccccccccccccccccccccccc",
                  message: "feat: implement weekly report persistence",
                  authorName: "GitHub Flow User",
                  authorEmail: "ghflow@example.com",
                  committedAt: new Date("2026-08-11T08:00:00Z"),
                  url: "https://github.com/ghflowuser/internship-logbook/commit/cccccccc...",
                },
              ],
            },
          },
          {
            githubId: 102,
            userId: user.id,
            name: "portofolio",
            fullName: "ghflowuser/portofolio",
            owner: "ghflowuser",
            defaultBranch: "main",
            isSelected: false,
          },
        ],
      },
    },
  });

  const start = new Date("2026-08-10T00:00:00Z");
  const end = new Date("2026-08-14T00:00:00Z");
  const report = await prisma.weeklyReport.create({
    data: {
      userId: user.id,
      weekNumber: 3,
      startDate: start,
      endDate: end,
      dailyLogs: {
        create: [
          {
            dayNumber: 1,
            date: start,
            startTime: "08:00",
            endTime: "16:00",
            location: "WFH",
            status: "COMPLETE",
          },
        ],
      },
    },
  });

  const day = await prisma.dailyLog.findFirst({
    where: { weeklyReportId: report.id, date: start },
    select: { id: true },
  });

  const commits = await prisma.commit.findMany({
    where: { repository: { connectionId: connection.id } },
    select: { id: true },
  });

  if (day && commits.length >= 2) {
    await prisma.logbookCommit.createMany({
      data: [
        { dailyLogId: day.id, commitId: commits[0].id },
        { dailyLogId: day.id, commitId: commits[1].id },
      ],
    });
  }

  console.log(
    `SEEDED ${user.email} user=${user.id} connection=${connection.id} report=${report.id}`
  );
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
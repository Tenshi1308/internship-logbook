import { prisma } from "@/lib/prisma";
import { dayNumber, toDateOnly } from "@/lib/dates";
import { ReportDateRangeError, ReportNotFoundError } from "@/lib/reports";
import type { AIEvidence } from "@/lib/ai";

export class InsufficientEvidenceError extends Error {
  constructor() {
    super("insufficient-evidence");
    this.name = "InsufficientEvidenceError";
  }
}

type ReportScope = { id: string; startDate: Date; endDate: Date };

async function resolveOwnedReport(
  userId: string,
  reportId: string
): Promise<ReportScope> {
  const report = await prisma.weeklyReport.findFirst({
    where: { id: reportId, userId },
    select: { id: true, startDate: true, endDate: true },
  });
  if (!report) {
    throw new ReportNotFoundError();
  }
  return report;
}

async function findOwnedDailyLog(
  userId: string,
  reportId: string,
  date: Date
) {
  const report = await resolveOwnedReport(userId, reportId);
  if (date < report.startDate || date > report.endDate) {
    throw new ReportDateRangeError();
  }
  return prisma.dailyLog.findFirst({
    where: { weeklyReportId: report.id, date },
    include: {
      manualActivities: { orderBy: { order: "asc" as const } },
      logbookCommits: {
        include: {
          commit: {
            include: {
              repository: { select: { fullName: true } },
            },
          },
        },
      },
    },
  });
}

export async function collectDailyLogEvidence(
  userId: string,
  reportId: string,
  date: Date
): Promise<AIEvidence> {
  const dailyLog = await findOwnedDailyLog(userId, reportId, date);
  if (!dailyLog) {
    throw new InsufficientEvidenceError();
  }

  const manualActivities = dailyLog.manualActivities.map(
    (activity) => activity.description
  );

  const commits = dailyLog.logbookCommits.map((link) => ({
    sha: link.commit.sha,
    message: link.commit.message,
    repositoryFullName: link.commit.repository.fullName,
    committedAt: link.commit.committedAt,
  }));

  if (manualActivities.length === 0 && commits.length === 0) {
    throw new InsufficientEvidenceError();
  }

  return {
    date: toDateOnly(dailyLog.date),
    location: dailyLog.location,
    startTime: dailyLog.startTime,
    endTime: dailyLog.endTime,
    manualActivities,
    commits,
  };
}

export async function saveAiDraftForUser(
  userId: string,
  reportId: string,
  date: Date,
  draft: string
) {
  const report = await resolveOwnedReport(userId, reportId);
  if (date < report.startDate || date > report.endDate) {
    throw new ReportDateRangeError();
  }

  const existing = await prisma.dailyLog.findFirst({
    where: { weeklyReportId: report.id, date },
    select: { id: true },
  });

  if (existing) {
    return prisma.dailyLog.update({
      where: { id: existing.id },
      data: { aiDraft: draft },
    });
  }

  return prisma.dailyLog.create({
    data: {
      weeklyReportId: report.id,
      date,
      dayNumber: dayNumber(date),
      startTime: "",
      endTime: "",
      location: "",
      aiDraft: draft,
    },
  });
}

export async function saveFinalDescriptionForUser(
  userId: string,
  reportId: string,
  date: Date,
  description: string
) {
  const report = await resolveOwnedReport(userId, reportId);
  if (date < report.startDate || date > report.endDate) {
    throw new ReportDateRangeError();
  }

  const existing = await prisma.dailyLog.findFirst({
    where: { weeklyReportId: report.id, date },
    select: { id: true },
  });

  if (existing) {
    return prisma.dailyLog.update({
      where: { id: existing.id },
      data: { finalDescription: description },
    });
  }

  return prisma.dailyLog.create({
    data: {
      weeklyReportId: report.id,
      date,
      dayNumber: dayNumber(date),
      startTime: "",
      endTime: "",
      location: "",
      finalDescription: description,
    },
  });
}

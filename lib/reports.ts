import { prisma } from "@/lib/prisma";
import { dayNumber } from "@/lib/dates";

export class ReportNotFoundError extends Error {
  constructor() {
    super("report-not-found");
    this.name = "ReportNotFoundError";
  }
}

export class ReportDateRangeError extends Error {
  constructor() {
    super("date-out-of-range");
    this.name = "ReportDateRangeError";
  }
}

export type ReportData = {
  weekNumber: number;
  startDate: Date;
  endDate: Date;
};

const dailyLogInclude = {
  manualActivities: { orderBy: { order: "asc" as const } },
  logbookCommits: {
    orderBy: { commit: { committedAt: "desc" as const } },
    include: {
      commit: {
        include: { repository: { select: { fullName: true } } },
      },
    },
  },
  documentationPhotos: {
    orderBy: [{ order: "asc" as const }, { createdAt: "asc" as const }],
  },
};

export async function listReportsForUser(userId: string) {
  return prisma.weeklyReport.findMany({
    where: { userId },
    orderBy: [{ createdAt: "desc" }],
    select: {
      id: true,
      weekNumber: true,
      startDate: true,
      endDate: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { dailyLogs: true } },
    },
  });
}

export async function getReportForUser(userId: string, reportId: string) {
  const report = await prisma.weeklyReport.findFirst({
    where: { id: reportId, userId },
    include: {
      dailyLogs: {
        orderBy: [{ date: "asc" }],
        include: dailyLogInclude,
      },
      documentationPhotos: {
        orderBy: [{ order: "asc" as const }, { createdAt: "asc" as const }],
      },
    },
  });
  return report;
}

export async function createReportForUser(userId: string, data: ReportData) {
  return prisma.weeklyReport.create({
    data: {
      userId,
      weekNumber: data.weekNumber,
      startDate: data.startDate,
      endDate: data.endDate,
    },
  });
}

export async function updateReportForUser(
  userId: string,
  reportId: string,
  data: ReportData & { status: "DRAFT" | "COMPLETED" }
) {
  const owned = await prisma.weeklyReport.findFirst({
    where: { id: reportId, userId },
    select: { id: true },
  });
  if (!owned) {
    throw new ReportNotFoundError();
  }
  return prisma.weeklyReport.update({
    where: { id: reportId },
    data: {
      weekNumber: data.weekNumber,
      startDate: data.startDate,
      endDate: data.endDate,
      status: data.status,
    },
  });
}

export async function deleteReportForUser(userId: string, reportId: string) {
  const result = await prisma.weeklyReport.deleteMany({
    where: { id: reportId, userId },
  });
  if (result.count === 0) {
    throw new ReportNotFoundError();
  }
  return result;
}

async function resolveOwnedReport(userId: string, reportId: string) {
  const report = await prisma.weeklyReport.findFirst({
    where: { id: reportId, userId },
    select: { id: true, startDate: true, endDate: true },
  });
  if (!report) {
    throw new ReportNotFoundError();
  }
  return report;
}

export type SaveDayFieldsData = {
  date: Date;
  startTime: string;
  endTime: string;
  location: string;
};

export async function saveDayFieldsForUser(
  userId: string,
  reportId: string,
  data: SaveDayFieldsData
) {
  const report = await resolveOwnedReport(userId, reportId);
  if (data.date < report.startDate || data.date > report.endDate) {
    throw new ReportDateRangeError();
  }

  const number = dayNumber(data.date);
  const existing = await prisma.dailyLog.findFirst({
    where: { weeklyReportId: report.id, date: data.date },
    select: { id: true },
  });

  if (existing) {
    return prisma.dailyLog.update({
      where: { id: existing.id },
      data: {
        dayNumber: number,
        startTime: data.startTime,
        endTime: data.endTime,
        location: data.location,
      },
    });
  }

  return prisma.dailyLog.create({
    data: {
      weeklyReportId: report.id,
      date: data.date,
      dayNumber: number,
      startTime: data.startTime,
      endTime: data.endTime,
      location: data.location,
    },
  });
}

export async function addActivityForUser(
  userId: string,
  reportId: string,
  date: Date,
  description: string
) {
  const report = await resolveOwnedReport(userId, reportId);
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

  const activityCount = await prisma.manualActivity.count({
    where: { dailyLogId: dailyLog.id },
  });

  return prisma.manualActivity.create({
    data: {
      dailyLogId: dailyLog.id,
      description,
      order: activityCount,
    },
  });
}

export async function updateActivityForUser(
  userId: string,
  dailyLogId: string,
  activityId: string,
  description: string
) {
  const activity = await resolveOwnedActivity(userId, dailyLogId, activityId);
  return prisma.manualActivity.update({
    where: { id: activity.id },
    data: { description },
  });
}

export async function deleteActivityForUser(
  userId: string,
  dailyLogId: string,
  activityId: string
) {
  const activity = await resolveOwnedActivity(userId, dailyLogId, activityId);
  await prisma.manualActivity.delete({ where: { id: activity.id } });
  await reorderActivities(activity.dailyLogId);
}

async function resolveOwnedActivity(
  userId: string,
  dailyLogId: string,
  activityId: string
) {
  const dailyLog = await prisma.dailyLog.findFirst({
    where: { id: dailyLogId, weeklyReport: { userId } },
    select: { id: true },
  });
  if (!dailyLog) {
    throw new ReportNotFoundError();
  }
  const activity = await prisma.manualActivity.findFirst({
    where: { id: activityId, dailyLogId: dailyLog.id },
  });
  if (!activity) {
    throw new ReportNotFoundError();
  }
  return activity;
}

async function reorderActivities(dailyLogId: string) {
  const activities = await prisma.manualActivity.findMany({
    where: { dailyLogId },
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    select: { id: true },
  });
  await prisma.$transaction(
    activities.map((activity, index) =>
      prisma.manualActivity.update({
        where: { id: activity.id },
        data: { order: index },
      })
    )
  );
}

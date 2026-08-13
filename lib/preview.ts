import { prisma } from "@/lib/prisma";
import { dailyLogInclude } from "@/lib/reports";

export type PreviewUser = {
  name: string;
  nim: string;
  scheme: string;
  partner: string;
};

export type PreviewCommit = {
  sha: string;
  message: string;
  url: string;
  repositoryFullName: string;
  committedAt: Date;
};

export type PreviewActivity = {
  id: string;
  order: number;
  description: string;
};

export type PreviewDay = {
  id: string;
  date: Date;
  startTime: string;
  endTime: string;
  location: string;
  finalDescription: string | null;
  activities: PreviewActivity[];
  commits: PreviewCommit[];
};

export type PreviewPhoto = {
  id: string;
  url: string;
  caption: string;
  order: number;
};

export type ReportPreview = {
  id: string;
  weekNumber: number;
  startDate: Date;
  endDate: Date;
  status: "DRAFT" | "COMPLETED";
  nextWeekPlan: string | null;
  studentEvaluation: string | null;
  user: PreviewUser;
  days: PreviewDay[];
  photos: PreviewPhoto[];
};

export type PrismaReportPreview = {
  id: string;
  weekNumber: number;
  startDate: Date;
  endDate: Date;
  status: "DRAFT" | "COMPLETED";
  nextWeekPlan: string | null;
  studentEvaluation: string | null;
  user: {
    name: string;
    nim: string;
    scheme: string;
    partner: string;
  };
  dailyLogs: Array<{
    id: string;
    date: Date;
    startTime: string;
    endTime: string;
    location: string;
    finalDescription: string | null;
    manualActivities: Array<{
      id: string;
      order: number;
      description: string;
    }>;
    logbookCommits: Array<{
      commit: {
        sha: string;
        message: string;
        url: string;
        committedAt: Date;
        repository: { fullName: string };
      };
    }>;
  }>;
  documentationPhotos: Array<{
    id: string;
    url: string;
    caption: string;
    order: number;
  }>;
};

export async function getReportPreviewForUser(
  userId: string,
  reportId: string
): Promise<ReportPreview | null> {
  const report = await prisma.weeklyReport.findFirst({
    where: { id: reportId, userId },
    include: {
      user: {
        select: { name: true, nim: true, scheme: true, partner: true },
      },
      dailyLogs: {
        orderBy: [{ date: "asc" }],
        include: dailyLogInclude,
      },
      documentationPhotos: {
        orderBy: [{ order: "asc" }, { createdAt: "asc" }],
      },
    },
  });

  if (!report) {
    return null;
  }

  return mapReportPreview(report as PrismaReportPreview);
}

export function mapReportPreview(report: PrismaReportPreview): ReportPreview {
  return {
    id: report.id,
    weekNumber: report.weekNumber,
    startDate: report.startDate,
    endDate: report.endDate,
    status: report.status,
    nextWeekPlan: report.nextWeekPlan,
    studentEvaluation: report.studentEvaluation,
    user: {
      name: report.user.name,
      nim: report.user.nim,
      scheme: report.user.scheme,
      partner: report.user.partner,
    },
    days: report.dailyLogs.map((log) => ({
      id: log.id,
      date: log.date,
      startTime: log.startTime,
      endTime: log.endTime,
      location: log.location,
      finalDescription: log.finalDescription,
      activities: log.manualActivities.map((activity) => ({
        id: activity.id,
        order: activity.order,
        description: activity.description,
      })),
      commits: log.logbookCommits.map((entry) => ({
        sha: entry.commit.sha,
        message: entry.commit.message,
        url: entry.commit.url,
        repositoryFullName: entry.commit.repository.fullName,
        committedAt: entry.commit.committedAt,
      })),
    })),
    photos: report.documentationPhotos.map((photo) => ({
      id: photo.id,
      url: photo.url,
      caption: photo.caption,
      order: photo.order,
    })),
  };
}

export type CompletenessIssue = {
  key: string;
  label: string;
  present: boolean;
};

const ISSUE_DEFS: Array<{ key: string; label: string }> = [
  { key: "profile", label: "Profil lengkap (nama, NIM, skema, mitra)" },
  { key: "weekRange", label: "Minggu ke- dan rentang tanggal" },
  { key: "days", label: "Catatan harian (jam kerja)" },
  { key: "hours", label: "Jam kerja mulai & selesai" },
  { key: "activities", label: "Rincian kegiatan" },
  { key: "plan", label: "Rencana kegiatan minggu depan" },
  { key: "evaluation", label: "Penilaian mahasiswa" },
  { key: "photos", label: "Dokumentasi kegiatan" },
];

export function computeReportCompleteness(report: ReportPreview): {
  complete: boolean;
  issues: CompletenessIssue[];
} {
  const hasProfile = Boolean(
    report.user.name &&
      report.user.nim &&
      report.user.scheme &&
      report.user.partner
  );
  const hasWeekRange = Boolean(
    report.weekNumber &&
      report.startDate &&
      report.endDate &&
      report.endDate >= report.startDate
  );
  const hasDays = report.days.length > 0;
  const hasHours = report.days.some(
    (day) => day.startTime && day.endTime
  );
  const hasActivities = report.days.some(
    (day) =>
      day.finalDescription ||
      day.activities.length > 0 ||
      day.commits.length > 0
  );
  const hasPlan = Boolean(report.nextWeekPlan);
  const hasEvaluation = Boolean(report.studentEvaluation);
  const hasPhotos = report.photos.length > 0;

  const presence: Record<string, boolean> = {
    profile: hasProfile,
    weekRange: hasWeekRange,
    days: hasDays,
    hours: hasHours,
    activities: hasActivities,
    plan: hasPlan,
    evaluation: hasEvaluation,
    photos: hasPhotos,
  };

  const issues = ISSUE_DEFS.map((def) => ({
    key: def.key,
    label: def.label,
    present: presence[def.key],
  }));

  return {
    complete: issues.every((issue) => issue.present),
    issues,
  };
}
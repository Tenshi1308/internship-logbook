import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import ReportInfoForm from "@/components/report-info-form";
import DayFieldsForm from "@/components/day-fields-form";
import ActivityList from "@/components/activity-list";
import DeleteReportButton from "@/components/delete-report-button";
import CommitEvidence, { type AttachedCommit } from "@/components/commit-evidence";
import { requireUser } from "@/lib/session";
import { getReportForUser } from "@/lib/reports";
import { getConnectionForUser } from "@/lib/github-data";
import { daysBetween, formatDayShort, toDateOnly, weekdayOf } from "@/lib/dates";

export const metadata: Metadata = {
  title: "Detail Laporan | Internship Logbook",
};

function toAttachedCommit(
  logbookCommit: {
    commit: {
      id: string;
      sha: string;
      message: string;
      committedAt: Date;
      repository: { fullName: string };
    };
  }
): AttachedCommit {
  return {
    id: logbookCommit.commit.id,
    sha: logbookCommit.commit.sha,
    message: logbookCommit.commit.message,
    committedAt: logbookCommit.commit.committedAt.toISOString(),
    repositoryFullName: logbookCommit.commit.repository.fullName,
  };
}

export default async function ReportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;

  const report = await getReportForUser(user.id, id);
  if (!report) {
    notFound();
  }

  const connection = await getConnectionForUser(user.id);

  const logByDate = new Map(
    report.dailyLogs.map((log) => [toDateOnly(log.date), log])
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Minggu ke-{report.weekNumber}
            </h1>
            <StatusBadge status={report.status} />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {report.dailyLogs.length} hari dicatat
          </p>
        </div>
        <DeleteReportButton reportId={report.id} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informasi Laporan</CardTitle>
        </CardHeader>
        <CardContent>
          <ReportInfoForm report={report} />
        </CardContent>
      </Card>

      <div className="space-y-6">
        {daysBetween(report.startDate, report.endDate).map((day) => {
          const dateKey = toDateOnly(day);
          const log = logByDate.get(dateKey) ?? null;

          return (
            <Card key={dateKey} id={`day-${dateKey}`}>
              <CardHeader>
                <CardTitle className="capitalize">{weekdayOf(day)}</CardTitle>
                <CardDescription>{formatDayShort(day)}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <DayFieldsForm
                  reportId={report.id}
                  dateKey={dateKey}
                  dayLabel={weekdayOf(day)}
                  log={
                    log
                      ? {
                          startTime: log.startTime,
                          endTime: log.endTime,
                          location: log.location,
                        }
                      : null
                  }
                />
                <div className="border-t border-border pt-6">
                  <h3 className="mb-3 text-sm font-semibold text-foreground">
                    Kegiatan Harian
                  </h3>
                  <ActivityList
                    reportId={report.id}
                    dateKey={dateKey}
                    dailyLogId={log?.id ?? null}
                    activities={log?.manualActivities ?? []}
                  />
                </div>
                <div className="border-t border-border pt-6">
                  <CommitEvidence
                    reportId={report.id}
                    dateKey={dateKey}
                    dailyLogId={log?.id ?? null}
                    attached={log?.logbookCommits.map(toAttachedCommit) ?? []}
                    hasConnection={Boolean(connection)}
                  />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

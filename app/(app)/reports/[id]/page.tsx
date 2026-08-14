import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Eye } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import ReportInfoForm from "@/components/report-info-form";
import DayFieldsForm from "@/components/day-fields-form";
import ActivityList from "@/components/activity-list";
import DeleteReportButton from "@/components/delete-report-button";
import CommitEvidence, { type AttachedCommit } from "@/components/commit-evidence";
import AIDescription from "@/components/ai-description";
import DocumentationGallery, { type GalleryPhoto } from "@/components/documentation-gallery";
import PlanEvaluationForm from "@/components/plan-evaluation-form";
import DayJumpNav from "@/components/day-jump-nav";
import UnsavedChangesGuard from "@/components/unsaved-changes-guard";
import { requireUser } from "@/lib/session";
import { isAIConfigured } from "@/lib/ai";
import { isCloudinaryConfigured } from "@/lib/cloudinary";
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
  const aiEnabled = isAIConfigured();
  const photosConfigured = isCloudinaryConfigured();

  const reportPhotos: GalleryPhoto[] = report.documentationPhotos.map(
    (photo) => ({
      id: photo.id,
      url: photo.url,
      caption: photo.caption,
      order: photo.order,
    })
  );

  const logByDate = new Map(
    report.dailyLogs.map((log) => [toDateOnly(log.date), log])
  );

  return (
    <UnsavedChangesGuard>
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
        <div className="flex flex-wrap items-center gap-2 print:hidden">
          <Link
            href={`/reports/${report.id}/preview`}
            className="inline-flex h-9 items-center gap-2 rounded-md border border-input bg-background px-4 text-sm font-medium text-foreground transition-colors hover:bg-secondary hover:text-secondary-foreground"
          >
            <Eye className="h-4 w-4" aria-hidden="true" />
            Pratinjau Laporan
          </Link>
          <DeleteReportButton reportId={report.id} />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informasi Laporan</CardTitle>
        </CardHeader>
        <CardContent>
          <ReportInfoForm report={report} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Rencana &amp; Penilaian Laporan</CardTitle>
          <CardDescription>
            Isi bagian 3 (rencana kegiatan minggu depan) dan bagian 4 (penilaian
            mahasiswa) yang akan tampil pada pratinjau laporan mingguan.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PlanEvaluationForm report={report} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Dokumentasi Kegiatan</CardTitle>
          <CardDescription>
            Unggah foto kegiatan selama minggu ini, beri keterangan, atur urutan,
            atau hapus foto yang tidak diperlukan.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DocumentationGallery
            reportId={report.id}
            initialPhotos={reportPhotos}
            cloudinaryConfigured={photosConfigured}
          />
        </CardContent>
      </Card>

      <div className="space-y-6">
        <DayJumpNav
          days={daysBetween(report.startDate, report.endDate).map((day) => ({
            key: toDateOnly(day),
            label: weekdayOf(day),
            short: weekdayOf(day).slice(0, 3),
          }))}
        />
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
                <div className="border-t border-border pt-6">
                  <AIDescription
                    reportId={report.id}
                    dateKey={dateKey}
                    initialDraft={log?.aiDraft ?? ""}
                    finalDescription={log?.finalDescription ?? null}
                    activityCount={log?.manualActivities.length ?? 0}
                    commitCount={log?.logbookCommits.length ?? 0}
                    aiEnabled={aiEnabled}
                  />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      </div>
    </UnsavedChangesGuard>
  );
}

import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ReportPreview } from "@/components/report-preview";
import { PreviewToolbar } from "@/components/preview-toolbar";
import { requireUser } from "@/lib/session";
import { getReportPreviewForUser } from "@/lib/preview";

export const metadata: Metadata = {
  title: "Pratinjau Laporan Mingguan | Internship Logbook",
};

export default async function ReportPreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;

  const preview = await getReportPreviewForUser(user.id, id);
  if (!preview) {
    notFound();
  }

  return (
    <div className="space-y-4 print:space-y-0">
      <PreviewToolbar
        reportHref={`/reports/${preview.id}`}
        status={preview.status}
      />
      <ReportPreview report={preview} showCompleteness />
    </div>
  );
}
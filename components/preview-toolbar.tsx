import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { PrintPreviewButton } from "@/components/print-preview-button";
import { StatusBadge } from "@/components/status-badge";

export function PreviewToolbar({
  reportHref,
  status,
}: {
  reportHref: string;
  status: "DRAFT" | "COMPLETED";
}) {
  return (
    <div className="preview-toolbar flex flex-wrap items-center justify-between gap-3 print:hidden">
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href={reportHref}
          className="inline-flex h-8 items-center gap-1.5 rounded-md border border-input bg-background px-3 text-sm font-medium text-foreground transition-colors hover:bg-secondary hover:text-secondary-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Kembali ke editor
        </Link>
        <StatusBadge status={status} />
      </div>
      <PrintPreviewButton />
    </div>
  );
}
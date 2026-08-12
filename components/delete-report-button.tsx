"use client";

import { useActionState } from "react";
import { Trash2 } from "lucide-react";

import { deleteReport, type ReportFormState } from "@/lib/actions/reports";
import { Button } from "@/components/ui/button";

export default function DeleteReportButton({ reportId }: { reportId: string }) {
  const [, formAction, pending] = useActionState<ReportFormState, FormData>(
    deleteReport,
    undefined
  );

  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        if (
          !window.confirm(
            "Hapus laporan mingguan ini? Tindakan tidak dapat dibatalkan."
          )
        ) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="reportId" value={reportId} />
      <Button
        type="submit"
        variant="destructive"
        size="sm"
        disabled={pending}
      >
        <Trash2 className="h-4 w-4" aria-hidden="true" />
        {pending ? "Menghapus..." : "Hapus"}
      </Button>
    </form>
  );
}

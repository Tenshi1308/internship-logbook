import Link from "next/link";

import { cn } from "@/lib/utils";

export default function ReportNotFound() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Laporan tidak ditemukan
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Laporan yang Anda cari tidak ada atau tidak lagi dapat diakses.
        </p>
      </div>
      <Link
        href="/reports"
        className={cn(
          "inline-flex h-9 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        )}
      >
        Kembali ke Laporan
      </Link>
    </div>
  );
}

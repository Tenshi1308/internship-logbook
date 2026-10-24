"use client";

import { useState } from "react";
import { Download } from "lucide-react";

// Tombol unduh DOCX dengan saklar bukti commit: tanpa centang, seksi
// "Bukti GitHub" tidak ikut ke dokumen, tanpa perlu disconnect GitHub.
// Pakai <a> biasa (bukan router) supaya respons file dari API route
// benar-benar terunduh oleh browser.
export function ExportDocxButton({ reportId }: { reportId: string }) {
  const [includeCommits, setIncludeCommits] = useState(true);

  const href = `/api/reports/${reportId}/export?includeCommits=${includeCommits}`;

  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <label className="inline-flex cursor-pointer items-center gap-1.5 text-sm text-foreground">
        <input
          type="checkbox"
          checked={includeCommits}
          onChange={(event) => setIncludeCommits(event.target.checked)}
          className="h-4 w-4 accent-primary"
        />
        Sertakan bukti GitHub
      </label>
      <a
        href={href}
        download
        className="inline-flex h-8 items-center justify-center gap-1.5 whitespace-nowrap rounded-md border border-input bg-background px-3 text-sm font-medium text-foreground transition-colors hover:bg-secondary hover:text-secondary-foreground"
      >
        <Download className="h-4 w-4" aria-hidden="true" />
        Unduh DOCX
      </a>
    </span>
  );
}

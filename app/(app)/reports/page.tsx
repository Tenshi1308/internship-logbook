import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import CreateReportForm from "@/components/create-report-form";
import { requireUser } from "@/lib/session";
import { listReportsForUser } from "@/lib/reports";
import { formatRange } from "@/lib/dates";

export const metadata: Metadata = {
  title: "Laporan Mingguan | Internship Logbook",
};

export default async function ReportsPage() {
  const user = await requireUser();
  const reports = await listReportsForUser(user.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Laporan Mingguan
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Kelola laporan mingguan dan catat kegiatan harian magang Anda.
        </p>
      </div>

      {reports.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Belum ada laporan</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Buat laporan mingguan pertama Anda untuk mulai mencatat kegiatan
              harian.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {reports.map((report) => (
            <Link key={report.id} href={`/reports/${report.id}`} className="block">
              <Card className="transition-colors hover:border-ring">
                <CardContent className="flex items-center gap-4 pt-6">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-base font-semibold text-foreground">
                        Minggu ke-{report.weekNumber}
                      </h2>
                      <StatusBadge status={report.status} />
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {formatRange(report.startDate, report.endDate)}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {report._count.dailyLogs} hari dicatat
                    </p>
                  </div>
                  <ArrowRight
                    className="h-5 w-5 shrink-0 text-muted-foreground"
                    aria-hidden="true"
                  />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <CreateReportForm />
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { listReportsForUser } from "@/lib/reports";
import { formatRange } from "@/lib/dates";

export const metadata: Metadata = {
  title: "Dashboard | Internship Logbook",
};

export default async function DashboardPage() {
  const sessionUser = await requireUser();

  const profile = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: { name: true, nim: true, scheme: true, partner: true },
  });

  const recentReports = (await listReportsForUser(sessionUser.id)).slice(0, 5);

  if (!profile) {
    return (
      <p className="text-sm text-destructive">
        Data profil tidak ditemukan. Silakan logout dan coba lagi.
      </p>
    );
  }

  const fields = [
    { label: "NIM", value: profile.nim },
    { label: "Skema", value: profile.scheme },
    { label: "Mitra", value: profile.partner },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Selamat datang, {profile.name}!
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Kelola laporan mingguan magang Anda dari sini.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Profil Magang</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            {fields.map((field) => (
              <div key={field.label}>
                <dt className="text-sm font-medium text-muted-foreground">
                  {field.label}
                </dt>
                <dd className="mt-1 text-base font-medium text-foreground">
                  {field.value}
                </dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle>Laporan Terbaru</CardTitle>
          <Link
            href="/reports"
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-input bg-background px-3 text-sm font-medium text-foreground transition-colors hover:bg-secondary hover:text-secondary-foreground"
          >
            Semua
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </CardHeader>
        <CardContent>
          {recentReports.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Belum ada laporan mingguan. Buat laporan pertama Anda di halaman
              Laporan.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {recentReports.map((report) => (
                <li key={report.id}>
                  <Link
                    href={`/reports/${report.id}`}
                    className="flex items-center justify-between gap-4 py-3 transition-colors hover:text-foreground"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-foreground">
                          Minggu ke-{report.weekNumber}
                        </span>
                        <StatusBadge status={report.status} />
                      </div>
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        {formatRange(report.startDate, report.endDate)}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {report._count.dailyLogs} hari dicatat
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
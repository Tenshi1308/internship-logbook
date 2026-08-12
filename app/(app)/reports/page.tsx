import type { Metadata } from "next";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = {
  title: "Reports | Internship Logbook",
};

export default async function ReportsPage() {
  await requireUser();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Reports
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Laporan mingguan magang Anda.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Laporan Mingguan</CardTitle>
          <CardDescription>Belum tersedia</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Fitur laporan mingguan akan tersedia pada fase berikutnya.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
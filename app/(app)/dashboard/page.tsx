import type { Metadata } from "next";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = {
  title: "Dashboard | Internship Logbook",
};

export default async function DashboardPage() {
  const sessionUser = await requireUser();

  const profile = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: { name: true, nim: true, scheme: true, partner: true },
  });

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
    </div>
  );
}
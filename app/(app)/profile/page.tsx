import type { Metadata } from "next";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = {
  title: "Profil | Internship Logbook",
};

export default async function ProfilePage() {
  const sessionUser = await requireUser();

  const profile = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: { name: true, nim: true, email: true, scheme: true, partner: true },
  });

  if (!profile) {
    return (
      <p className="text-sm text-destructive">
        Data profil tidak ditemukan. Silakan logout dan coba lagi.
      </p>
    );
  }

  const fields = [
    { label: "Nama", value: profile.name },
    { label: "NIM", value: profile.nim },
    { label: "Email", value: profile.email },
    { label: "Skema", value: profile.scheme },
    { label: "Mitra", value: profile.partner },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Profil Saya
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Informasi akun dan data magang Anda.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Informasi Profil</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="divide-y divide-border">
            {fields.map((field) => (
              <div
                key={field.label}
                className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <dt className="text-sm font-medium text-muted-foreground">
                  {field.label}
                </dt>
                <dd className="text-base font-medium text-foreground">
                  {field.value}
                </dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>
      <p className="text-sm text-muted-foreground">
        Pengeditan profil akan tersedia pada fase berikutnya.
      </p>
    </div>
  );
}
import type { Metadata } from "next";

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
      <p className="text-sm text-red-600">
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
      <h1 className="text-2xl font-semibold text-slate-900">Profil Saya</h1>
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <dl className="divide-y divide-slate-100">
          {fields.map((field) => (
            <div
              key={field.label}
              className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <dt className="text-sm font-medium text-slate-500">
                {field.label}
              </dt>
              <dd className="text-base text-slate-900">{field.value}</dd>
            </div>
          ))}
        </dl>
      </div>
      <p className="text-sm text-slate-500">
        Pengeditan profil akan tersedia pada fase berikutnya.
      </p>
    </div>
  );
}

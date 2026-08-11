import type { Metadata } from "next";

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
      <p className="text-sm text-red-600">
        Data profil tidak ditemukan. Silakan logout dan coba lagi.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900">
        Selamat datang, {profile.name}!
      </h1>
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <dt className="text-sm font-medium text-slate-500">NIM</dt>
            <dd className="mt-1 text-base text-slate-900">{profile.nim}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-slate-500">Skema</dt>
            <dd className="mt-1 text-base text-slate-900">{profile.scheme}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-slate-500">Mitra</dt>
            <dd className="mt-1 text-base text-slate-900">{profile.partner}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}

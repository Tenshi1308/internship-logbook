import type { Metadata } from "next";
import Link from "next/link";

import RegisterForm from "@/components/register-form";

export const metadata: Metadata = {
  title: "Daftar | Internship Logbook",
};

export default function RegisterPage() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
      <h1 className="text-xl font-semibold text-slate-900">Buat Akun</h1>
      <p className="mt-1 mb-6 text-sm text-slate-500">
        Isi profil untuk memulai logbook magang Anda.
      </p>
      <RegisterForm />
      <p className="mt-6 text-center text-sm text-slate-500">
        Sudah punya akun?{" "}
        <Link href="/login" className="font-medium text-slate-900 underline">
          Login
        </Link>
      </p>
    </div>
  );
}

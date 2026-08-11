import type { Metadata } from "next";
import Link from "next/link";

import LoginForm from "@/components/login-form";

export const metadata: Metadata = {
  title: "Login | Internship Logbook",
};

export default function LoginPage() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
      <h1 className="text-xl font-semibold text-slate-900">Masuk</h1>
      <p className="mt-1 mb-6 text-sm text-slate-500">
        Masuk untuk melanjutkan ke logbook Anda.
      </p>
      <LoginForm />
      <p className="mt-6 text-center text-sm text-slate-500">
        Belum punya akun?{" "}
        <Link href="/register" className="font-medium text-slate-900 underline">
          Daftar
        </Link>
      </p>
    </div>
  );
}

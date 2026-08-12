import type { Metadata } from "next";
import Link from "next/link";

import { Card, CardContent } from "@/components/ui/card";
import RegisterForm from "@/components/register-form";

export const metadata: Metadata = {
  title: "Daftar | Internship Logbook",
};

export default function RegisterPage() {
  return (
    <Card>
      <CardContent className="pt-6">
        <h1 className="text-xl font-semibold text-foreground">Buat Akun</h1>
        <p className="mt-1 mb-6 text-sm text-muted-foreground">
          Isi profil untuk memulai logbook magang Anda.
        </p>
        <RegisterForm />
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Sudah punya akun?{" "}
          <Link
            href="/login"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Login
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}

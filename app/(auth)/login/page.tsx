import type { Metadata } from "next";
import Link from "next/link";

import { Card, CardContent } from "@/components/ui/card";
import LoginForm from "@/components/login-form";

export const metadata: Metadata = {
  title: "Login | Internship Logbook",
};

export default function LoginPage() {
  return (
    <Card>
      <CardContent className="pt-6">
        <h1 className="text-xl font-semibold text-foreground">Masuk</h1>
        <p className="mt-1 mb-6 text-sm text-muted-foreground">
          Masuk untuk melanjutkan ke logbook Anda.
        </p>
        <LoginForm />
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Belum punya akun?{" "}
          <Link
            href="/register"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Daftar
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}

import type { Metadata } from "next";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { GitHubRepoManager } from "@/components/github-repo-manager";
import DisconnectGitHubButton from "@/components/disconnect-github-button";
import { getConnectionForUser } from "@/lib/github-data";
import { isGitHubConfigured } from "@/lib/github";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = {
  title: "GitHub | Internship Logbook",
};

export default async function GitHubPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; connected?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;

  const configured = isGitHubConfigured();
  const connection = await getConnectionForUser(user.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Integrasi GitHub
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Hubungkan akun GitHub untuk melampirkan commit sebagai bukti kegiatan
          harian. Fitur ini opsional — Anda tetap dapat mengerjakan logbook
          tanpa GitHub.
        </p>
      </div>

      {params.connected === "1" && connection ? (
        <p
          role="status"
          className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700"
        >
          Berhasil terhubung ke GitHub sebagai {connection.githubUsername}.
        </p>
      ) : null}
      {params.error === "oauth_failed" ? (
        <p
          role="alert"
          className="rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          Gagal menghubungkan GitHub. Silakan coba lagi.
        </p>
      ) : null}
      {params.error === "not_configured" || !configured ? (
        <p
          role="alert"
          className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700"
        >
          Integrasi GitHub belum dikonfigurasi (atur GITHUB_CLIENT_ID dan
          GITHUB_CLIENT_SECRET). Anda tetap bisa menggunakan logbook secara
          manual.
        </p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Koneksi GitHub</CardTitle>
          <CardDescription>
            {connection
              ? `Terhubung sebagai @${connection.githubUsername}`
              : "Belum terhubung"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {connection ? (
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full border border-border bg-secondary px-3 py-1 text-sm font-medium text-foreground">
                @{connection.githubUsername}
              </span>
              <DisconnectGitHubButton />
            </div>
          ) : configured ? (
            <a
              href="/api/github/connect"
              className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:border-ring"
            >
              Hubungkan GitHub
            </a>
          ) : (
            <p className="text-sm text-muted-foreground">
              GitHub belum dikonfigurasi oleh administrator.
            </p>
          )}
        </CardContent>
      </Card>

      {connection ? <GitHubRepoManager /> : null}
    </div>
  );
}
import { NextResponse } from "next/server";

import { decryptSecret } from "@/lib/encrypt";
import { fetchRepositories, GitHubError } from "@/lib/github";
import {
  getConnectionForUser,
  listRepositoriesForUser,
  syncRepositoriesForUser,
} from "@/lib/github-data";
import { requireUser } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await requireUser();

  const connection = await getConnectionForUser(user.id);
  if (!connection) {
    return NextResponse.json({ error: "github-not-connected" }, { status: 400 });
  }

  let token: string;
  try {
    token = await decryptSecret(connection.accessTokenEncrypted);
  } catch {
    return NextResponse.json({ error: "github-token-invalid" }, { status: 500 });
  }

  let repos;
  let warning: string | undefined;
  try {
    repos = await fetchRepositories(token);
    await syncRepositoriesForUser(user.id, repos);
  } catch (error) {
    if (error instanceof GitHubError && error.rateLimited) {
      warning = "github-rate-limited";
    } else {
      warning = error instanceof GitHubError ? "github-fetch-failed" : "github-unknown-error";
    }
    const cached = await listRepositoriesForUser(user.id);
    if (cached.length > 0) {
      return NextResponse.json({ repositories: cached, warning });
    }
    return NextResponse.json(
      {
        error: warning,
        message: "Gagal mengambil repository dari GitHub.",
      },
      { status: 502 }
    );
  }

  const saved = await listRepositoriesForUser(user.id);
  return NextResponse.json({ repositories: saved, warning });
}
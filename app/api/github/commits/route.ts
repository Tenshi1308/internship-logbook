import { NextResponse } from "next/server";

import { parseDateOnly } from "@/lib/dates";
import { decryptSecret } from "@/lib/encrypt";
import { fetchCommits, GitHubError } from "@/lib/github";
import {
  cacheCommitsForRepository,
  getConnectionForUser,
  getOwnedRepository,
  listCachedCommits,
} from "@/lib/github-data";
import { requireUser } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await requireUser();

  const url = new URL(request.url);
  const repositoryId = url.searchParams.get("repositoryId");
  const sinceRaw = url.searchParams.get("since");
  const untilRaw = url.searchParams.get("until");
  const page = Math.max(1, Number(url.searchParams.get("page") ?? "1"));
  const perPage = Math.min(100, Math.max(1, Number(url.searchParams.get("perPage") ?? "50")));

  if (!repositoryId) {
    return NextResponse.json({ error: "repositoryId-wajib" }, { status: 400 });
  }

  let repository;
  try {
    repository = await getOwnedRepository(user.id, repositoryId);
  } catch {
    return NextResponse.json({ error: "repository-not-found" }, { status: 404 });
  }

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

  const since = sinceRaw ? (parseDateOnly(sinceRaw) ?? undefined) : undefined;
  const until = untilRaw ? (parseDateOnly(untilRaw) ?? undefined) : undefined;

  let fetched = false;
  let warning: string | undefined;
  try {
    const commits = await fetchCommits(token, {
      owner: repository.owner,
      repo: repository.name,
      since: since ? since.toISOString() : undefined,
      until: until ? new Date(until.getTime() + 86_400_000).toISOString() : undefined,
      page,
      perPage,
    });
    await cacheCommitsForRepository(user.id, repositoryId, commits);
    fetched = true;
  } catch (error) {
    if (error instanceof GitHubError && error.rateLimited) {
      warning = "github-rate-limited";
    } else if (error instanceof GitHubError) {
      warning = "github-fetch-failed";
    } else {
      warning = "github-unknown-error";
    }
  }

  const cached = await listCachedCommits(
    user.id,
    repositoryId,
    since,
    until ? new Date(until.getTime() + 86_400_000) : undefined
  );

  if (cached.length === 0 && !fetched && warning) {
    return NextResponse.json(
      { error: warning, message: "Gagal mengambil commit dari GitHub." },
      { status: 502 }
    );
  }

  return NextResponse.json({
    commits: cached,
    fetched,
    warning,
    hasMore: fetched && cached.length === perPage,
  });
}
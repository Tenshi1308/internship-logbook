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
import { getCurrentUser } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_STRING_LENGTH = 64;

function noStoreJson(
  body: unknown,
  init?: { status?: number }
) {
  return NextResponse.json(body, {
    status: init?.status ?? 200,
    headers: { "Cache-Control": "private, no-store" },
  });
}

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user?.id) {
    return noStoreJson({ error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const repositoryId = url.searchParams.get("repositoryId");
  const sinceRaw = url.searchParams.get("since");
  const untilRaw = url.searchParams.get("until");

  const pageValue = Number(url.searchParams.get("page") ?? "1");
  const perPageValue = Number(url.searchParams.get("perPage") ?? "50");
  const page = Number.isFinite(pageValue) ? Math.max(1, Math.trunc(pageValue)) : 1;
  const perPage = Number.isFinite(perPageValue)
    ? Math.min(100, Math.max(1, Math.trunc(perPageValue)))
    : 50;

  if (!repositoryId || repositoryId.length > MAX_STRING_LENGTH) {
    return noStoreJson({ error: "repositoryId-wajib" }, { status: 400 });
  }
  if ((sinceRaw && sinceRaw.length > 10) || (untilRaw && untilRaw.length > 10)) {
    return noStoreJson({ error: "tanggal-tidak-valid" }, { status: 400 });
  }

  let repository;
  try {
    repository = await getOwnedRepository(user.id, repositoryId);
  } catch {
    return noStoreJson({ error: "repository-not-found" }, { status: 404 });
  }

  const connection = await getConnectionForUser(user.id);
  if (!connection) {
    return noStoreJson({ error: "github-not-connected" }, { status: 400 });
  }

  let token: string;
  try {
    token = await decryptSecret(connection.accessTokenEncrypted);
  } catch {
    return noStoreJson({ error: "github-token-invalid" }, { status: 500 });
  }

  const since = sinceRaw ? (parseDateOnly(sinceRaw) ?? undefined) : undefined;
  const until = untilRaw ? (parseDateOnly(untilRaw) ?? undefined) : undefined;

  let fetched = false;
  let warning: string | undefined;
  let saved: Awaited<ReturnType<typeof cacheCommitsForRepository>> | undefined;
  try {
    const commits = await fetchCommits(token, {
      owner: repository.owner,
      repo: repository.name,
      since: since ? since.toISOString() : undefined,
      until: until ? new Date(until.getTime() + 86_400_000).toISOString() : undefined,
      page,
      perPage,
    });
    try {
      saved = await cacheCommitsForRepository(user.id, repositoryId, commits);
      fetched = true;
    } catch (cacheError) {
      console.error(
        "[commits] Failed to cache commits for repository",
        {
          userId: user.id,
          repositoryOwner: repository.owner,
          repositoryName: repository.name,
          repositoryId,
          since: since ? since.toISOString() : undefined,
          until: until ? new Date(until.getTime() + 86_400_000).toISOString() : undefined,
        },
        cacheError instanceof Error ? cacheError.stack : cacheError
      );
      warning = "github-cache-failed";
    }
  } catch (error) {
    if (error instanceof GitHubError && error.rateLimited) {
      console.error(
        "[commits] GitHub rate limited while fetching commits",
        {
          status: error.status,
          rateLimited: error.rateLimited,
          message: error.message,
          repositoryOwner: repository.owner,
          repositoryName: repository.name,
          repositoryId,
          since: since ? since.toISOString() : undefined,
          until: until ? new Date(until.getTime() + 86_400_000).toISOString() : undefined,
        }
      );
      warning = "github-rate-limited";
    } else if (error instanceof GitHubError) {
      console.error(
        "[commits] GitHub fetch failed",
        {
          status: error.status,
          rateLimited: error.rateLimited,
          message: error.message,
          repositoryOwner: repository.owner,
          repositoryName: repository.name,
          repositoryId,
          since: since ? since.toISOString() : undefined,
          until: until ? new Date(until.getTime() + 86_400_000).toISOString() : undefined,
        }
      );
      warning = "github-fetch-failed";
    } else {
      console.error(
        "[commits] Unknown error while fetching commits",
        {
          repositoryOwner: repository.owner,
          repositoryName: repository.name,
          repositoryId,
          since: since ? since.toISOString() : undefined,
          until: until ? new Date(until.getTime() + 86_400_000).toISOString() : undefined,
        },
        error instanceof Error ? error.stack : error
      );
      warning = "github-unknown-error";
    }
  }

  if (fetched && saved) {
    return noStoreJson({
      commits: saved,
      fetched: true,
      hasMore: saved.length === perPage,
    });
  }

  const cached = await listCachedCommits(
    user.id,
    repositoryId,
    since,
    until ? new Date(until.getTime() + 86_400_000) : undefined
  );

  if (cached.length === 0 && warning) {
    return noStoreJson(
      { error: warning, message: "Gagal mengambil commit dari GitHub." },
      { status: 502 }
    );
  }

  return noStoreJson({
    commits: cached,
    fetched: false,
    warning,
    hasMore: false,
  });
}
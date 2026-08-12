import { NextResponse } from "next/server";

import { encryptSecret } from "@/lib/encrypt";
import {
  exchangeCodeForToken,
  fetchGitHubUser,
  isGitHubConfigured,
} from "@/lib/github";
import { saveConnectionForUser } from "@/lib/github-data";
import { requireUser } from "@/lib/session";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const user = await requireUser();

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const initialState = request.headers
    .get("cookie")
    ?.match(/(?:^|;\s*)github_oauth_state=([^;]+)/)?.[1];

  const fail = () =>
    NextResponse.redirect(new URL("/github?error=oauth_failed", request.url));

  if (!isGitHubConfigured()) {
    return NextResponse.redirect(new URL("/github?error=not_configured", request.url));
  }
  if (!code || !state || !initialState || state !== initialState) {
    return fail();
  }

  const origin = url.origin;
  const redirectUri = `${origin}/api/github/callback`;

  let token: string;
  try {
    token = await exchangeCodeForToken(code, redirectUri);
  } catch {
    return fail();
  }

  let ghUser;
  try {
    ghUser = await fetchGitHubUser(token);
  } catch {
    return fail();
  }

  const accessTokenEncrypted = await encryptSecret(token);
  await saveConnectionForUser(user.id, {
    githubUserId: String(ghUser.id),
    githubUsername: ghUser.login,
    accessTokenEncrypted,
  });

  const response = NextResponse.redirect(new URL("/github?connected=1", request.url));
  response.cookies.delete("github_oauth_state");
  return response;
}
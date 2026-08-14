import { NextRequest, NextResponse } from "next/server";

import { encryptSecret } from "@/lib/encrypt";
import {
  exchangeCodeForToken,
  fetchGitHubUser,
  isGitHubConfigured,
} from "@/lib/github";
import {
  findConnectionByGithubUserId,
  saveConnectionForUser,
} from "@/lib/github-data";
import { requireUser } from "@/lib/session";

export const runtime = "nodejs";

function clearStateCookie(response: NextResponse) {
  response.cookies.set("github_oauth_state", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export async function GET(request: NextRequest) {
  const user = await requireUser();

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const initialState = request.cookies.get("github_oauth_state")?.value;

  const fail = () => {
    const response = NextResponse.redirect(
      new URL("/github?error=oauth_failed", request.url)
    );
    clearStateCookie(response);
    return response;
  };

  if (!isGitHubConfigured()) {
    const response = NextResponse.redirect(
      new URL("/github?error=not_configured", request.url)
    );
    clearStateCookie(response);
    return response;
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

  const existingBinding = await findConnectionByGithubUserId(ghUser.id);
  if (existingBinding && existingBinding.userId !== user.id) {
    const response = NextResponse.redirect(
      new URL("/github?error=oauth_account_in_use", request.url)
    );
    clearStateCookie(response);
    return response;
  }

  const accessTokenEncrypted = await encryptSecret(token);
  await saveConnectionForUser(user.id, {
    githubUserId: String(ghUser.id),
    githubUsername: ghUser.login,
    accessTokenEncrypted,
  });

  const response = NextResponse.redirect(new URL("/github?connected=1", request.url));
  clearStateCookie(response);
  return response;
}
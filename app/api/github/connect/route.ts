import { randomBytes } from "crypto";

import { NextResponse } from "next/server";

import { buildAuthorizeUrl, isGitHubConfigured } from "@/lib/github";
import { requireUser } from "@/lib/session";

export const runtime = "nodejs";

export async function GET(request: Request) {
  await requireUser();

  if (!isGitHubConfigured()) {
    return NextResponse.redirect(new URL("/github?error=not_configured", request.url));
  }

  const state = randomBytes(16).toString("hex");
  const origin = new URL(request.url).origin;
  const redirectUri = `${origin}/api/github/callback`;

  const response = NextResponse.redirect(buildAuthorizeUrl(state, redirectUri));
  response.cookies.set("github_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  return response;
}
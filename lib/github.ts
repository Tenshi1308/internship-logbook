const GITHUB_API = "https://api.github.com";
const GITHUB_AUTHORIZE_URL = "https://github.com/login/oauth/authorize";
const GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token";

export class GitHubError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly rateLimited = false
  ) {
    super(message);
    this.name = "GitHubError";
  }
}

export function isGitHubConfigured() {
  return Boolean(
    process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET
  );
}

export function githubClientId(): string {
  const id = process.env.GITHUB_CLIENT_ID;
  if (!id) throw new GitHubError("GITHUB_CLIENT_ID is not set");
  return id;
}

export function githubClientSecret(): string {
  const secret = process.env.GITHUB_CLIENT_SECRET;
  if (!secret) throw new GitHubError("GITHUB_CLIENT_SECRET is not set");
  return secret;
}

export function buildAuthorizeUrl(state: string, redirectUri: string) {
  const params = new URLSearchParams({
    client_id: githubClientId(),
    redirect_uri: redirectUri,
    scope: "repo read:user",
    state,
  });
  return `${GITHUB_AUTHORIZE_URL}?${params.toString()}`;
}

export async function exchangeCodeForToken(code: string, redirectUri: string) {
  const res = await fetch(GITHUB_TOKEN_URL, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      client_id: githubClientId(),
      client_secret: githubClientSecret(),
      code,
      redirect_uri: redirectUri,
    }),
  });

  const data = (await res.json()) as {
    access_token?: string;
    error?: string;
    error_description?: string;
  };

  if (!res.ok || !data.access_token) {
    throw new GitHubError(
      data.error_description ?? data.error ?? "Token exchange failed",
      res.status
    );
  }

  return data.access_token;
}

export type GitHubUser = {
  id: number;
  login: string;
};

export async function fetchGitHubUser(token: string): Promise<GitHubUser> {
  const res = await fetch(`${GITHUB_API}/user`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
    },
  });

  if (!res.ok) {
    throw new GitHubError("Failed to fetch GitHub user", res.status);
  }

  const data = (await res.json()) as GitHubUser;
  return data;
}

export type GitHubRepository = {
  id: number;
  name: string;
  full_name: string;
  owner: { login: string };
  default_branch: string | null;
};

export async function fetchRepositories(
  token: string,
  page = 1
): Promise<GitHubRepository[]> {
  const res = await fetch(
    `${GITHUB_API}/user/repos?per_page=100&affiliation=owner,collaborator&page=${page}&sort=updated`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
      },
    }
  );

  if (!res.ok) {
    throw new GitHubError(
      "Failed to fetch repositories",
      res.status,
      isRateLimited(res)
    );
  }

  return (await res.json()) as GitHubRepository[];
}

export type GitHubCommit = {
  sha: string;
  commit: {
    message: string;
    author: { name: string; email: string; date: string } | null;
  };
  html_url: string;
};

export type FetchCommitsParams = {
  owner: string;
  repo: string;
  since?: string;
  until?: string;
  page?: number;
  perPage?: number;
};

export async function fetchCommits(
  token: string,
  params: FetchCommitsParams
): Promise<GitHubCommit[]> {
  const url = new URL(
    `${GITHUB_API}/repos/${params.owner}/${params.repo}/commits`
  );
  url.searchParams.set("per_page", String(params.perPage ?? 30));
  url.searchParams.set("page", String(params.page ?? 1));
  if (params.since) url.searchParams.set("since", params.since);
  if (params.until) url.searchParams.set("until", params.until);

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
    },
  });

  if (!res.ok) {
    throw new GitHubError(
      "Failed to fetch commits",
      res.status,
      isRateLimited(res)
    );
  }

  return (await res.json()) as GitHubCommit[];
}

function isRateLimited(res: Response): boolean {
  if (res.status === 403) {
    const remaining = res.headers.get("x-ratelimit-remaining");
    if (remaining === "0") return true;
  }
  if (res.status === 429) return true;
  return false;
}

"use client";

import { useEffect, useState } from "react";
import { GitBranch, Loader2, Plus, Unlink } from "lucide-react";

import {
  attachCommit,
  detachCommit,
  type GitHubFormState,
} from "@/lib/actions/github";
import { FormError, FormSuccess } from "@/components/form-message";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

type Repository = {
  id: string;
  fullName: string;
  isSelected: boolean;
};

export type AttachedCommit = {
  id: string;
  sha: string;
  message: string;
  committedAt: string;
  repositoryFullName: string;
};

type FetchedCommit = {
  id: string;
  sha: string;
  message: string;
  authorName: string;
  committedAt: string;
};

function shortSha(sha: string): string {
  return sha.slice(0, 7);
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(date);
}

function AttachedList({
  reportId,
  dateKey,
  commits,
}: {
  reportId: string;
  dateKey: string;
  commits: AttachedCommit[];
}) {
  const [state, setState] = useState<GitHubFormState>(undefined);
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function handleDetach(commitId: string) {
    setPendingId(commitId);
    const formData = new FormData();
    formData.set("reportId", reportId);
    formData.set("date", dateKey);
    formData.set("commitId", commitId);
    const result = await detachCommit(undefined, formData);
    setPendingId(null);
    setState(result);
  }

  return (
    <div>
      <FormError message={state?.error} />
      <h4 className="mb-2 mt-3 text-sm font-semibold text-foreground">
        Commit terpasang
      </h4>
      <ul className="space-y-2">
        {commits.map((commit) => (
          <li
            key={commit.id}
            className="flex items-start justify-between gap-3 rounded-md border border-border bg-card p-3"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">
                <span className="font-mono text-muted-foreground">
                  {shortSha(commit.sha)}
                </span>{" "}
                {commit.message}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {commit.repositoryFullName} · {formatDateTime(commit.committedAt)}
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={pendingId === commit.id}
              onClick={() => handleDetach(commit.id)}
              className="text-muted-foreground hover:text-destructive"
              aria-label="Lepas commit"
            >
              {pendingId === commit.id ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Unlink className="h-4 w-4" aria-hidden="true" />
              )}
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function CommitPicker({ reportId, dateKey }: { reportId: string; dateKey: string }) {
  const [repos, setRepos] = useState<Repository[]>([]);
  const [reposLoaded, setReposLoaded] = useState(false);
  const [repoId, setRepoId] = useState("");
  const [since, setSince] = useState(dateKey);
  const [until, setUntil] = useState(dateKey);
  const [commits, setCommits] = useState<FetchedCommit[]>([]);
  const [fetching, setFetching] = useState(false);
  const [attachedIds, setAttachedIds] = useState<Set<string>>(new Set());
  const [state, setState] = useState<GitHubFormState>(undefined);
  const [attachingId, setAttachingId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/github/repos");
        if (!res.ok) {
          setState({ error: "Gagal memuat repository." });
          return;
        }
        const data = (await res.json()) as { repositories: Repository[] };
        const selected = data.repositories.filter((r) => r.isSelected);
        const opts = selected.length > 0 ? selected : data.repositories;
        setRepos(opts);
        if (opts.length > 0) setRepoId(opts[0].id);
      } catch {
        setState({ error: "Gagal memuat repository." });
      } finally {
        setReposLoaded(true);
      }
    }
    load();
  }, []);

  async function handleAttach(commitId: string) {
    setState(undefined);
    setAttachingId(commitId);
    const formData = new FormData();
    formData.set("reportId", reportId);
    formData.set("date", dateKey);
    formData.set("commitId", commitId);
    const result = await attachCommit(undefined, formData);
    setAttachingId(null);
    setState(result);
    if (result?.message) {
      setAttachedIds((prev) => new Set(prev).add(commitId));
    }
  }

  async function handleFetch() {
    if (!repoId) return;
    setFetching(true);
    setState(undefined);
    try {
      const params = new URLSearchParams({
        repositoryId: repoId,
        since,
        until,
        perPage: "50",
      });
      const res = await fetch(`/api/github/commits?${params.toString()}`);
      const data = (await res.json()) as {
        commits?: FetchedCommit[];
        error?: string;
        message?: string;
        warning?: string;
      };
      if (!res.ok || !data.commits) {
        setState({ error: data.message ?? data.error ?? "Gagal memuat commit." });
        return;
      }
      setCommits(data.commits);
      setAttachedIds(new Set());
      if (data.warning === "github-rate-limited") {
        setState({
          error:
            "GitHub rate limit tercapai, menampilkan commit dari data tersimpan.",
        });
      } else if (data.warning) {
        setState({
          error:
            "Gagal mengambil commit dari GitHub, menampilkan data tersimpan.",
        });
      }
    } catch {
      setState({ error: "Gagal memuat commit." });
    } finally {
      setFetching(false);
    }
  }

  return (
    <div className="space-y-3 rounded-md border border-border bg-secondary/40 p-3">
      <FormSuccess message={state?.message ?? ""} />
      <FormError message={state?.error} />
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor={`${dateKey}-repo`}>Repository</Label>
          <Select
            id={`${dateKey}-repo`}
            value={repoId}
            onChange={(event) => setRepoId(event.target.value)}
            disabled={!reposLoaded || repos.length === 0}
          >
            {repos.length === 0 ? (
              <option value="">Tidak ada repository</option>
            ) : (
              repos.map((repo) => (
                <option key={repo.id} value={repo.id}>
                  {repo.fullName}
                </option>
              ))
            )}
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${dateKey}-since`}>Dari tanggal</Label>
          <Input
            id={`${dateKey}-since`}
            type="date"
            value={since}
            onChange={(event) => setSince(event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${dateKey}-until`}>Sampai tanggal</Label>
          <Input
            id={`${dateKey}-until`}
            type="date"
            value={until}
            onChange={(event) => setUntil(event.target.value)}
          />
        </div>
      </div>
      <Button
        type="button"
        size="sm"
        onClick={handleFetch}
        disabled={fetching || !repoId}
      >
        {fetching ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <GitBranch className="h-4 w-4" aria-hidden="true" />
        )}
        {fetching ? "Memuat..." : "Muat Commit"}
      </Button>

      {commits.length > 0 ? (
        <ul className="space-y-2">
          {commits.map((commit) => {
            const attached = attachedIds.has(commit.id);
            return (
              <li
                key={commit.id}
                className="flex items-start justify-between gap-3 rounded-md border border-border bg-card p-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    <span className="font-mono text-muted-foreground">
                      {shortSha(commit.sha)}
                    </span>{" "}
                    {commit.message}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {commit.authorName} · {formatDateTime(commit.committedAt)}
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant={attached ? "primary" : "outline"}
                  disabled={attached || attachingId === commit.id}
                  onClick={() => handleAttach(commit.id)}
                  className="shrink-0"
                >
                  {attachingId === commit.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <Plus className="h-4 w-4" aria-hidden="true" />
                  )}
                  {attached ? "Terpasang" : attachingId === commit.id ? "Melampirkan..." : "Lampirkan"}
                </Button>
              </li>
            );
          })}
        </ul>
      ) : null}
      {!fetching && commits.length === 0 && reposLoaded && repoId ? (
        <p className="text-sm text-muted-foreground">
          Belum ada commit pada rentang tanggal terpilih.
        </p>
      ) : null}
    </div>
  );
}

export default function CommitEvidence({
  reportId,
  dateKey,
  dailyLogId,
  attached,
  hasConnection,
}: {
  reportId: string;
  dateKey: string;
  dailyLogId: string | null;
  attached: AttachedCommit[];
  hasConnection: boolean;
}) {
  const [picking, setPicking] = useState(false);

  if (!hasConnection) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Bukti Commit GitHub</CardTitle>
          <CardDescription>
            Fitur opsional. Hubungkan GitHub untuk melampirkan commit sebagai
            bukti kegiatan.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <a
            href="/github"
            className="inline-flex h-9 items-center gap-2 rounded-md border border-input bg-background px-4 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
          >
            <GitBranch className="h-4 w-4" aria-hidden="true" />
            Kelola GitHub
          </a>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bukti Commit GitHub</CardTitle>
        <CardDescription>
          Lampirkan commit dari repository terpilih sebagai bukti kegiatan.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {dailyLogId && attached.length > 0 ? (
          <AttachedList reportId={reportId} dateKey={dateKey} commits={attached} />
        ) : null}

        {picking ? (
          <CommitPicker reportId={reportId} dateKey={dateKey} />
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setPicking(true)}
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Tambah Commit
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
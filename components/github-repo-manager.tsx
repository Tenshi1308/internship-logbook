"use client";

import { useEffect, useState } from "react";
import { GitBranch, Loader2, RefreshCw } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/form-message";
import {
  selectRepository,
  type GitHubFormState,
} from "@/lib/actions/github";
import { cn } from "@/lib/utils";

type Repository = {
  id: string;
  fullName: string;
  isSelected: boolean;
};

function RepoToggle({
  repository,
}: {
  repository: Repository;
}) {
  const [state, setState] = useState<GitHubFormState>(undefined);
  const [pending, setPending] = useState(false);

  async function handleToggle(formData: FormData) {
    setPending(true);
    const result = await selectRepository(undefined, formData);
    setPending(false);
    setState(result);
  }

  return (
    <li className="rounded-md border border-border bg-card p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <GitBranch className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <span className="truncate text-sm font-medium text-foreground">
            {repository.fullName}
          </span>
        </div>
        <form action={handleToggle}>
          <input type="hidden" name="repositoryId" value={repository.id} />
          <input
            type="hidden"
            name="selected"
            value={repository.isSelected ? "false" : "true"}
          />
          <Button
            type="submit"
            size="sm"
            variant={repository.isSelected ? "primary" : "outline"}
            disabled={pending}
            className="shrink-0"
          >
            {pending ? "Memuat..." : repository.isSelected ? "Dipilih" : "Pilih"}
          </Button>
        </form>
      </div>
      {state?.error ? (
        <p role="alert" className="mt-2 text-xs text-destructive">
          {state.error}
        </p>
      ) : null}
    </li>
  );
}

export function GitHubRepoManager() {
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>(undefined);

  async function fetchRepositories() {
    const res = await fetch("/api/github/repos");
    const data = (await res.json().catch(() => null)) as {
      repositories?: Repository[];
      message?: string;
      warning?: string;
    } | null;
    if (!res.ok) {
      throw new Error(data?.message ?? "Gagal memuat repository.");
    }
    return { repositories: data?.repositories ?? [] };
  }

  useEffect(() => {
    let active = true;
    fetchRepositories()
      .then(({ repositories }) => {
        if (active) setRepositories(repositories);
      })
      .catch((err: Error) => {
        if (active) setError(err.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function refresh() {
    setLoading(true);
    setError(undefined);
    try {
      const { repositories } = await fetchRepositories();
      setRepositories(repositories);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat repository.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>Repository</CardTitle>
            <CardDescription>
              Pilih repository yang akan digunakan sebagai bukti commit.
            </CardDescription>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={refresh}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
            )}
            Sinkronkan
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <FormError message={error} />
        {loading ? (
          <p className="text-sm text-muted-foreground">Memuat repository...</p>
        ) : repositories.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Belum ada repository. Klik “Sinkronkan” untuk memuat repository dari
            GitHub.
          </p>
        ) : (
          <ul className={cn("space-y-2")}>
            {repositories.map((repository) => (
              <RepoToggle key={repository.id} repository={repository} />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
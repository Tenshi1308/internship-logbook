"use server";

import { revalidatePath } from "next/cache";

import { parseDateOnly } from "@/lib/dates";
import {
  attachCommitToDailyLog,
  deleteConnectionForUser,
  detachCommitFromDailyLog,
  GitHubNotConnectedError,
  GitHubOwnershipError,
  setRepositorySelected,
} from "@/lib/github-data";
import { ReportDateRangeError, ReportNotFoundError } from "@/lib/reports";
import { requireUser } from "@/lib/session";

export type GitHubFormState =
  | undefined
  | { message?: string; error?: string };

export async function disconnectGitHub(): Promise<void> {
  const user = await requireUser();

  try {
    await deleteConnectionForUser(user.id);
  } catch (error) {
    if (error instanceof GitHubNotConnectedError) {
      return;
    }
    throw error;
  } finally {
    revalidatePath("/github");
    revalidatePath("/reports");
  }
}

export async function selectRepository(
  _prevState: GitHubFormState,
  formData: FormData
): Promise<GitHubFormState> {
  const user = await requireUser();

  const repositoryId = String(formData.get("repositoryId") ?? "");
  const selected = formData.get("selected") === "true";

  try {
    await setRepositorySelected(user.id, repositoryId, selected);
  } catch (error) {
    if (error instanceof GitHubOwnershipError) {
      return { error: "Repository tidak ditemukan." };
    }
    return { error: "Gagal memperbarui repository. Silakan coba lagi." };
  }

  revalidatePath("/github");
  return { message: selected ? "Repository dipilih." : "Repository dibatalkan." };
}

export async function attachCommit(
  _prevState: GitHubFormState,
  formData: FormData
): Promise<GitHubFormState> {
  const user = await requireUser();

  const reportId = String(formData.get("reportId") ?? "");
  const dateValue = String(formData.get("date") ?? "");
  const commitId = String(formData.get("commitId") ?? "");

  const date = parseDateOnly(dateValue);
  if (!date) {
    return { error: "Tanggal tidak valid." };
  }

  try {
    await attachCommitToDailyLog(user.id, reportId, date, commitId);
  } catch (error) {
    if (error instanceof ReportNotFoundError) {
      return { error: "Laporan tidak ditemukan." };
    }
    if (error instanceof ReportDateRangeError) {
      return { error: "Tanggal kegiatan tidak berada dalam rentang laporan." };
    }
    if (error instanceof GitHubOwnershipError) {
      return { error: "Commit tidak ditemukan." };
    }
    return { error: "Gagal melampirkan commit. Silakan coba lagi." };
  }

  revalidatePath("/reports");
  revalidatePath(`/reports/${reportId}`);
  return { message: "Commit dilampirkan." };
}

export async function detachCommit(
  _prevState: GitHubFormState,
  formData: FormData
): Promise<GitHubFormState> {
  const user = await requireUser();

  const reportId = String(formData.get("reportId") ?? "");
  const dateValue = String(formData.get("date") ?? "");
  const commitId = String(formData.get("commitId") ?? "");

  const date = parseDateOnly(dateValue);
  if (!date) {
    return { error: "Tanggal tidak valid." };
  }

  try {
    await detachCommitFromDailyLog(user.id, reportId, date, commitId);
  } catch (error) {
    if (error instanceof ReportNotFoundError) {
      return { error: "Laporan tidak ditemukan." };
    }
    if (error instanceof GitHubOwnershipError) {
      return { error: "Lampiran commit tidak ditemukan." };
    }
    return { error: "Gagal melepas commit. Silakan coba lagi." };
  }

  revalidatePath("/reports");
  revalidatePath(`/reports/${reportId}`);
  return { message: "Commit dilepas." };
}
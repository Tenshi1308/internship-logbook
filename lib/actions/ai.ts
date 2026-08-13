"use server";

import { revalidatePath } from "next/cache";

import { saveFinalDescriptionForUser } from "@/lib/ai-data";
import { parseDateOnly } from "@/lib/dates";
import { ReportDateRangeError, ReportNotFoundError } from "@/lib/reports";
import { requireUser } from "@/lib/session";
import { aiDescriptionSchema } from "@/lib/validation";

export type AIDescriptionFormState =
  | undefined
  | { message?: string; error?: string };

export async function saveFinalDescription(
  _prevState: AIDescriptionFormState,
  formData: FormData
): Promise<AIDescriptionFormState> {
  const user = await requireUser();

  const reportId = String(formData.get("reportId") ?? "");
  const dateValue = String(formData.get("date") ?? "");
  const description = String(formData.get("aiDescription") ?? "");

  const parsed = aiDescriptionSchema.safeParse(description);
  if (!parsed.success) {
    return { error: "Deskripsi tidak boleh kosong (maksimal 4000 karakter)." };
  }

  const date = parseDateOnly(dateValue);
  if (!date) {
    return { error: "Tanggal tidak valid." };
  }

  try {
    await saveFinalDescriptionForUser(user.id, reportId, date, parsed.data);
  } catch (error) {
    if (error instanceof ReportNotFoundError) {
      return { error: "Laporan tidak ditemukan." };
    }
    if (error instanceof ReportDateRangeError) {
      return { error: "Tanggal kegiatan tidak berada dalam rentang laporan." };
    }
    return { error: "Gagal menyimpan deskripsi. Silakan coba lagi." };
  }

  revalidatePath("/reports");
  revalidatePath(`/reports/${reportId}`);
  return { message: "Deskripsi final disimpan." };
}

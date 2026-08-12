"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { parseDateOnly } from "@/lib/dates";
import { requireUser } from "@/lib/session";
import {
  addActivityForUser,
  createReportForUser,
  deleteActivityForUser,
  deleteReportForUser,
  ReportDateRangeError,
  ReportNotFoundError,
  saveDayFieldsForUser,
  updateActivityForUser,
  updateReportForUser,
} from "@/lib/reports";
import {
  activityDescriptionSchema,
  createReportSchema,
  reportInfoSchema,
  saveDaySchema,
} from "@/lib/validation";

export type ReportFormState =
  | undefined
  | {
      message?: string;
      error?: string;
      fieldErrors?: Record<string, string[] | undefined>;
    };

export async function createReport(
  _prevState: ReportFormState,
  formData: FormData
): Promise<ReportFormState> {
  const user = await requireUser();

  const parsed = createReportSchema.safeParse({
    weekNumber: formData.get("weekNumber"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const startDate = parseDateOnly(parsed.data.startDate);
  const endDate = parseDateOnly(parsed.data.endDate);
  if (!startDate || !endDate) {
    return { error: "Tanggal tidak valid." };
  }

  const report = await createReportForUser(user.id, {
    weekNumber: parsed.data.weekNumber,
    startDate,
    endDate,
  });

  redirect(`/reports/${report.id}`);
}

export async function updateReport(
  _prevState: ReportFormState,
  formData: FormData
): Promise<ReportFormState> {
  const user = await requireUser();
  const reportId = String(formData.get("reportId") ?? "");

  const parsed = reportInfoSchema.safeParse({
    weekNumber: formData.get("weekNumber"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
    status: formData.get("status"),
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const startDate = parseDateOnly(parsed.data.startDate);
  const endDate = parseDateOnly(parsed.data.endDate);
  if (!startDate || !endDate) {
    return { error: "Tanggal tidak valid." };
  }

  try {
    await updateReportForUser(user.id, reportId, {
      weekNumber: parsed.data.weekNumber,
      startDate,
      endDate,
      status: parsed.data.status,
    });
  } catch (error) {
    if (error instanceof ReportNotFoundError) {
      return { error: "Laporan tidak ditemukan." };
    }
    return { error: "Gagal menyimpan perubahan. Silakan coba lagi." };
  }

  revalidatePath("/reports");
  revalidatePath(`/reports/${reportId}`);
  return { message: "Perubahan disimpan." };
}

export async function saveDay(
  _prevState: ReportFormState,
  formData: FormData
): Promise<ReportFormState> {
  const user = await requireUser();

  const parsed = saveDaySchema.safeParse({
    reportId: formData.get("reportId"),
    date: formData.get("date"),
    startTime: formData.get("startTime"),
    endTime: formData.get("endTime"),
    location: formData.get("location"),
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const date = parseDateOnly(parsed.data.date);
  if (!date) {
    return { error: "Tanggal tidak valid." };
  }

  try {
    await saveDayFieldsForUser(user.id, parsed.data.reportId, {
      date,
      startTime: parsed.data.startTime,
      endTime: parsed.data.endTime,
      location: parsed.data.location,
    });
  } catch (error) {
    if (error instanceof ReportNotFoundError) {
      return { error: "Laporan tidak ditemukan." };
    }
    if (error instanceof ReportDateRangeError) {
      return { error: "Tanggal kegiatan tidak berada dalam rentang laporan." };
    }
    return { error: "Gagal menyimpan hari. Silakan coba lagi." };
  }

  revalidatePath("/reports");
  revalidatePath(`/reports/${parsed.data.reportId}`);
  return { message: "Hari disimpan." };
}

export async function addActivity(
  _prevState: ReportFormState,
  formData: FormData
): Promise<ReportFormState> {
  const user = await requireUser();

  const reportId = String(formData.get("reportId") ?? "");
  const dateValue = String(formData.get("date") ?? "");
  const description = String(formData.get("description") ?? "");

  const parsed = activityDescriptionSchema.safeParse(description);
  if (!parsed.success) {
    return { error: "Kegiatan tidak boleh kosong (maksimal 1000 karakter)." };
  }

  const date = parseDateOnly(dateValue);
  if (!date) {
    return { error: "Tanggal tidak valid." };
  }

  try {
    await addActivityForUser(user.id, reportId, date, parsed.data);
  } catch (error) {
    if (error instanceof ReportNotFoundError) {
      return { error: "Laporan tidak ditemukan." };
    }
    if (error instanceof ReportDateRangeError) {
      return { error: "Tanggal kegiatan tidak berada dalam rentang laporan." };
    }
    return { error: "Gagal menambahkan kegiatan. Silakan coba lagi." };
  }

  revalidatePath("/reports");
  revalidatePath(`/reports/${reportId}`);
  return { message: "Kegiatan ditambahkan." };
}

export async function updateActivity(
  _prevState: ReportFormState,
  formData: FormData
): Promise<ReportFormState> {
  const user = await requireUser();

  const reportId = String(formData.get("reportId") ?? "");
  const dailyLogId = String(formData.get("dailyLogId") ?? "");
  const activityId = String(formData.get("activityId") ?? "");
  const description = String(formData.get("description") ?? "");

  const parsed = activityDescriptionSchema.safeParse(description);
  if (!parsed.success) {
    return { error: "Kegiatan tidak boleh kosong (maksimal 1000 karakter)." };
  }

  try {
    await updateActivityForUser(user.id, dailyLogId, activityId, parsed.data);
  } catch (error) {
    if (error instanceof ReportNotFoundError) {
      return { error: "Kegiatan tidak ditemukan." };
    }
    return { error: "Gagal menyimpan kegiatan. Silakan coba lagi." };
  }

  revalidatePath("/reports");
  revalidatePath(`/reports/${reportId}`);
  return { message: "Kegiatan disimpan." };
}

export async function deleteActivity(
  _prevState: ReportFormState,
  formData: FormData
): Promise<ReportFormState> {
  const user = await requireUser();

  const reportId = String(formData.get("reportId") ?? "");
  const dailyLogId = String(formData.get("dailyLogId") ?? "");
  const activityId = String(formData.get("activityId") ?? "");

  try {
    await deleteActivityForUser(user.id, dailyLogId, activityId);
  } catch (error) {
    if (error instanceof ReportNotFoundError) {
      return { error: "Kegiatan tidak ditemukan." };
    }
    return { error: "Gagal menghapus kegiatan. Silakan coba lagi." };
  }

  revalidatePath("/reports");
  revalidatePath(`/reports/${reportId}`);
  return { message: "Kegiatan dihapus." };
}

export async function deleteReport(
  _prevState: ReportFormState,
  formData: FormData
): Promise<ReportFormState> {
  const user = await requireUser();
  const reportId = String(formData.get("reportId") ?? "");

  try {
    await deleteReportForUser(user.id, reportId);
  } catch (error) {
    if (error instanceof ReportNotFoundError) {
      return { error: "Laporan tidak ditemukan." };
    }
    return { error: "Gagal menghapus laporan. Silakan coba lagi." };
  }

  redirect("/reports");
}

"use server";

import { revalidatePath } from "next/cache";

import { CloudinaryError, deleteCloudinaryImage } from "@/lib/cloudinary";
import {
  deletePhotoForUser,
  PhotoNotFoundError,
  reorderPhotosForUser,
  updatePhotoCaptionForUser,
} from "@/lib/photos";
import { ReportNotFoundError } from "@/lib/reports";
import { requireUser } from "@/lib/session";
import { photoCaptionSchema } from "@/lib/validation";

export type PhotoFormState =
  | undefined
  | { message?: string; error?: string };

export async function savePhotoCaption(
  _prevState: PhotoFormState,
  formData: FormData
): Promise<PhotoFormState> {
  const user = await requireUser();

  const reportId = String(formData.get("reportId") ?? "");
  const photoId = String(formData.get("photoId") ?? "");
  const captionValue = String(formData.get("caption") ?? "");

  const parsed = photoCaptionSchema.safeParse(captionValue);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Keterangan tidak valid." };
  }

  try {
    await updatePhotoCaptionForUser(
      user.id,
      reportId,
      photoId,
      parsed.data
    );
  } catch (error) {
    if (error instanceof ReportNotFoundError || error instanceof PhotoNotFoundError) {
      return { error: "Gambar tidak ditemukan." };
    }
    return { error: "Gagal menyimpan keterangan. Silakan coba lagi." };
  }

  revalidatePath(`/reports/${reportId}`);
  return { message: "Keterangan disimpan." };
}

export async function deletePhoto(
  _prevState: PhotoFormState,
  formData: FormData
): Promise<PhotoFormState> {
  const user = await requireUser();

  const reportId = String(formData.get("reportId") ?? "");
  const photoId = String(formData.get("photoId") ?? "");

  let photo;
  try {
    photo = await deletePhotoForUser(user.id, reportId, photoId);
  } catch (error) {
    if (error instanceof ReportNotFoundError || error instanceof PhotoNotFoundError) {
      return { error: "Gambar tidak ditemukan." };
    }
    return { error: "Gagal menghapus gambar. Silakan coba lagi." };
  }

  let cloudinaryDeleted = true;
  try {
    await deleteCloudinaryImage(photo.cloudinaryPublicId);
  } catch (error) {
    cloudinaryDeleted = false;
    if (!(error instanceof CloudinaryError && error.code === "not-configured")) {
      // Keep quiet about deletion of the remote asset: the DB record is gone
      // and the app stays consistent; a stray remote asset may require cleanup.
    }
  }

  revalidatePath(`/reports/${reportId}`);
  if (!cloudinaryDeleted) {
    return {
      message: "Gambar dihapus dari aplikasi.",
    };
  }
  return { message: "Gambar dihapus." };
}

export async function reorderPhotos(
  reportId: string,
  orderedPhotoIds: string[]
): Promise<{ message?: string; error?: string }> {
  const user = await requireUser();

  try {
    await reorderPhotosForUser(user.id, reportId, orderedPhotoIds);
  } catch (error) {
    if (
      error instanceof ReportNotFoundError ||
      error instanceof PhotoNotFoundError
    ) {
      return { error: "Gambar tidak ditemukan." };
    }
    return { error: "Gagal mengubah urutan gambar. Silakan coba lagi." };
  }

  revalidatePath(`/reports/${reportId}`);
  return { message: "Urutan disimpan." };
}
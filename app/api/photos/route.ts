import { NextResponse } from "next/server";

import {
  CloudinaryError,
  detectImageFormat,
  isCloudinaryConfigured,
  MAX_PHOTO_BYTES,
  uploadImageToCloudinary,
} from "@/lib/cloudinary";
import { addPhotoForUser, assertOwnedReport, PhotoNotFoundError } from "@/lib/photos";
import { ReportNotFoundError } from "@/lib/reports";
import { getCurrentUser } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "bad-request", message: "Formulir tidak valid." },
      { status: 400 }
    );
  }

  const reportId = String(formData.get("reportId") ?? "");
  const caption = String(formData.get("caption") ?? "").trim();
  const dailyLogIdRaw = String(formData.get("dailyLogId") ?? "");
  const dailyLogId = dailyLogIdRaw || null;

  if (!reportId) {
    return NextResponse.json(
      { error: "report-required", message: "Laporan tidak ditemukan." },
      { status: 400 }
    );
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json(
      { error: "file-missing", message: "Pilih file gambar terlebih dahulu." },
      { status: 400 }
    );
  }
  if (file.size > MAX_PHOTO_BYTES) {
    return NextResponse.json(
      {
        error: "file-too-large",
        message: `Ukuran file maksimal ${MAX_PHOTO_BYTES / 1024 / 1024} MB.`,
      },
      { status: 400 }
    );
  }

  let buffer: Uint8Array;
  try {
    buffer = new Uint8Array(await file.arrayBuffer());
  } catch {
    return NextResponse.json(
      { error: "file-read-failed", message: "Gagal membaca file gambar." },
      { status: 400 }
    );
  }

  const format = detectImageFormat(buffer);
  if (!format) {
    return NextResponse.json(
      {
        error: "unsupported-type",
        message: "Format tidak didukung. Gunakan JPG, PNG, atau WebP.",
      },
      { status: 400 }
    );
  }

  try {
    await assertOwnedReport(user.id, reportId);
  } catch (error) {
    if (error instanceof ReportNotFoundError) {
      return NextResponse.json(
        { error: "report-not-found", message: "Laporan tidak ditemukan." },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: "internal-error", message: "Terjadi kesalahan." },
      { status: 500 }
    );
  }

  if (!isCloudinaryConfigured()) {
    return NextResponse.json(
      {
        error: "cloudinary-not-configured",
        message:
          "Fitur dokumentasi belum dikonfigurasi oleh pengelola aplikasi.",
      },
      { status: 503 }
    );
  }

  let upload: { publicId: string; url: string };
  try {
    upload = await uploadImageToCloudinary(buffer, {
      folder: `reports/${reportId}`,
    });
  } catch (error) {
    if (error instanceof CloudinaryError) {
      const status =
        error.code === "not-configured"
          ? 503
          : error.code === "network"
            ? 502
            : 502;
      return NextResponse.json(
        { error: `cloudinary-${error.code}`, message: error.message },
        { status }
      );
    }
    return NextResponse.json(
      { error: "cloudinary-unknown", message: "Upload gambar gagal. Coba lagi." },
      { status: 502 }
    );
  }

  let photo;
  try {
    photo = await addPhotoForUser(user.id, reportId, {
      cloudinaryPublicId: upload.publicId,
      url: upload.url,
      caption,
      dailyLogId,
    });
  } catch (error) {
    if (error instanceof PhotoNotFoundError) {
      return NextResponse.json(
        { error: "day-not-found", message: "Hari yang dipilih tidak ditemukan." },
        { status: 404 }
      );
    }
    if (error instanceof ReportNotFoundError) {
      return NextResponse.json(
        { error: "report-not-found", message: "Laporan tidak ditemukan." },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: "internal-error", message: "Gagal menyimpan foto." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    photo: {
      id: photo.id,
      url: photo.url,
      caption: photo.caption,
      order: photo.order,
    },
  });
}
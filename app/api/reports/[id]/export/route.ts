import { promises as fs } from "fs";
import path from "path";

import { NextResponse } from "next/server";

import { buildReportDocx, type DocgenAssets } from "@/lib/docgen/report-builder";
import { getReportPreviewForUser } from "@/lib/preview";
import { getCurrentUser } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_PHOTO_BYTES = 15 * 1024 * 1024;
const PHOTO_FETCH_TIMEOUT_MS = 10_000;

async function fetchPhotoBuffer(url: string): Promise<Buffer | null> {
  if (!url) return null;
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    PHOTO_FETCH_TIMEOUT_MS
  );
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
    });
    if (!response.ok) return null;
    const arrayBuffer = await response.arrayBuffer();
    if (arrayBuffer.byteLength === 0 || arrayBuffer.byteLength > MAX_PHOTO_BYTES) {
      return null;
    }
    return Buffer.from(arrayBuffer);
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function sanitizeFilename(value: string): string {
  const cleaned = value.replace(/[^a-zA-Z0-9._-]/g, "-");
  return cleaned.replace(/-+/g, "-").replace(/^-|-$/g, "") || "report";
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id: reportId } = await params;

  const report = await getReportPreviewForUser(user.id, reportId);
  if (!report) {
    return NextResponse.json(
      { error: "report-not-found", message: "Laporan tidak ditemukan." },
      { status: 404 }
    );
  }

  let logo: Buffer;
  try {
    logo = await fs.readFile(
      path.join(process.cwd(), "public", "logo-universitas.png")
    );
  } catch {
    return NextResponse.json(
      { error: "logo-missing", message: "Logo aplikasi tidak ditemukan." },
      { status: 500 }
    );
  }

  const photoBuffers = await Promise.all(
    report.photos.map((photo) => fetchPhotoBuffer(photo.url))
  );

  const photos: { caption: string | null; data: Buffer }[] = [];
  for (let index = 0; index < report.photos.length; index += 1) {
    const data = photoBuffers[index];
    if (data) {
      photos.push({ caption: report.photos[index].caption, data });
    }
  }

  const assets: DocgenAssets = { logo, photos };

  let buffer: Buffer;
  try {
    buffer = await buildReportDocx(report, assets);
  } catch {
    return NextResponse.json(
      { error: "export-failed", message: "Gagal membuat file laporan." },
      { status: 500 }
    );
  }

  const startDate = report.startDate.toISOString().slice(0, 10);
  const filename = `logbook-minggu-${report.weekNumber}-${startDate}.docx`;

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${sanitizeFilename(filename)}"`,
      "Content-Length": String(buffer.length),
      "Cache-Control": "private, no-store",
    },
  });
}
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { AIError, generateDescription, getAIConfig, isAIConfigured } from "@/lib/ai";
import {
  collectDailyLogEvidence,
  InsufficientEvidenceError,
  saveAiDraftForUser,
} from "@/lib/ai-data";
import { parseDateOnly } from "@/lib/dates";
import { ReportDateRangeError, ReportNotFoundError } from "@/lib/reports";
import { requireUser } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await requireUser();

  let body: { reportId?: unknown; date?: unknown };
  try {
    body = (await request.json()) as { reportId?: unknown; date?: unknown };
  } catch {
    return NextResponse.json({ error: "bad-request" }, { status: 400 });
  }

  const reportId = typeof body.reportId === "string" ? body.reportId : "";
  const dateValue = typeof body.date === "string" ? body.date : "";
  if (!reportId || !dateValue) {
    return NextResponse.json({ error: "bad-request" }, { status: 400 });
  }

  const date = parseDateOnly(dateValue);
  if (!date) {
    return NextResponse.json({ error: "invalid-date" }, { status: 400 });
  }

  let evidence;
  try {
    evidence = await collectDailyLogEvidence(user.id, reportId, date);
  } catch (error) {
    if (error instanceof ReportNotFoundError) {
      return NextResponse.json({ error: "report-not-found" }, { status: 404 });
    }
    if (error instanceof ReportDateRangeError) {
      return NextResponse.json(
        { error: "date-out-of-range" },
        { status: 400 }
      );
    }
    if (error instanceof InsufficientEvidenceError) {
      return NextResponse.json(
        {
          error: "insufficient-evidence",
          message:
            "Tambahkan kegiatan manual atau lampirkan commit terlebih dahulu.",
        },
        { status: 422 }
      );
    }
    return NextResponse.json({ error: "internal-error" }, { status: 500 });
  }

  if (!isAIConfigured() || !getAIConfig()) {
    return NextResponse.json(
      {
        error: "ai-not-configured",
        message:
          "Fitur AI belum dikonfigurasi. Anda tetap dapat menulis deskripsi secara manual.",
      },
      { status: 503 }
    );
  }

  let draft: string;
  try {
    draft = await generateDescription(evidence);
  } catch (error) {
    if (error instanceof AIError) {
      const status =
        error.code === "rate-limited"
          ? 429
          : error.code === "timeout"
            ? 504
            : error.code === "not-configured"
              ? 503
              : 502;
      return NextResponse.json(
        { error: `ai-${error.code}`, message: error.message },
        { status }
      );
    }
    return NextResponse.json(
      { error: "ai-unknown-error", message: "Gagal membuat draf. Coba lagi." },
      { status: 502 }
    );
  }

  await saveAiDraftForUser(user.id, reportId, date, draft);

  revalidatePath("/reports");
  revalidatePath(`/reports/${reportId}`);
  return NextResponse.json({ draft });
}

"use client";

import { useState, useActionState } from "react";
import { Loader2, Save, Sparkles } from "lucide-react";

import {
  saveFinalDescription,
  type AIDescriptionFormState,
} from "@/lib/actions/ai";
import { FormError, FormSuccess } from "@/components/form-message";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function AIDescription({
  reportId,
  dateKey,
  initialDraft,
  finalDescription,
  activityCount,
  commitCount,
  aiEnabled,
}: {
  reportId: string;
  dateKey: string;
  initialDraft: string;
  finalDescription: string | null;
  activityCount: number;
  commitCount: number;
  aiEnabled: boolean;
}) {
  const [draft, setDraft] = useState(initialDraft);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState("");
  const [genMessage, setGenMessage] = useState("");
  const [state, formAction, pending] = useActionState<
    AIDescriptionFormState,
    FormData
  >(saveFinalDescription, undefined);

  const hasEvidence = activityCount > 0 || commitCount > 0;

  async function handleGenerate() {
    setGenError("");
    setGenMessage("");
    if (!hasEvidence) {
      setGenError(
        "Tambahkan kegiatan manual atau lampirkan commit terlebih dahulu."
      );
      return;
    }
    setGenerating(true);
    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportId, date: dateKey }),
      });
      const data = (await res.json()) as { draft?: string; message?: string };
      if (!res.ok) {
        setGenError(
          data.message ?? "Gagal membuat draf. Silakan coba lagi."
        );
        return;
      }
      if (!data.draft) {
        setGenError("Gagal membuat draf. Silakan coba lagi.");
        return;
      }
      setDraft(data.draft);
      setGenMessage("Draf berhasil dibuat. Anda dapat menyuntingnya.");
    } catch {
      setGenError("Gagal terhubung ke layanan AI. Coba lagi.");
    } finally {
      setGenerating(false);
    }
  }

  const evidenceSummary = [
    activityCount > 0 ? `${activityCount} kegiatan manual` : null,
    commitCount > 0 ? `${commitCount} commit terpasang` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Deskripsi Kegiatan</CardTitle>
        <CardDescription>
          Draf deskripsi otomatis dari bukti kegiatan, dapat disunting sebelum
          disimpan sebagai deskripsi final.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {hasEvidence
            ? evidenceSummary
            : "Belum ada bukti kegiatan. Tambahkan kegiatan manual atau lampirkan commit untuk membuat draf."}
        </p>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            onClick={handleGenerate}
            disabled={generating || !hasEvidence}
          >
            {generating ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Sparkles className="h-4 w-4" aria-hidden="true" />
            )}
            {generating ? "Membuat draf..." : "Buat Draf AI"}
          </Button>
          <FormSuccess message={genMessage} />
        </div>

        <FormError message={genError} />

        {!aiEnabled ? (
          <p className="text-xs text-muted-foreground">
            Fitur AI belum dikonfigurasi oleh pengelola aplikasi. Anda tetap
            dapat menulis deskripsi secara manual.
          </p>
        ) : null}

        <form action={formAction} className="space-y-3">
          <input type="hidden" name="reportId" value={reportId} />
          <input type="hidden" name="date" value={dateKey} />
          <div className="space-y-2">
            <div className="flex items-baseline justify-between gap-2">
              <Label htmlFor={`${dateKey}-ai-draft`}>Draf AI</Label>
              {draft ? (
                <span className="text-xs text-muted-foreground">
                  {draft.length}/4000
                </span>
              ) : null}
            </div>
            <Textarea
              id={`${dateKey}-ai-draft`}
              name="aiDescription"
              rows={5}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Klik 'Buat Draf AI' untuk mengisi otomatis, atau tulis deskripsi secara manual."
              disabled={generating}
            />
          </div>

          {draft.trim() ? (
            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" size="sm" disabled={pending}>
                {pending ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Save className="h-4 w-4" aria-hidden="true" />
                )}
                {pending ? "Menyimpan..." : "Simpan Deskripsi Final"}
              </Button>
              <FormSuccess message={state?.message ?? ""} />
            </div>
          ) : null}
          <FormError message={state?.error} />
        </form>

        {finalDescription ? (
          <div className="space-y-1.5">
            <Label>Deskripsi Final (tersimpan)</Label>
            <p className="whitespace-pre-wrap rounded-md border border-border bg-secondary/40 px-3 py-2 text-sm text-foreground">
              {finalDescription}
            </p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

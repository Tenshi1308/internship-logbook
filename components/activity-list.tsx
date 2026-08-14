"use client";

import { useState } from "react";
import { Check, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";

import {
  addActivity,
  deleteActivity,
  updateActivity,
  type ReportFormState,
} from "@/lib/actions/reports";
import { FormError, FormSuccess } from "@/components/form-message";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type Activity = {
  id: string;
  description: string;
  order: number;
};

function AddActivityForm({
  reportId,
  dateKey,
  onCancel,
}: {
  reportId: string;
  dateKey: string;
  onCancel: () => void;
}) {
  const [text, setText] = useState("");
  const [state, setState] = useState<ReportFormState>(undefined);
  const [pending, setPending] = useState(false);

  async function handleSubmit(formData: FormData) {
    setPending(true);
    const result = await addActivity(undefined, formData);
    setPending(false);
    setState(result);
    if (result?.message) {
      setText("");
    }
  }

  return (
    <div className="space-y-3 rounded-md border border-border bg-secondary/40 p-3">
      <FormSuccess message={state?.message ?? ""} />
      <FormError message={state?.error} />
      <form action={handleSubmit} className="space-y-2">
        <input type="hidden" name="reportId" value={reportId} />
        <input type="hidden" name="date" value={dateKey} />
        <label htmlFor={`${dateKey}-new-activity`} className="sr-only">
          Deskripsi kegiatan baru
        </label>
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-xs text-muted-foreground">Kegiatan baru</span>
          <span className="text-xs text-muted-foreground">
            {text.length}/1000
          </span>
        </div>
        <Textarea
          id={`${dateKey}-new-activity`}
          name="description"
          rows={2}
          placeholder="Deskripsikan kegiatan (misal: Meeting dengan mentor membahas requirement proyek)."
          value={text}
          onChange={(event) => setText(event.target.value)}
          disabled={pending}
        />
        <div className="flex items-center gap-2">
          <Button type="submit" size="sm" disabled={pending}>
            <Check className="h-4 w-4" aria-hidden="true" />
            {pending ? "Menambahkan..." : "Tambah"}
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
            <X className="h-4 w-4" aria-hidden="true" />
            Batal
          </Button>
        </div>
      </form>
    </div>
  );
}

function EditActivityForm({
  reportId,
  dailyLogId,
  activityId,
  initial,
  onDone,
}: {
  reportId: string;
  dailyLogId: string;
  activityId: string;
  initial: string;
  onDone: () => void;
}) {
  const [text, setText] = useState(initial);
  const [state, setState] = useState<ReportFormState>(undefined);
  const [pending, setPending] = useState(false);

  async function handleSubmit(formData: FormData) {
    setPending(true);
    const result = await updateActivity(undefined, formData);
    setPending(false);
    setState(result);
    if (result?.message) {
      onDone();
    }
  }

  return (
    <div className="space-y-3 rounded-md border border-border bg-secondary/40 p-3">
      <FormSuccess message={state?.message ?? ""} />
      <FormError message={state?.error} />
      <form action={handleSubmit} className="space-y-2">
        <input type="hidden" name="reportId" value={reportId} />
        <input type="hidden" name="dailyLogId" value={dailyLogId} />
        <input type="hidden" name="activityId" value={activityId} />
        <label htmlFor={`${activityId}-edit`} className="sr-only">
          Deskripsi kegiatan
        </label>
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-xs text-muted-foreground">Edit kegiatan</span>
          <span className="text-xs text-muted-foreground">
            {text.length}/1000
          </span>
        </div>
        <Textarea
          id={`${activityId}-edit`}
          name="description"
          rows={2}
          value={text}
          onChange={(event) => setText(event.target.value)}
          disabled={pending}
        />
        <div className="flex items-center gap-2">
          <Button type="submit" size="sm" disabled={pending}>
            <Check className="h-4 w-4" aria-hidden="true" />
            {pending ? "Menyimpan..." : "Simpan"}
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={onDone}>
            <X className="h-4 w-4" aria-hidden="true" />
            Batal
          </Button>
        </div>
      </form>
    </div>
  );
}

function DeleteActivityButton({
  reportId,
  dailyLogId,
  activityId,
}: {
  reportId: string;
  dailyLogId: string;
  activityId: string;
}) {
  const [state, setState] = useState<ReportFormState>(undefined);
  const [pending, setPending] = useState(false);

  async function handleDelete(formData: FormData) {
    setPending(true);
    const result = await deleteActivity(undefined, formData);
    setPending(false);
    setState(result);
  }

  return (
    <form
      action={handleDelete}
      onSubmit={(event) => {
        if (
          !window.confirm("Hapus kegiatan ini? Tindakan tidak dapat dibatalkan.")
        ) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="reportId" value={reportId} />
      <input type="hidden" name="dailyLogId" value={dailyLogId} />
      <input type="hidden" name="activityId" value={activityId} />
      {state?.error ? (
        <p role="alert" className="text-xs text-destructive">
          {state.error}
        </p>
      ) : null}
      <Button
        type="submit"
        variant="ghost"
        size="icon"
        disabled={pending}
        className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
        aria-label="Hapus kegiatan"
      >
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <Trash2 className="h-4 w-4" aria-hidden="true" />
        )}
      </Button>
    </form>
  );
}

export default function ActivityList({
  reportId,
  dateKey,
  dailyLogId,
  activities,
}: {
  reportId: string;
  dateKey: string;
  dailyLogId: string | null;
  activities: Activity[];
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  return (
    <div className="space-y-3">
      {activities.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Belum ada kegiatan untuk hari ini.
        </p>
      ) : (
        <ol className="space-y-2">
          {activities.map((activity) =>
            editingId === activity.id && dailyLogId ? (
              <li key={activity.id}>
                <EditActivityForm
                  reportId={reportId}
                  dailyLogId={dailyLogId}
                  activityId={activity.id}
                  initial={activity.description}
                  onDone={() => setEditingId(null)}
                />
              </li>
            ) : (
              <li
                key={activity.id}
                className="flex items-start gap-3 rounded-md border border-border bg-card p-3"
              >
                <span className="mt-0.5 shrink-0 text-sm font-medium text-muted-foreground">
                  {activity.order + 1}.
                </span>
                <p className="flex-1 whitespace-pre-wrap text-sm text-foreground">
                  {activity.description}
                </p>
                {dailyLogId ? (
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setEditingId(activity.id)}
                      className="text-muted-foreground hover:text-foreground"
                      aria-label="Edit kegiatan"
                    >
                      <Pencil className="h-4 w-4" aria-hidden="true" />
                    </Button>
                    <DeleteActivityButton
                      reportId={reportId}
                      dailyLogId={dailyLogId}
                      activityId={activity.id}
                    />
                  </div>
                ) : null}
              </li>
            )
          )}
        </ol>
      )}

      {adding ? (
        <AddActivityForm
          reportId={reportId}
          dateKey={dateKey}
          onCancel={() => setAdding(false)}
        />
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setAdding(true)}
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Tambah Kegiatan
        </Button>
      )}
    </div>
  );
}

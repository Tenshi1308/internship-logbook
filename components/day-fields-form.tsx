"use client";

import { useState, useActionState } from "react";

import { saveDay, type ReportFormState } from "@/lib/actions/reports";
import { FormError, FormSuccess } from "@/components/form-message";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export type DayLogData = {
  startTime: string;
  endTime: string;
  location: string;
};

export default function DayFieldsForm({
  reportId,
  dateKey,
  dayLabel,
  log,
}: {
  reportId: string;
  dateKey: string;
  dayLabel: string;
  log: DayLogData | null;
}) {
  const [state, formAction, pending] = useActionState<
    ReportFormState,
    FormData
  >(saveDay, undefined);

  const [startTime, setStartTime] = useState(log?.startTime ?? "");
  const [endTime, setEndTime] = useState(log?.endTime ?? "");
  const [location, setLocation] = useState(log?.location ?? "");

  const fieldErrors = state?.fieldErrors;

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="reportId" value={reportId} />
      <input type="hidden" name="date" value={dateKey} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field
          id={`${dateKey}-startTime`}
          label="Jam mulai"
          errors={fieldErrors?.startTime}
        >
          <Input
            name="startTime"
            type="time"
            value={startTime}
            onChange={(event) => setStartTime(event.target.value)}
            aria-invalid={fieldErrors?.startTime ? true : undefined}
          />
        </Field>
        <Field
          id={`${dateKey}-endTime`}
          label="Jam selesai"
          errors={fieldErrors?.endTime}
        >
          <Input
            name="endTime"
            type="time"
            value={endTime}
            onChange={(event) => setEndTime(event.target.value)}
            aria-invalid={fieldErrors?.endTime ? true : undefined}
          />
        </Field>
        <Field
          id={`${dateKey}-location`}
          label="Lokasi"
          errors={fieldErrors?.location}
        >
          <Input
            name="location"
            placeholder="Misal: WFH, kampus, kantor"
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            aria-invalid={fieldErrors?.location ? true : undefined}
          />
        </Field>
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Menyimpan..." : `Simpan Hari ${dayLabel}`}
        </Button>
        <FormSuccess message={state?.message ?? ""} />
      </div>
      <FormError message={state?.error} />
    </form>
  );
}

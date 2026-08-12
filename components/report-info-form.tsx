"use client";

import { useState, useActionState } from "react";

import { updateReport, type ReportFormState } from "@/lib/actions/reports";
import { toDateOnly } from "@/lib/dates";
import { FormError, FormSuccess } from "@/components/form-message";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

export type ReportInfo = {
  id: string;
  weekNumber: number;
  startDate: Date;
  endDate: Date;
  status: "DRAFT" | "COMPLETED";
};

export default function ReportInfoForm({ report }: { report: ReportInfo }) {
  const [state, formAction, pending] = useActionState<
    ReportFormState,
    FormData
  >(updateReport, undefined);

  const [weekNumber, setWeekNumber] = useState(String(report.weekNumber));
  const [startDate, setStartDate] = useState(toDateOnly(report.startDate));
  const [endDate, setEndDate] = useState(toDateOnly(report.endDate));
  const [status, setStatus] = useState(report.status);

  const fieldErrors = state?.fieldErrors;

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="reportId" value={report.id} />
      <FormError message={state?.error} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field
          id="weekNumber"
          label="Minggu ke-"
          errors={fieldErrors?.weekNumber}
        >
          <Input
            name="weekNumber"
            type="number"
            inputMode="numeric"
            min={1}
            max={52}
            value={weekNumber}
            onChange={(event) => setWeekNumber(event.target.value)}
            aria-invalid={fieldErrors?.weekNumber ? true : undefined}
          />
        </Field>
        <Field
          id="startDate"
          label="Tanggal mulai"
          errors={fieldErrors?.startDate}
        >
          <Input
            name="startDate"
            type="date"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
            aria-invalid={fieldErrors?.startDate ? true : undefined}
          />
        </Field>
        <Field
          id="endDate"
          label="Tanggal selesai"
          errors={fieldErrors?.endDate}
        >
          <Input
            name="endDate"
            type="date"
            value={endDate}
            onChange={(event) => setEndDate(event.target.value)}
            aria-invalid={fieldErrors?.endDate ? true : undefined}
          />
        </Field>
        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <Select
            name="status"
            id="status"
            value={status}
            onChange={(event) =>
              setStatus(event.target.value as "DRAFT" | "COMPLETED")
            }
          >
            <option value="DRAFT">Draft</option>
            <option value="COMPLETED">Selesai</option>
          </Select>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Menyimpan..." : "Simpan Informasi"}
        </Button>
        <FormSuccess message={state?.message ?? ""} />
      </div>
    </form>
  );
}

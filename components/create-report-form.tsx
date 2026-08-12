"use client";

import { useState, useActionState } from "react";
import { Plus } from "lucide-react";

import { createReport, type ReportFormState } from "@/lib/actions/reports";
import { FormError } from "@/components/form-message";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export default function CreateReportForm() {
  const [state, formAction, pending] = useActionState<
    ReportFormState,
    FormData
  >(createReport, undefined);

  const [weekNumber, setWeekNumber] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const fieldErrors = state?.fieldErrors;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Buat Laporan Mingguan Baru</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <FormError message={state?.error} />
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
              placeholder="1"
              value={weekNumber}
              onChange={(event) => setWeekNumber(event.target.value)}
              aria-invalid={fieldErrors?.weekNumber ? true : undefined}
              aria-describedby={
                fieldErrors?.weekNumber ? "weekNumber-error" : undefined
              }
            />
          </Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                aria-describedby={
                  fieldErrors?.startDate ? "startDate-error" : undefined
                }
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
                aria-describedby={
                  fieldErrors?.endDate ? "endDate-error" : undefined
                }
              />
            </Field>
          </div>
          <Button type="submit" className="w-full sm:w-auto" disabled={pending}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            {pending ? "Membuat..." : "Buat Laporan"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

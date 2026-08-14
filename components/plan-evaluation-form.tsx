"use client";

import { useState, useActionState } from "react";

import {
  savePlanEvaluation,
  type ReportFormState,
} from "@/lib/actions/reports";
import { FormError, FormSuccess } from "@/components/form-message";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";

type PlanEvaluation = {
  id: string;
  nextWeekPlan: string | null;
  studentEvaluation: string | null;
};

export default function PlanEvaluationForm({
  report,
}: {
  report: PlanEvaluation;
}) {
  const [state, formAction, pending] = useActionState<
    ReportFormState,
    FormData
  >(savePlanEvaluation, undefined);

  const [nextWeekPlan, setNextWeekPlan] = useState(report.nextWeekPlan ?? "");
  const [studentEvaluation, setStudentEvaluation] = useState(
    report.studentEvaluation ?? ""
  );

  const fieldErrors = state?.fieldErrors;

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="reportId" value={report.id} />
      <FormError message={state?.error} />
      <Field
        id="nextWeekPlan"
        label="Rencana Kegiatan Minggu Depan"
        hint="Bagian 3 pada laporan mingguan"
        errors={fieldErrors?.nextWeekPlan}
        counter={`${nextWeekPlan.length}/2000`}
      >
        <Textarea
          name="nextWeekPlan"
          id="nextWeekPlan"
          rows={3}
          maxLength={2000}
          value={nextWeekPlan}
          onChange={(event) => setNextWeekPlan(event.target.value)}
          aria-invalid={fieldErrors?.nextWeekPlan ? true : undefined}
          placeholder="Rencana kegiatan untuk minggu berikutnya..."
        />
      </Field>
      <Field
        id="studentEvaluation"
        label="Penilaian Mahasiswa"
        hint="Bagian 4 pada laporan mingguan"
        errors={fieldErrors?.studentEvaluation}
        counter={`${studentEvaluation.length}/2000`}
      >
        <Textarea
          name="studentEvaluation"
          id="studentEvaluation"
          rows={3}
          maxLength={2000}
          value={studentEvaluation}
          onChange={(event) => setStudentEvaluation(event.target.value)}
          aria-invalid={fieldErrors?.studentEvaluation ? true : undefined}
          placeholder="Penilaian terhadap kegiatan yang berlangsung..."
        />
      </Field>
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Menyimpan..." : "Simpan Rencana & Penilaian"}
        </Button>
        <FormSuccess message={state?.message ?? ""} />
      </div>
    </form>
  );
}
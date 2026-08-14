"use client";

import { useActionState } from "react";

import { updateProfile, type ProfileFormState } from "@/lib/actions/profile";
import { FormError, FormSuccess } from "@/components/form-message";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import LogoutButton from "@/components/logout-button";

export default function ProfileEditForm({
  name,
  nim,
  scheme,
  partner,
}: {
  name: string;
  nim: string;
  scheme: string;
  partner: string;
}) {
  const [state, formAction, pending] = useActionState<
    ProfileFormState,
    FormData
  >(updateProfile, undefined);

  const fieldErrors = state?.fieldErrors;

  return (
    <form action={formAction} className="space-y-4">
      <FormError message={state?.error} />
      <Field id="name" label="Nama" errors={fieldErrors?.name}>
        <Input
          name="name"
          autoComplete="name"
          defaultValue={name}
          aria-invalid={fieldErrors?.name ? true : undefined}
          aria-describedby={fieldErrors?.name ? "name-error" : undefined}
        />
      </Field>
      <Field id="nim" label="NIM" errors={fieldErrors?.nim}>
        <Input
          name="nim"
          autoComplete="off"
          defaultValue={nim}
          aria-invalid={fieldErrors?.nim ? true : undefined}
          aria-describedby={fieldErrors?.nim ? "nim-error" : undefined}
        />
      </Field>
      <Field id="scheme" label="Skema" errors={fieldErrors?.scheme}>
        <Input
          name="scheme"
          defaultValue={scheme}
          placeholder="Contoh: Community Developer"
          aria-invalid={fieldErrors?.scheme ? true : undefined}
          aria-describedby={fieldErrors?.scheme ? "scheme-error" : undefined}
        />
      </Field>
      <Field id="partner" label="Mitra" errors={fieldErrors?.partner}>
        <Input
          name="partner"
          defaultValue={partner}
          placeholder="Nama mitra"
          aria-invalid={fieldErrors?.partner ? true : undefined}
          aria-describedby={fieldErrors?.partner ? "partner-error" : undefined}
        />
      </Field>
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Menyimpan..." : "Simpan Profil"}
        </Button>
        <div className="md:hidden">
          <LogoutButton variant="outline" />
        </div>
        <FormSuccess message={state?.message ?? ""} />
      </div>
    </form>
  );
}
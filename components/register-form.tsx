"use client";

import { useActionState } from "react";

import { register, type AuthFormState } from "@/lib/actions/auth";
import { FormError } from "@/components/form-message";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";

export default function RegisterForm() {
  const [state, formAction, pending] = useActionState<AuthFormState, FormData>(
    register,
    undefined
  );

  const fieldErrors = state?.fieldErrors;

  return (
    <form action={formAction} className="space-y-4">
      <FormError message={state?.error} />
      <Field id="name" label="Nama" errors={fieldErrors?.name}>
        <Input
          name="name"
          autoComplete="name"
          placeholder="Nama lengkap"
          aria-invalid={fieldErrors?.name ? true : undefined}
          aria-describedby={
            fieldErrors?.name ? "name-error" : undefined
          }
        />
      </Field>
      <Field id="nim" label="NIM" errors={fieldErrors?.nim}>
        <Input
          name="nim"
          autoComplete="off"
          placeholder="NIM"
          aria-invalid={fieldErrors?.nim ? true : undefined}
          aria-describedby={fieldErrors?.nim ? "nim-error" : undefined}
        />
      </Field>
      <Field id="email" label="Email" errors={fieldErrors?.email}>
        <Input
          name="email"
          type="email"
          autoComplete="email"
          placeholder="nama@email.com"
          aria-invalid={fieldErrors?.email ? true : undefined}
          aria-describedby={
            fieldErrors?.email ? "email-error" : undefined
          }
        />
      </Field>
      <Field
        id="password"
        label="Password"
        hint="Minimal 8 karakter."
        errors={fieldErrors?.password}
      >
        <PasswordInput
          name="password"
          autoComplete="new-password"
          placeholder="Buat password"
          aria-invalid={fieldErrors?.password ? true : undefined}
          aria-describedby={
            fieldErrors?.password ? "password-error" : undefined
          }
        />
      </Field>
      <Field id="scheme" label="Skema" errors={fieldErrors?.scheme}>
        <Input
          name="scheme"
          placeholder="Contoh: Community Developer"
          aria-invalid={fieldErrors?.scheme ? true : undefined}
          aria-describedby={
            fieldErrors?.scheme ? "scheme-error" : undefined
          }
        />
      </Field>
      <Field id="partner" label="Mitra" errors={fieldErrors?.partner}>
        <Input
          name="partner"
          placeholder="Nama mitra"
          aria-invalid={fieldErrors?.partner ? true : undefined}
          aria-describedby={
            fieldErrors?.partner ? "partner-error" : undefined
          }
        />
      </Field>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Mendaftar..." : "Daftar"}
      </Button>
    </form>
  );
}

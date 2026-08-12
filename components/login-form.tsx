"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";

import { login, type AuthFormState } from "@/lib/actions/auth";
import { FormError } from "@/components/form-message";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";

export default function LoginForm() {
  const [state, formAction, pending] = useActionState<AuthFormState, FormData>(
    login,
    undefined
  );
  const searchParams = useSearchParams();
  const justRegistered = searchParams.get("registered") === "1";

  return (
    <form action={formAction} className="space-y-4">
      {justRegistered && (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          Akun berhasil dibuat. Silakan masuk.
        </p>
      )}
      <FormError message={state?.error} />
      <Field
        id="email"
        label="Email"
        errors={state?.fieldErrors?.email}
      >
        <Input
          name="email"
          type="email"
          autoComplete="email"
          placeholder="nama@email.com"
          aria-invalid={state?.fieldErrors?.email ? true : undefined}
          aria-describedby={
            state?.fieldErrors?.email ? "email-error" : undefined
          }
        />
      </Field>
      <Field
        id="password"
        label="Password"
        errors={state?.fieldErrors?.password}
      >
        <PasswordInput
          name="password"
          autoComplete="current-password"
          placeholder="Masukkan password"
          aria-invalid={state?.fieldErrors?.password ? true : undefined}
          aria-describedby={
            state?.fieldErrors?.password ? "password-error" : undefined
          }
        />
      </Field>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Masuk..." : "Login"}
      </Button>
    </form>
  );
}

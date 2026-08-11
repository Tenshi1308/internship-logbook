"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";

import { login, type AuthFormState } from "@/lib/actions/auth";
import { FieldErrors, FormError } from "@/components/form-message";

const inputClass =
  "w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200";

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
      <div>
        <label htmlFor="email" className="mb-1 block text-sm font-medium text-slate-700">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          className={inputClass}
        />
        <FieldErrors errors={state?.fieldErrors?.email} />
      </div>
      <div>
        <label htmlFor="password" className="mb-1 block text-sm font-medium text-slate-700">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          className={inputClass}
        />
        <FieldErrors errors={state?.fieldErrors?.password} />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Masuk..." : "Login"}
      </button>
    </form>
  );
}

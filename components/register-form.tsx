"use client";

import { useActionState } from "react";

import { register, type AuthFormState } from "@/lib/actions/auth";
import { FieldErrors, FormError } from "@/components/form-message";

const inputClass =
  "w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200";

function Field({
  id,
  label,
  type = "text",
  placeholder,
  autoComplete,
  errors,
}: {
  id: string;
  label: string;
  type?: string;
  placeholder?: string;
  autoComplete?: string;
  errors?: string[];
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-slate-700">
        {label}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className={inputClass}
      />
      <FieldErrors errors={errors} />
    </div>
  );
}

export default function RegisterForm() {
  const [state, formAction, pending] = useActionState<AuthFormState, FormData>(
    register,
    undefined
  );

  return (
    <form action={formAction} className="space-y-4">
      <FormError message={state?.error} />
      <Field
        id="name"
        label="Nama"
        placeholder="Nama lengkap"
        autoComplete="name"
        errors={state?.fieldErrors?.name}
      />
      <Field
        id="nim"
        label="NIM"
        placeholder="NIM"
        autoComplete="off"
        errors={state?.fieldErrors?.nim}
      />
      <Field
        id="email"
        label="Email"
        type="email"
        placeholder="nama@email.com"
        autoComplete="email"
        errors={state?.fieldErrors?.email}
      />
      <Field
        id="password"
        label="Password"
        type="password"
        placeholder="Minimal 8 karakter"
        autoComplete="new-password"
        errors={state?.fieldErrors?.password}
      />
      <Field
        id="scheme"
        label="Skema"
        placeholder="Contoh: Community Developer"
        errors={state?.fieldErrors?.scheme}
      />
      <Field
        id="partner"
        label="Mitra"
        placeholder="Nama mitra"
        errors={state?.fieldErrors?.partner}
      />
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Mendaftar..." : "Daftar"}
      </button>
    </form>
  );
}

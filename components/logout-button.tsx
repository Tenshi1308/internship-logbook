"use client";

import { useFormStatus } from "react-dom";
import { LogOut } from "lucide-react";

import { logout } from "@/lib/actions/auth";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <LogOut className="h-5 w-5 shrink-0" aria-hidden="true" />
      <span className="truncate">
        {pending ? "Keluar..." : "Logout"}
      </span>
    </button>
  );
}

export default function LogoutButton() {
  return (
    <form action={logout}>
      <SubmitButton />
    </form>
  );
}

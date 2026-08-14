"use client";

import { useTransition } from "react";
import { LogOut } from "lucide-react";

import { logout } from "@/lib/actions/auth";

function SubmitButton({
  variant,
  pending,
  onLogout,
}: {
  variant: "sidebar" | "outline";
  pending: boolean;
  onLogout: () => void;
}) {
  const outlineButtonClass =
    "inline-flex h-8 items-center gap-1.5 rounded-md border border-input bg-background px-3 text-sm font-medium text-foreground transition-colors hover:bg-secondary hover:text-secondary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-50";
  const sidebarButtonClass =
    "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <button
      type="button"
      onClick={onLogout}
      disabled={pending}
      className={variant === "outline" ? outlineButtonClass : sidebarButtonClass}
    >
      <LogOut
        className={variant === "outline" ? "h-4 w-4 shrink-0" : "h-5 w-5 shrink-0"}
        aria-hidden="true"
      />
      <span className="truncate">
        {pending ? "Keluar..." : "Logout"}
      </span>
    </button>
  );
}

export default function LogoutButton({
  variant = "sidebar",
}: {
  variant?: "sidebar" | "outline";
}) {
  const [pending, startTransition] = useTransition();

  return (
    <SubmitButton
      variant={variant}
      pending={pending}
      onLogout={() => startTransition(() => logout())}
    />
  );
}

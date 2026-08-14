"use client";

import { useFormStatus } from "react-dom";
import { Link2Off } from "lucide-react";

import { disconnectGitHub } from "@/lib/actions/github";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-8 items-center gap-1.5 rounded-md border border-input bg-background px-3 text-sm font-medium text-foreground transition-colors hover:bg-secondary hover:text-secondary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-50"
    >
      <Link2Off className="h-4 w-4" aria-hidden="true" />
      {pending ? "Memutuskan..." : "Putuskan Koneksi"}
    </button>
  );
}

export default function DisconnectGitHubButton() {
  return (
    <form action={disconnectGitHub}>
      <SubmitButton />
    </form>
  );
}

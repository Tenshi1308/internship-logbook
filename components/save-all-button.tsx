"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Save } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function SaveAllButton() {
  const [pending, setPending] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  function handleSaveAll() {
    const forms = Array.from(
      document.querySelectorAll<HTMLFormElement>("form[data-save-all]")
    );
    if (forms.length === 0) return;

    setPending(true);
    forms.forEach((form) => form.requestSubmit());
    timeoutRef.current = window.setTimeout(() => setPending(false), 1500);
  }

  return (
    <Button type="button" onClick={handleSaveAll} disabled={pending}>
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      ) : (
        <Save className="h-4 w-4" aria-hidden="true" />
      )}
      {pending ? "Menyimpan..." : "Simpan Semua"}
    </Button>
  );
}

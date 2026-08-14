"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type FieldEntry = {
  el: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
  baseline: string;
};

export default function UnsavedChangesGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const fieldsRef = useRef<FieldEntry[]>([]);
  const dirtyRef = useRef(false);
  const [dirty, setDirty] = useState(false);

  const recompute = useCallback(() => {
    const has = fieldsRef.current.some(
      ({ el, baseline }) => el.value !== baseline
    );
    dirtyRef.current = has;
    setDirty(has);
  }, []);

  const setBaselineForForm = useCallback((form: HTMLFormElement) => {
    fieldsRef.current.forEach((entry) => {
      if (form.contains(entry.el)) {
        entry.baseline = entry.el.value;
      }
    });
    recompute();
  }, [recompute]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    fieldsRef.current = Array.from(
      root.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
        "input, textarea, select"
      )
    ).map((el) => ({ el, baseline: el.value }));

    function onInput(event: Event) {
      if (fieldsRef.current.some((entry) => entry.el === event.target)) {
        recompute();
      }
    }

    function onSubmit(event: SubmitEvent) {
      const target = event.target;
      if (target instanceof HTMLFormElement) {
        setBaselineForForm(target);
      }
    }

    function onClickAnchor(event: MouseEvent) {
      if (!dirtyRef.current) return;
      const anchor = (event.target as HTMLElement | null)?.closest("a");
      if (!anchor) return;
      const href = anchor.getAttribute("href") ?? "";
      if (!href.startsWith("/") || href.startsWith("#")) return;
      if (
        !window.confirm(
          "Ada perubahan yang belum disimpan. Yakin ingin meninggalkan halaman ini?"
        )
      ) {
        event.preventDefault();
      }
    }

    function onBeforeUnload(event: BeforeUnloadEvent) {
      if (!dirtyRef.current) return;
      event.preventDefault();
      event.returnValue = "";
    }

    root.addEventListener("input", onInput, true);
    root.addEventListener("change", onInput, true);
    root.addEventListener("submit", onSubmit, true);
    document.addEventListener("click", onClickAnchor, true);
    window.addEventListener("beforeunload", onBeforeUnload);

    return () => {
      root.removeEventListener("input", onInput, true);
      root.removeEventListener("change", onInput, true);
      root.removeEventListener("submit", onSubmit, true);
      document.removeEventListener("click", onClickAnchor, true);
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, [recompute, setBaselineForForm]);

  return (
    <div ref={rootRef}>
      {dirty ? (
        <div
          role="status"
          className="mb-3 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 print:hidden"
        >
          Ada perubahan yang belum disimpan. Simpan sebelum meninggalkan halaman
          ini.
        </div>
      ) : null}
      {children}
    </div>
  );
}
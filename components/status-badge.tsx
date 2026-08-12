import { cn } from "@/lib/utils";

export function StatusBadge({ status }: { status: "DRAFT" | "COMPLETED" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        status === "COMPLETED"
          ? "bg-emerald-100 text-emerald-700"
          : "bg-secondary text-secondary-foreground"
      )}
    >
      {status === "COMPLETED" ? "Selesai" : "Draft"}
    </span>
  );
}

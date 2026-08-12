import { BookOpen } from "lucide-react";

import { cn } from "@/lib/utils";

export function AppLogo({
  className,
  showText = true,
}: {
  className?: string;
  showText?: boolean;
}) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
        <BookOpen className="h-5 w-5" aria-hidden="true" />
      </div>
      {showText ? (
        <div className="min-w-0 leading-tight">
          <p className="truncate text-sm font-semibold text-foreground">
            Internship Logbook
          </p>
          <p className="truncate text-xs text-muted-foreground">
            Magang S1 Informatika
          </p>
        </div>
      ) : null}
    </div>
  );
}

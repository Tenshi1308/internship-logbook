"use client";

import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

type DayNavItem = {
  key: string;
  label: string;
  short: string;
};

export default function DayJumpNav({ days }: { days: DayNavItem[] }) {
  const stripRef = useRef<HTMLDivElement>(null);
  const [activeKey, setActiveKey] = useState<string | null>(null);

  useEffect(() => {
    const targets = days
      .map((day) => document.getElementById(`day-${day.key}`))
      .filter((el): el is HTMLElement => el !== null);
    if (targets.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible.length === 0) return;
        const target = visible[0].target.id.replace(/^day-/, "");
        setActiveKey(target);
        stripRef.current
          ?.querySelector(`[data-day-key="${target}"]`)
          ?.scrollIntoView({ block: "nearest", inline: "nearest" });
      },
      { rootMargin: "-35% 0px -60% 0px", threshold: 0 }
    );

    targets.forEach((target) => observer.observe(target));
    return () => observer.disconnect();
  }, [days]);

  return (
    <nav
      aria-label="Lompat ke hari"
      className="sticky top-3 z-20 print:hidden"
    >
      <div ref={stripRef} className="overflow-x-auto md:hidden">
        <ul className="mx-auto flex w-max gap-1.5">
          {days.map((day) => {
            const isActive = day.key === activeKey;
            return (
              <li key={day.key}>
                <a
                  href={`#day-${day.key}`}
                  data-day-key={day.key}
                  className={cn(
                    "inline-flex h-9 snap-start items-center rounded-md border px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
                    isActive
                      ? "border-transparent bg-primary text-primary-foreground"
                      : "border-border bg-background text-muted-foreground hover:bg-secondary hover:text-secondary-foreground"
                  )}
                >
                  {day.short}
                </a>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="hidden md:block">
        <ul className="grid grid-flow-col overflow-hidden rounded-lg border border-border bg-background/95 backdrop-blur">
          {days.map((day) => {
            const isActive = day.key === activeKey;
            return (
              <li key={day.key}>
                <a
                  href={`#day-${day.key}`}
                  data-day-key={day.key}
                  className={cn(
                    "flex h-10 items-center justify-center border-r border-border text-sm font-medium transition-colors last:border-r-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/40",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-secondary hover:text-secondary-foreground"
                  )}
                >
                  {day.label}
                </a>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}

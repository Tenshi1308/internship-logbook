import { cn } from "@/lib/utils";

export function Input({
  className,
  type,
  ...props
}: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      className={cn(
        "h-10 w-full rounded-md border border-input bg-white px-3 text-base text-foreground shadow-sm transition-colors",
        "placeholder:text-muted-foreground/80",
        "focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "aria-invalid:border-destructive focus-visible:aria-invalid:ring-destructive/25",
        "md:text-sm",
        className
      )}
      {...props}
    />
  );
}

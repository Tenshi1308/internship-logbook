import { Label } from "@/components/ui/label";
import { FieldErrors } from "@/components/form-message";

export function Field({
  id,
  label,
  errors,
  hint,
  children,
}: {
  id: string;
  label: string;
  errors?: string[] | undefined;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      <FieldErrors id={`${id}-error`} errors={errors} />
    </div>
  );
}

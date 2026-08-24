import { Input } from "@/components/ui/input";

export function FormField({
  label,
  error,
  ...props
}: React.ComponentProps<typeof Input> & { label: string; error?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs text-muted-foreground">{label}</label>
      <Input aria-invalid={!!error} {...props} />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

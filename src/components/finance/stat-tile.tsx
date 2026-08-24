import { cn } from "@/lib/utils";

export function StatTile({
  label,
  value,
  tone,
  className,
}: {
  label: string;
  value: string;
  tone?: "positive" | "negative" | "neutral";
  className?: string;
}) {
  return (
    <div className={cn("rounded-lg border border-border bg-card px-3.5 py-3", className)}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={cn(
          "num mt-1 text-base font-semibold",
          tone === "positive" && "text-positive",
          tone === "negative" && "text-negative"
        )}
      >
        {value}
      </p>
    </div>
  );
}

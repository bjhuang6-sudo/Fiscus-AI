import { cn } from "@/lib/utils";

export function AdviceDisclaimer({ className }: { className?: string }) {
  return (
    <p className={cn("text-[11px] leading-relaxed text-muted-foreground/70", className)}>
      Not financial advice — for informational purposes only.
    </p>
  );
}

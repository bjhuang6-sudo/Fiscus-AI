import { cn } from "@/lib/utils";

export function BrandMark({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className="size-3.5"
          stroke="currentColor"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 17l6-6 4 4 8-8" />
          <path d="M15 7h6v6" />
        </svg>
      </span>
      <span className="text-sm font-semibold tracking-tight">Fiscus AI</span>
    </div>
  );
}

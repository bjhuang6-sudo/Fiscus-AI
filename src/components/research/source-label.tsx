import { FileCheck2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function SourceLabel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-1 text-[11px] text-muted-foreground", className)}>
      <FileCheck2 className="size-3" />
      {children}
    </span>
  );
}

"use client";

import { CheckCircle2, CircleDashed, TriangleAlert } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { ConfidenceLevel, SourceReading } from "@/lib/market-data/verify";

const CONFIG: Record<
  ConfidenceLevel,
  { icon: typeof CheckCircle2; className: string; label: string }
> = {
  verified: {
    icon: CheckCircle2,
    className: "text-positive",
    label: "Verified across multiple sources",
  },
  conflicting: {
    icon: TriangleAlert,
    className: "text-yellow-500",
    label: "Sources disagree",
  },
  unverified: {
    icon: CircleDashed,
    className: "text-muted-foreground",
    label: "Single-source, not independently verified",
  },
};

export function ConfidenceBadge({
  confidence,
  sources,
  note,
  className,
}: {
  confidence: ConfidenceLevel;
  sources?: SourceReading[];
  note?: string;
  className?: string;
}) {
  const { icon: Icon, className: colorClass, label } = CONFIG[confidence];

  return (
    <Tooltip>
      <TooltipTrigger className={cn("inline-flex cursor-default items-center", className)}>
        <Icon className={cn("size-3.5", colorClass)} />
      </TooltipTrigger>
      <TooltipContent className="max-w-64 text-xs">
        <p className="font-medium">{label}</p>
        {note && <p className="mt-1 text-muted-foreground">{note}</p>}
        {sources && sources.length > 0 && (
          <ul className="mt-1.5 space-y-0.5">
            {sources.map((s) => (
              <li key={s.name} className="num text-muted-foreground">
                {s.name}: ${s.value.toFixed(2)}
              </li>
            ))}
          </ul>
        )}
      </TooltipContent>
    </Tooltip>
  );
}

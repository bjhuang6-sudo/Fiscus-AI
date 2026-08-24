"use client";

import * as React from "react";
import { ChevronDown, Wrench } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { ResearchTrailEntry } from "@/lib/types";
import { cn } from "@/lib/utils";

function formatToolName(tool: string): string {
  return tool
    .split("_")
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
}

export function ResearchTrail({ trail }: { trail: ResearchTrailEntry[] }) {
  const [open, setOpen] = React.useState(false);

  if (trail.length === 0) return null;

  return (
    <div className="rounded-lg border border-border bg-card/50">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs text-muted-foreground hover:text-foreground"
      >
        <span className="flex items-center gap-1.5">
          <Wrench className="size-3.5" />
          Checked {trail.length} source{trail.length !== 1 ? "s" : ""}
        </span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.15 }}>
          <ChevronDown className="size-3.5" />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <ul className="divide-y divide-border border-t border-border">
              {trail.map((entry, i) => (
                <li key={i} className="px-3 py-2 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{formatToolName(entry.tool)}</span>
                    {typeof entry.args.ticker === "string" && (
                      <span className="num text-muted-foreground">{entry.args.ticker}</span>
                    )}
                  </div>
                  <p className={cn("num mt-0.5 truncate text-muted-foreground")}>{entry.summary}</p>
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

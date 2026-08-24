"use client";

import { motion } from "framer-motion";
import type { SectorPerformance } from "@/lib/market-data";
import { formatPercent } from "@/lib/format";

function intensity(changePercent: number): number {
  const clamped = Math.min(Math.abs(changePercent), 2.5);
  return 0.12 + (clamped / 2.5) * 0.55;
}

export function SectorHeatmap({ sectors }: { sectors: SectorPerformance[] }) {
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
      {sectors.map((s, i) => {
        const isPositive = s.changePercent >= 0;
        const alpha = intensity(s.changePercent);
        return (
          <motion.div
            key={s.sector}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ scale: 1.03 }}
            transition={{ duration: 0.2, delay: i * 0.03 }}
            className="rounded-lg border border-border p-3.5"
            style={{
              backgroundColor: `color-mix(in oklch, ${
                isPositive ? "var(--positive)" : "var(--negative)"
              } ${(alpha * 100).toFixed(0)}%, var(--card))`,
            }}
          >
            <p className="text-xs font-medium text-foreground/80">{s.sector}</p>
            <p
              className={`num mt-1 text-base font-semibold ${
                isPositive ? "text-positive" : "text-negative"
              }`}
            >
              {formatPercent(s.changePercent)}
            </p>
          </motion.div>
        );
      })}
    </div>
  );
}

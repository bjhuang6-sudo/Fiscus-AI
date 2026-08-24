"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";

const STATUS_MESSAGES = [
  "Pulling live quotes…",
  "Checking fundamentals…",
  "Cross-referencing filings…",
  "Running the numbers…",
];

export function ThinkingIndicator() {
  const [index, setIndex] = React.useState(0);

  React.useEffect(() => {
    const timer = setInterval(() => {
      setIndex((i) => Math.min(i + 1, STATUS_MESSAGES.length - 1));
    }, 1100);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex items-center gap-2.5 py-1">
      <motion.div
        className="size-3.5 rounded-full border-2 border-primary/30 border-t-primary"
        animate={{ rotate: 360 }}
        transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
      />
      <AnimatePresence mode="wait">
        <motion.span
          key={index}
          initial={{ opacity: 0, y: 3 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -3 }}
          transition={{ duration: 0.15 }}
          className="text-sm text-muted-foreground"
        >
          {STATUS_MESSAGES[index]}
        </motion.span>
      </AnimatePresence>
    </div>
  );
}

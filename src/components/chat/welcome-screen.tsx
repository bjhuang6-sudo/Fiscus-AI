"use client";

import { motion } from "framer-motion";
import { BrandMark } from "@/components/brand-mark";

const PROMPTS = [
  "What's AAPL trading at right now?",
  "Run a DCF on NVDA",
  "Compare MSFT and GOOGL margins",
  "Explain what a rising 10-year yield means for growth stocks",
];

export function WelcomeScreen({ onPrompt }: { onPrompt: (text: string) => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        <BrandMark className="mb-4 scale-125" />
      </motion.div>
      <motion.h1
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.05 }}
        className="text-2xl font-semibold tracking-tight text-foreground"
      >
        What are you looking into?
      </motion.h1>
      <motion.p
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.1 }}
        className="mt-2 max-w-md text-center text-sm text-muted-foreground"
      >
        Markets, valuation, filings, or portfolio risk — ask directly and I&apos;ll pull the numbers.
      </motion.p>
      <div className="mt-6 grid w-full max-w-xl grid-cols-1 gap-2 sm:grid-cols-2">
        {PROMPTS.map((prompt, i) => (
          <motion.button
            key={prompt}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.98 }}
            transition={{ duration: 0.2, delay: 0.15 + i * 0.04 }}
            onClick={() => onPrompt(prompt)}
            className="rounded-lg border border-border bg-card px-3.5 py-2.5 text-left text-sm text-foreground/90 transition-colors hover:border-primary/40 hover:bg-accent hover:shadow-sm"
          >
            {prompt}
          </motion.button>
        ))}
      </div>
    </div>
  );
}

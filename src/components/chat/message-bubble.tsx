"use client";

import { motion } from "framer-motion";
import type { ChatMessage } from "@/lib/types";
import { PriceCard } from "./price-card";
import { ValuationCard } from "./valuation-card";
import { ChartCard } from "./chart-card";
import { ResearchTrail } from "./research-trail";
import { AdviceDisclaimer } from "@/components/advice-disclaimer";

export function MessageBubble({ message }: { message: ChatMessage }) {
  if (message.role === "user") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="flex justify-end"
      >
        <div className="max-w-[75%] rounded-2xl bg-secondary px-4 py-2.5 text-sm text-secondary-foreground">
          {message.content}
        </div>
      </motion.div>
    );
  }

  const hasValuationCard = message.toolCards?.some((c) => c.type === "valuation");

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="flex justify-start"
    >
      <div className="w-full max-w-[85%] space-y-3">
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
          {message.content}
        </p>
        {message.toolCards && message.toolCards.length > 0 && (
          <div className="flex flex-wrap gap-3">
            {message.toolCards.map((card, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2, delay: 0.05 + i * 0.05 }}
              >
                {card.type === "quote" ? (
                  <PriceCard data={card.data} />
                ) : card.type === "chart" ? (
                  <ChartCard data={card.data} />
                ) : (
                  <ValuationCard data={card.data} />
                )}
              </motion.div>
            ))}
          </div>
        )}
        {message.trail && message.trail.length > 0 && <ResearchTrail trail={message.trail} />}
        {message.isAdvice && !hasValuationCard && <AdviceDisclaimer />}
      </div>
    </motion.div>
  );
}

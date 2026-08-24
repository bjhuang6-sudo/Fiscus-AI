"use client";

import { useRouter } from "next/navigation";
import { MessageSquarePlus } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AskAboutButton({ ticker, companyName }: { ticker: string; companyName: string }) {
  const router = useRouter();

  return (
    <Button
      variant="outline"
      className="gap-2"
      onClick={() =>
        router.push(`/?prompt=${encodeURIComponent(`Tell me about ${companyName} (${ticker}) and its current situation`)}`)
      }
    >
      <MessageSquarePlus className="size-4" />
      Ask about this company
    </Button>
  );
}

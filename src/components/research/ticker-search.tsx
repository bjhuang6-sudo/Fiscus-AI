"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

interface TickerOption {
  ticker: string;
  companyName: string;
}

export function TickerSearch() {
  const router = useRouter();
  const [query, setQuery] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const [matches, setMatches] = React.useState<TickerOption[]>([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (!query.trim()) {
      setMatches([]);
      return;
    }
    setLoading(true);
    const handle = setTimeout(async () => {
      try {
        const res = await fetch(`/api/market/search?q=${encodeURIComponent(query)}`);
        const { results } = await res.json();
        setMatches(results);
      } catch {
        setMatches([]);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(handle);
  }, [query]);

  const goTo = (ticker: string) => {
    setQuery("");
    setOpen(false);
    router.push(`/research/${ticker}`);
  };

  return (
    <div className="relative w-full max-w-lg">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && matches.length > 0) {
              goTo(matches[0].ticker);
            }
          }}
          placeholder="Search any ticker or company — AAPL, Microsoft, NVDA…"
          className="pl-9"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
      </div>
      {open && matches.length > 0 && (
        <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-border bg-popover shadow-md">
          {matches.map((m) => (
            <button
              key={m.ticker}
              onMouseDown={() => goTo(m.ticker)}
              className="flex w-full items-center justify-between px-3.5 py-2 text-left text-sm hover:bg-accent"
            >
              <span className="font-medium">{m.ticker}</span>
              <span className="truncate pl-3 text-xs text-muted-foreground">{m.companyName}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

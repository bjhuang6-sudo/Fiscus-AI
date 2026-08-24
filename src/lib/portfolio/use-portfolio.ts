"use client";

import * as React from "react";
import { useSession } from "next-auth/react";

export interface Holding {
  ticker: string;
  shares: number;
}

const STORAGE_KEY = "fiscus-portfolio-v1";
const JSON_HEADERS = { "Content-Type": "application/json" };

const DEFAULT_HOLDINGS: Holding[] = [
  { ticker: "AAPL", shares: 25 },
  { ticker: "NVDA", shares: 40 },
  { ticker: "MSFT", shares: 10 },
];

/** Clears the guest-mode local cache — called on sign-out so a stale
 * pre-login browsing session doesn't resurface after logging out. */
export function clearGuestPortfolioStorage() {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

async function fetchRemoteHoldings(): Promise<Holding[]> {
  const res = await fetch("/api/portfolio");
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data?.holdings) ? data.holdings : [];
}

export function usePortfolio() {
  const { status } = useSession();
  const isAuthed = status === "authenticated";

  const [holdings, setHoldings] = React.useState<Holding[]>(DEFAULT_HOLDINGS);
  const [loaded, setLoaded] = React.useState(false);

  // Guests keep the old localStorage-backed default portfolio; signed-in
  // users read their own saved holdings from the DB (starting empty, not the
  // sample defaults, since those are onboarding filler rather than real data).
  React.useEffect(() => {
    if (status === "loading") return;
    setLoaded(false);

    if (status === "authenticated") {
      fetchRemoteHoldings().then((remote) => {
        setHoldings(remote);
        setLoaded(true);
      });
    } else {
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        setHoldings(raw ? JSON.parse(raw) : DEFAULT_HOLDINGS);
      } catch {
        setHoldings(DEFAULT_HOLDINGS);
      }
      setLoaded(true);
    }
  }, [status]);

  React.useEffect(() => {
    if (!loaded || isAuthed) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(holdings));
  }, [holdings, loaded, isAuthed]);

  const addHolding = (ticker: string, shares: number) => {
    setHoldings((prev) => {
      if (prev.some((h) => h.ticker === ticker)) return prev;
      return [...prev, { ticker, shares }];
    });
    if (isAuthed) {
      fetch("/api/portfolio", { method: "POST", headers: JSON_HEADERS, body: JSON.stringify({ ticker, shares }) }).catch(
        () => {}
      );
    }
  };

  const updateShares = (ticker: string, shares: number) => {
    setHoldings((prev) => prev.map((h) => (h.ticker === ticker ? { ...h, shares } : h)));
    if (isAuthed) {
      fetch(`/api/portfolio/${ticker}`, { method: "PUT", headers: JSON_HEADERS, body: JSON.stringify({ shares }) }).catch(
        () => {}
      );
    }
  };

  const removeHolding = (ticker: string) => {
    setHoldings((prev) => prev.filter((h) => h.ticker !== ticker));
    if (isAuthed) {
      fetch(`/api/portfolio/${ticker}`, { method: "DELETE" }).catch(() => {});
    }
  };

  return { holdings, loaded, addHolding, updateShares, removeHolding };
}

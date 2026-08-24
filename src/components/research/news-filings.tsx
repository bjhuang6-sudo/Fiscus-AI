import { ExternalLink, FileText, Newspaper } from "lucide-react";
import type { Filing, NewsItem } from "@/lib/market-data";
import { formatDate } from "@/lib/format";
import { SourceLabel } from "./source-label";

export function NewsList({ items }: { items: NewsItem[] }) {
  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <Newspaper className="size-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold">Recent news</h3>
      </div>
      {items.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-muted-foreground">
          No recent news available.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {items.map((item) => (
            <li key={item.id}>
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block px-4 py-3 hover:bg-accent"
              >
                <p className="text-sm font-medium leading-snug">{item.headline}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {item.source} · {formatDate(item.publishedAt)}
                </p>
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function FilingsList({ items }: { items: Filing[] }) {
  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <FileText className="size-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold">Recent filings</h3>
      </div>
      {items.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-muted-foreground">
          No recent filings found on SEC EDGAR.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {items.map((item) => (
            <li key={item.id}>
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-accent"
              >
                <div>
                  <p className="flex items-center gap-1.5 text-sm font-medium">
                    {item.type}
                    <ExternalLink className="size-3 text-muted-foreground" />
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{item.description}</p>
                  <SourceLabel className="mt-1">
                    SEC EDGAR — {item.type} filed {formatDate(item.filedAt)}
                  </SourceLabel>
                </div>
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

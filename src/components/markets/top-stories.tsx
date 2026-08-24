import { Newspaper, ChevronDown } from "lucide-react";
import type { TopStory } from "@/lib/ai/top-stories";
import { formatDate } from "@/lib/format";

export function TopStories({ items }: { items: TopStory[] }) {
  return (
    <details className="group rounded-lg border border-border bg-card">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 [&::-webkit-details-marker]:hidden">
        <Newspaper className="size-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold">Top stories</h3>
        <span className="text-xs text-muted-foreground">({items.length})</span>
        <ChevronDown className="ml-auto size-4 text-muted-foreground transition-transform group-open:rotate-180" />
      </summary>
      {items.length === 0 ? (
        <p className="border-t border-border px-4 py-6 text-center text-sm text-muted-foreground">
          No market-moving stories right now.
        </p>
      ) : (
        <ul className="divide-y divide-border border-t border-border">
          {items.map((item) => (
            <li key={item.id}>
              <a href={item.url} target="_blank" rel="noopener noreferrer" className="block px-4 py-3 hover:bg-accent">
                <p className="text-sm font-medium leading-snug">{item.headline}</p>
                {item.overview && (
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{item.overview}</p>
                )}
                <p className="mt-1 text-xs text-muted-foreground/70">
                  {item.source} · {formatDate(item.publishedAt)}
                </p>
              </a>
            </li>
          ))}
        </ul>
      )}
    </details>
  );
}

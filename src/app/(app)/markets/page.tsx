import { PageHeader } from "@/components/page-header";
import { IndexCard } from "@/components/markets/index-card";
import { SectorHeatmap } from "@/components/markets/sector-heatmap";
import { MoversList } from "@/components/markets/movers-list";
import { MacroRow } from "@/components/markets/macro-row";
import { TopStories } from "@/components/markets/top-stories";
import { FadeIn } from "@/components/motion/fade-in";
import { marketData } from "@/lib/market-data";
import { getTopStoriesWithOverviews } from "@/lib/ai/top-stories";

export default async function MarketsPage() {
  const [overview, topStoryNews] = await Promise.all([marketData.getMarketOverview(), marketData.getTopStories()]);
  const topStories = await getTopStoriesWithOverviews(topStoryNews);

  return (
    <>
      <PageHeader title="Market Overview" />
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-5xl px-4 py-8">
          <h1 className="text-xl font-semibold tracking-tight">Market Overview</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Indices, sector performance, movers, and macro conditions at a glance — live data.
          </p>

          <p className="mt-8 text-xs font-medium uppercase tracking-wide text-muted-foreground">Indices</p>
          <FadeIn delay={0.03} className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {overview.indices.map((idx) => (
              <IndexCard key={idx.symbol} index={idx} />
            ))}
          </FadeIn>

          <p className="mt-8 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Crypto <span className="text-[10px] font-normal normal-case text-muted-foreground/70">· trades 24/7</span>
          </p>
          <FadeIn delay={0.03} className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {overview.crypto.map((c) => (
              <IndexCard key={c.symbol} index={c} />
            ))}
          </FadeIn>

          <p className="mt-8 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Sector performance
          </p>
          <FadeIn delay={0.05} className="mt-3">
            <SectorHeatmap sectors={overview.sectors} />
          </FadeIn>

          <p className="mt-8 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Movers
          </p>
          <FadeIn delay={0.1} className="mt-3 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <MoversList title="Top gainers" quotes={overview.gainers} />
            <MoversList title="Top losers" quotes={overview.losers} />
          </FadeIn>

          <p className="mt-8 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Macro
          </p>
          <FadeIn delay={0.15} className="mt-3">
            <MacroRow items={overview.macro} />
          </FadeIn>

          <FadeIn delay={0.18} className="mt-8">
            <TopStories items={topStories} />
          </FadeIn>
        </div>
      </div>
    </>
  );
}

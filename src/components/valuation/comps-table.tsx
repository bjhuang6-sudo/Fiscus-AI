import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCompactCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ComparableCompany } from "@/lib/market-data";

interface CompsTableProps {
  subject: ComparableCompany;
  peers: ComparableCompany[];
}

export function CompsTable({ subject, peers }: CompsTableProps) {
  const rows = [subject, ...peers];

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Company</TableHead>
            <TableHead className="text-right">Market cap</TableHead>
            <TableHead className="text-right">P/E</TableHead>
            <TableHead className="text-right">EV/Revenue</TableHead>
            <TableHead className="text-right">EV/EBITDA</TableHead>
            <TableHead className="text-right">Gross margin</TableHead>
            <TableHead className="text-right">Net margin</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow
              key={row.ticker}
              className={cn(row.ticker === subject.ticker && "bg-accent/60")}
            >
              <TableCell>
                <span className="font-medium">{row.ticker}</span>
                <span className="ml-2 text-xs text-muted-foreground">{row.companyName}</span>
              </TableCell>
              <TableCell className="num text-right">
                {formatCompactCurrency(row.marketCap)}
              </TableCell>
              <TableCell className="num text-right">
                {row.peRatio ? row.peRatio.toFixed(1) : "—"}
              </TableCell>
              <TableCell className="num text-right">
                {row.evToRevenue !== null ? `${row.evToRevenue.toFixed(1)}x` : "—"}
              </TableCell>
              <TableCell className="num text-right">
                {row.evToEbitda !== null ? `${row.evToEbitda.toFixed(1)}x` : "—"}
              </TableCell>
              <TableCell className="num text-right">
                {row.grossMargin ? `${(row.grossMargin * 100).toFixed(1)}%` : "—"}
              </TableCell>
              <TableCell className="num text-right">
                {row.netMargin ? `${(row.netMargin * 100).toFixed(1)}%` : "—"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {peers.length === 0 && (
        <p className="px-4 py-6 text-center text-sm text-muted-foreground">
          No comparable companies found for this ticker.
        </p>
      )}
    </div>
  );
}

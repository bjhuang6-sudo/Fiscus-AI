"use client";

import * as React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCompactCurrency } from "@/lib/format";
import { SourceLabel } from "@/components/research/source-label";
import type { FinancialStatements } from "@/lib/market-data";

function negate(v: number | null): number | null {
  return v === null ? null : -v;
}

function StatementTable({
  rows,
}: {
  rows: { label: string; values: (number | null)[]; emphasis?: boolean }[];
}) {
  return (
    <Table>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.label}>
            <TableCell className={row.emphasis ? "font-semibold" : "text-muted-foreground"}>
              {row.label}
            </TableCell>
            {row.values.map((v, i) => (
              <TableCell
                key={i}
                className={`num text-right ${row.emphasis ? "font-semibold" : ""}`}
              >
                {v !== null ? formatCompactCurrency(v) : "—"}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function StatementViewer({ statements }: { statements: FinancialStatements }) {
  const years = statements.incomeStatement.map((y) => y.fiscalYear);

  return (
    <div className="rounded-lg border border-border bg-card">
      <Tabs defaultValue="income">
        <div className="flex items-center justify-between border-b border-border px-4 py-2">
          <TabsList>
            <TabsTrigger value="income">Income statement</TabsTrigger>
            <TabsTrigger value="balance">Balance sheet</TabsTrigger>
            <TabsTrigger value="cashflow">Cash flow</TabsTrigger>
          </TabsList>
          <div className="flex gap-6 pr-2 text-xs text-muted-foreground">
            {years.map((y) => (
              <span key={y} className="num w-16 text-right">
                FY{y}
              </span>
            ))}
          </div>
        </div>

        <TabsContent value="income" className="px-2 pb-2">
          <StatementTable
            rows={[
              { label: "Revenue", values: statements.incomeStatement.map((y) => y.revenue), emphasis: true },
              { label: "Cost of revenue", values: statements.incomeStatement.map((y) => negate(y.costOfRevenue)) },
              { label: "Gross profit", values: statements.incomeStatement.map((y) => y.grossProfit) },
              { label: "Operating expenses", values: statements.incomeStatement.map((y) => negate(y.operatingExpenses)) },
              { label: "Operating income", values: statements.incomeStatement.map((y) => y.operatingIncome) },
              { label: "Net income", values: statements.incomeStatement.map((y) => y.netIncome), emphasis: true },
            ]}
          />
        </TabsContent>

        <TabsContent value="balance" className="px-2 pb-2">
          <StatementTable
            rows={[
              { label: "Cash & equivalents", values: statements.balanceSheet.map((y) => y.cashAndEquivalents) },
              { label: "Current assets", values: statements.balanceSheet.map((y) => y.currentAssets) },
              { label: "Total assets", values: statements.balanceSheet.map((y) => y.totalAssets), emphasis: true },
              { label: "Current liabilities", values: statements.balanceSheet.map((y) => y.currentLiabilities) },
              { label: "Total debt", values: statements.balanceSheet.map((y) => y.totalDebt) },
              { label: "Total liabilities", values: statements.balanceSheet.map((y) => y.totalLiabilities) },
              { label: "Total equity", values: statements.balanceSheet.map((y) => y.totalEquity), emphasis: true },
            ]}
          />
        </TabsContent>

        <TabsContent value="cashflow" className="px-2 pb-2">
          <StatementTable
            rows={[
              { label: "Operating cash flow", values: statements.cashFlow.map((y) => y.operatingCashFlow) },
              { label: "Capital expenditures", values: statements.cashFlow.map((y) => y.capitalExpenditures) },
              { label: "Free cash flow", values: statements.cashFlow.map((y) => y.freeCashFlow), emphasis: true },
              { label: "Financing cash flow", values: statements.cashFlow.map((y) => y.financingCashFlow) },
            ]}
          />
        </TabsContent>
      </Tabs>
      <div className="border-t border-border px-4 py-2">
        <SourceLabel>SEC EDGAR — XBRL company facts, annual (10-K) figures</SourceLabel>
      </div>
    </div>
  );
}

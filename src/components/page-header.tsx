import type { ReactNode } from "react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";

export function PageHeader({ title, actions }: { title: string; actions?: ReactNode }) {
  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border px-3">
      <SidebarTrigger />
      <Separator orientation="vertical" className="h-4" />
      <span className="flex-1 text-sm font-medium text-muted-foreground">{title}</span>
      {actions}
    </header>
  );
}

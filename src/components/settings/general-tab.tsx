"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

export function GeneralTab() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-medium">Appearance</h3>
      <div className="flex gap-2">
        <Button
          size="sm"
          variant={mounted && resolvedTheme === "dark" ? "default" : "outline"}
          onClick={() => setTheme("dark")}
        >
          Dark
        </Button>
        <Button
          size="sm"
          variant={mounted && resolvedTheme === "light" ? "default" : "outline"}
          onClick={() => setTheme("light")}
        >
          Light
        </Button>
      </div>
    </div>
  );
}

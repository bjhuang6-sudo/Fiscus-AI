import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export function AuthShell({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center gap-6 bg-background px-4 py-12">
      <Link href="/">
        <BrandMark />
      </Link>
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-lg">{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent className="flex flex-col gap-4">{children}</CardContent>
      </Card>
      {footer && <div className="text-sm text-muted-foreground">{footer}</div>}
    </div>
  );
}

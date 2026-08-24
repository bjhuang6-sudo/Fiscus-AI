import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ContactForm } from "@/components/contact-form";

export default function ContactPage() {
  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center gap-6 bg-background px-4 py-12">
      <Link href="/">
        <BrandMark />
      </Link>
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-lg">Contact us</CardTitle>
          <CardDescription>Questions, feedback, or issues — send us a message.</CardDescription>
        </CardHeader>
        <CardContent>
          <ContactForm />
        </CardContent>
      </Card>
    </div>
  );
}

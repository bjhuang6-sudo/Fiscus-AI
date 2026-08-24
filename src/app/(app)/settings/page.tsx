import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { PageHeader } from "@/components/page-header";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { AccountTab } from "@/components/settings/account-tab";
import { MemoryTab } from "@/components/settings/memory-tab";
import { PrivacyTab } from "@/components/settings/privacy-tab";
import { GeneralTab } from "@/components/settings/general-tab";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <>
      <PageHeader title="Settings" />
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl px-4 py-8">
          <h1 className="text-xl font-semibold tracking-tight">Settings</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Account, memory, privacy, and general preferences.
          </p>

          <Tabs defaultValue="account" className="mt-6">
            <TabsList>
              <TabsTrigger value="account">Account</TabsTrigger>
              <TabsTrigger value="memory">Memory</TabsTrigger>
              <TabsTrigger value="privacy">Privacy</TabsTrigger>
              <TabsTrigger value="general">General</TabsTrigger>
            </TabsList>
            <TabsContent value="account" className="mt-4">
              <AccountTab />
            </TabsContent>
            <TabsContent value="memory" className="mt-4">
              <MemoryTab />
            </TabsContent>
            <TabsContent value="privacy" className="mt-4">
              <PrivacyTab />
            </TabsContent>
            <TabsContent value="general" className="mt-4">
              <GeneralTab />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </>
  );
}

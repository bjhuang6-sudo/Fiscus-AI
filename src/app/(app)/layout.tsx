import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { ChatSidebar } from "@/components/chat/chat-sidebar";
import { ChatSessionsProvider } from "@/lib/chat/session-context";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ChatSessionsProvider>
      <SidebarProvider>
        <ChatSidebar />
        <SidebarInset>{children}</SidebarInset>
      </SidebarProvider>
    </ChatSessionsProvider>
  );
}

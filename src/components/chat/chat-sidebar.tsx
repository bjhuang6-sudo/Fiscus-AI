"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { Plus, LineChart, Wallet, Search, Gauge, MessageSquare, Mail, FolderPlus, Folder, ChevronRight, Trash2 } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { BrandMark } from "@/components/brand-mark";
import { ThemeToggle } from "@/components/theme-toggle";
import { AccountMenu } from "@/components/auth/account-menu";
import { ChatSessionMenu } from "@/components/chat/chat-session-menu";
import { CreateFolderDialog } from "@/components/chat/create-folder-dialog";
import { useChatSessions, type ChatSession } from "@/lib/chat/session-context";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { label: "Markets", icon: Gauge, href: "/markets" },
  { label: "Research", icon: Search, href: "/research" },
  { label: "Valuation", icon: LineChart, href: "/valuation" },
  { label: "Portfolio", icon: Wallet, href: "/portfolio" },
  { label: "Contact us", icon: Mail, href: "/contact" },
];

export function ChatSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { sessions, folders, activeSessionId, startNewChat, loadSession, deleteSession, moveToFolder, createFolder, deleteFolder } =
    useChatSessions();
  const [createFolderOpen, setCreateFolderOpen] = React.useState(false);
  const [collapsedFolders, setCollapsedFolders] = React.useState<Set<string>>(new Set());

  const handleNewChat = () => {
    startNewChat();
    if (pathname !== "/") router.push("/");
  };

  const handleNewChatInFolder = (folderId: string) => {
    startNewChat(folderId);
    setCollapsedFolders((prev) => {
      if (!prev.has(folderId)) return prev;
      const next = new Set(prev);
      next.delete(folderId);
      return next;
    });
    if (pathname !== "/") router.push("/");
  };

  const handleLoadSession = (id: string) => {
    loadSession(id);
    if (pathname !== "/") router.push("/");
  };

  const toggleFolder = (id: string) => {
    setCollapsedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const ungrouped = sessions.filter((s) => !s.folderId);

  const renderSession = (session: ChatSession) => (
    <SidebarMenuButton
      size="sm"
      isActive={pathname === "/" && session.id === activeSessionId}
      onClick={() => handleLoadSession(session.id)}
    >
      <MessageSquare />
      <span className="truncate">{session.title}</span>
    </SidebarMenuButton>
  );

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="gap-3 px-3 pt-3">
        <BrandMark className="px-1 group-data-[collapsible=icon]:hidden" />
        <Button
          variant="outline"
          className="w-full justify-start gap-2 group-data-[collapsible=icon]:justify-center"
          onClick={handleNewChat}
        >
          <Plus className="size-4" />
          <span className="group-data-[collapsible=icon]:hidden">New chat</span>
        </Button>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_ITEMS.map((item) => (
                <SidebarMenuItem key={item.label}>
                  <SidebarMenuButton
                    tooltip={item.label}
                    isActive={pathname === item.href || pathname?.startsWith(`${item.href}/`)}
                    render={<a href={item.href} />}
                  >
                    <item.icon />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup className="group-data-[collapsible=icon]:hidden">
          <SidebarGroupLabel>Recent</SidebarGroupLabel>
          <SidebarGroupAction aria-label="New folder" onClick={() => setCreateFolderOpen(true)}>
            <FolderPlus />
          </SidebarGroupAction>
          <SidebarGroupContent>
            {sessions.length === 0 && folders.length === 0 ? (
              <p className="px-2 py-1.5 text-xs text-muted-foreground">
                No conversations yet — start typing below.
              </p>
            ) : (
              <SidebarMenu>
                {folders.map((folder) => {
                  const folderSessions = sessions.filter((s) => s.folderId === folder.id);
                  const isCollapsed = collapsedFolders.has(folder.id);
                  return (
                    <SidebarMenuItem key={folder.id}>
                      <SidebarMenuButton size="sm" onClick={() => toggleFolder(folder.id)}>
                        <Folder />
                        <span className="truncate">{folder.name}</span>
                        <ChevronRight className={cn("ml-auto size-3.5 transition-transform", !isCollapsed && "rotate-90")} />
                      </SidebarMenuButton>
                      <SidebarMenuAction
                        showOnHover
                        className="right-7"
                        aria-label={`New chat in ${folder.name}`}
                        onClick={() => handleNewChatInFolder(folder.id)}
                      >
                        <Plus />
                      </SidebarMenuAction>
                      <SidebarMenuAction
                        showOnHover
                        aria-label={`Delete folder ${folder.name}`}
                        onClick={() => deleteFolder(folder.id)}
                      >
                        <Trash2 />
                      </SidebarMenuAction>
                      {!isCollapsed && folderSessions.length > 0 && (
                        <SidebarMenuSub>
                          {folderSessions.map((session) => (
                            <SidebarMenuSubItem key={session.id} className="group/menu-item">
                              <SidebarMenuSubButton
                                render={<button type="button" />}
                                isActive={pathname === "/" && session.id === activeSessionId}
                                onClick={() => handleLoadSession(session.id)}
                              >
                                <MessageSquare className="size-3.5" />
                                <span className="truncate">{session.title}</span>
                              </SidebarMenuSubButton>
                              <ChatSessionMenu
                                folders={folders}
                                currentFolderId={session.folderId}
                                onMove={(folderId) => moveToFolder(session.id, folderId)}
                                onDelete={() => deleteSession(session.id)}
                              />
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      )}
                    </SidebarMenuItem>
                  );
                })}
                {ungrouped.map((session) => (
                  <SidebarMenuItem key={session.id} className="group/menu-item">
                    {renderSession(session)}
                    <ChatSessionMenu
                      folders={folders}
                      currentFolderId={session.folderId}
                      onMove={(folderId) => moveToFolder(session.id, folderId)}
                      onDelete={() => deleteSession(session.id)}
                    />
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            )}
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="gap-2 px-3 pb-3">
        <div className="flex items-center justify-between gap-2 group-data-[collapsible=icon]:flex-col">
          <AccountMenu />
          <ThemeToggle />
        </div>
      </SidebarFooter>
      <CreateFolderDialog open={createFolderOpen} onOpenChange={setCreateFolderOpen} onCreate={createFolder} />
    </Sidebar>
  );
}

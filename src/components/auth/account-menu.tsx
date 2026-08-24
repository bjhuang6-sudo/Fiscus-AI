"use client";

import { useSession, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { clearGuestChatStorage } from "@/lib/chat/session-context";
import { clearGuestPortfolioStorage } from "@/lib/portfolio/use-portfolio";

/** Wipes any pre-login guest browsing data before signing out, so it doesn't
 * resurface as "your" chats/portfolio the next time this browser is used
 * without an account. */
function handleSignOut() {
  clearGuestChatStorage();
  clearGuestPortfolioStorage();
  signOut({ redirectTo: "/" });
}

function initials(name: string | null | undefined, email: string | null | undefined): string {
  const source = name?.trim() || email || "?";
  return source.slice(0, 2).toUpperCase();
}

export function AccountMenu() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return <span className="text-xs text-muted-foreground">…</span>;
  }

  if (!session?.user) {
    return (
      <div className="flex w-full items-center gap-1.5 group-data-[collapsible=icon]:flex-col">
        <Button size="sm" variant="outline" className="flex-1" nativeButton={false} render={<a href="/login" />}>
          Log in
        </Button>
        <Button size="sm" className="flex-1" nativeButton={false} render={<a href="/signup" />}>
          Sign up
        </Button>
      </div>
    );
  }

  const { name, email, image } = session.user;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex w-full items-center gap-2 rounded-lg px-1 py-1 text-left outline-none hover:bg-muted group-data-[collapsible=icon]:justify-center">
        <Avatar size="sm">
          <AvatarImage src={image ?? undefined} alt={name ?? email ?? "Account"} />
          <AvatarFallback>{initials(name, email)}</AvatarFallback>
        </Avatar>
        <span className="truncate text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
          {email}
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" side="top">
        <DropdownMenuGroup>
          <DropdownMenuLabel>{name ?? email}</DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<a href="/settings" />}>Settings</DropdownMenuItem>
        <DropdownMenuItem onClick={handleSignOut}>Log out</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

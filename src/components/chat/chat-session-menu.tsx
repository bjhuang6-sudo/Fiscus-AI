"use client";

import { MoreHorizontal, Trash2, FolderInput, FolderMinus } from "lucide-react";
import { SidebarMenuAction } from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ChatFolder } from "@/lib/chat/session-context";

export function ChatSessionMenu({
  folders,
  currentFolderId,
  onMove,
  onDelete,
}: {
  folders: ChatFolder[];
  currentFolderId: string | null;
  onMove: (folderId: string | null) => void;
  onDelete: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<SidebarMenuAction showOnHover aria-label="Chat options" />}>
        <MoreHorizontal />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" side="right">
        {folders.length > 0 && (
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <FolderInput />
              Move to folder
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              {folders.map((f) => (
                <DropdownMenuItem key={f.id} disabled={f.id === currentFolderId} onClick={() => onMove(f.id)}>
                  {f.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        )}
        {currentFolderId && (
          <DropdownMenuItem onClick={() => onMove(null)}>
            <FolderMinus />
            Remove from folder
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={onDelete}>
          <Trash2 />
          Delete chat
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

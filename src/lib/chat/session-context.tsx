"use client";

import * as React from "react";
import { useSession } from "next-auth/react";
import type { ChatMessage } from "@/lib/types";

export interface ChatSession {
  id: string;
  title: string;
  folderId: string | null;
  messages: ChatMessage[];
  updatedAt: number;
}

export interface ChatFolder {
  id: string;
  name: string;
}

const SESSIONS_STORAGE_KEY = "fiscus-chat-sessions-v1";
const FOLDERS_STORAGE_KEY = "fiscus-chat-folders-v1";
const MAX_SESSIONS = 30;
const JSON_HEADERS = { "Content-Type": "application/json" };

function loadFromStorage<T>(key: string): T[] {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveSessionsToStorage(sessions: ChatSession[]) {
  try {
    window.localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(sessions.slice(0, MAX_SESSIONS)));
  } catch {
    // storage full or unavailable — sessions just won't persist, not fatal
  }
}

function saveFoldersToStorage(folders: ChatFolder[]) {
  try {
    window.localStorage.setItem(FOLDERS_STORAGE_KEY, JSON.stringify(folders));
  } catch {
    // ignore
  }
}

/** Clears the guest-mode local cache — called on sign-out so a stale
 * pre-login browsing session doesn't resurface after logging out. */
export function clearGuestChatStorage() {
  try {
    window.localStorage.removeItem(SESSIONS_STORAGE_KEY);
    window.localStorage.removeItem(FOLDERS_STORAGE_KEY);
  } catch {
    // ignore
  }
}

async function generateTitle(firstMessage: string): Promise<string> {
  try {
    const res = await fetch("/api/chat/title", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ message: firstMessage }),
    });
    if (res.ok) {
      const data = await res.json();
      if (typeof data?.title === "string" && data.title.trim()) return data.title.trim();
    }
  } catch {
    // fall through to local fallback
  }
  const trimmed = firstMessage.trim().replace(/\s+/g, " ");
  return trimmed.length > 40 ? `${trimmed.slice(0, 40)}…` : trimmed;
}

async function fetchRemoteSessions(): Promise<ChatSession[]> {
  const res = await fetch("/api/chat-sessions");
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data?.sessions) ? data.sessions : [];
}

async function fetchRemoteFolders(): Promise<ChatFolder[]> {
  const res = await fetch("/api/chat-folders");
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data?.folders) ? data.folders : [];
}

async function createRemoteSession(title: string, messages: ChatMessage[], folderId: string | null): Promise<string> {
  const res = await fetch("/api/chat-sessions", {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify({ title, messages, folderId }),
  });
  const data = await res.json();
  return data.id as string;
}

function updateRemoteSession(id: string, body: { title?: string; messages?: ChatMessage[]; folderId?: string | null }) {
  fetch(`/api/chat-sessions/${id}`, { method: "PUT", headers: JSON_HEADERS, body: JSON.stringify(body) }).catch(
    () => {}
  );
}

function deleteRemoteSession(id: string) {
  fetch(`/api/chat-sessions/${id}`, { method: "DELETE" }).catch(() => {});
}

async function createRemoteFolder(name: string): Promise<string> {
  const res = await fetch("/api/chat-folders", { method: "POST", headers: JSON_HEADERS, body: JSON.stringify({ name }) });
  const data = await res.json();
  return data.id as string;
}

function deleteRemoteFolder(id: string) {
  fetch(`/api/chat-folders/${id}`, { method: "DELETE" }).catch(() => {});
}

/** Fire-and-forget — refreshes the user's cross-session memory every couple of
 * exchanges rather than every turn, to keep it off the AI provider's tight
 * per-minute token budget. */
function maybeCompileMemory(messages: ChatMessage[]) {
  const last = messages[messages.length - 1];
  if (last?.role !== "assistant" || messages.length % 4 !== 0) return;
  fetch("/api/memory/compile", { method: "POST" }).catch(() => {});
}

interface ChatSessionsContextValue {
  sessions: ChatSession[];
  folders: ChatFolder[];
  activeSessionId: string | null;
  activeMessages: ChatMessage[];
  setActiveMessages: (update: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])) => void;
  startNewChat: (folderId?: string | null) => void;
  loadSession: (id: string) => void;
  deleteSession: (id: string) => void;
  moveToFolder: (sessionId: string, folderId: string | null) => void;
  createFolder: (name: string) => void;
  deleteFolder: (id: string) => void;
}

const ChatSessionsContext = React.createContext<ChatSessionsContextValue | null>(null);

export function ChatSessionsProvider({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const isAuthed = status === "authenticated";
  const isAuthedRef = React.useRef(isAuthed);
  React.useEffect(() => {
    isAuthedRef.current = isAuthed;
  }, [isAuthed]);

  const [sessions, setSessions] = React.useState<ChatSession[]>([]);
  const [folders, setFolders] = React.useState<ChatFolder[]>([]);
  const [activeSessionId, setActiveSessionId] = React.useState<string | null>(null);
  const [activeMessages, setActiveMessagesState] = React.useState<ChatMessage[]>([]);
  const [loaded, setLoaded] = React.useState(false);
  // Kept in sync imperatively at every call site that also calls
  // setActiveSessionId (persist, startNewChat, loadSession, deleteSession,
  // the bootstrap effect) — not mirrored here, which would mutate a ref
  // during render.
  const activeSessionIdRef = React.useRef<string | null>(null);
  const creatingRef = React.useRef<Promise<string> | null>(null);
  // Set by startNewChat(folderId) and consumed once by persist() when the
  // very next message creates a brand-new session — lets "+ new chat" on a
  // folder land the chat there instead of unfiled.
  const pendingFolderIdRef = React.useRef<string | null>(null);

  // Re-bootstraps whenever auth state settles or changes — guests read from
  // localStorage, signed-in users read from the DB. Switching sign-in state
  // mid-session just swaps the source; it doesn't merge the two.
  React.useEffect(() => {
    if (status === "loading") return;
    setLoaded(false);
    activeSessionIdRef.current = null;
    setActiveSessionId(null);
    setActiveMessagesState([]);

    if (status === "authenticated") {
      Promise.all([fetchRemoteSessions(), fetchRemoteFolders()]).then(([remoteSessions, remoteFolders]) => {
        setSessions(remoteSessions);
        setFolders(remoteFolders);
        setLoaded(true);
      });
    } else {
      setSessions(loadFromStorage<ChatSession>(SESSIONS_STORAGE_KEY));
      setFolders(loadFromStorage<ChatFolder>(FOLDERS_STORAGE_KEY));
      setLoaded(true);
    }
  }, [status]);

  React.useEffect(() => {
    if (!loaded || isAuthed) return;
    saveSessionsToStorage(sessions);
  }, [sessions, loaded, isAuthed]);

  React.useEffect(() => {
    if (!loaded || isAuthed) return;
    saveFoldersToStorage(folders);
  }, [folders, loaded, isAuthed]);

  const persist = React.useCallback((messages: ChatMessage[]) => {
    if (messages.length === 0) return;

    const currentId = activeSessionIdRef.current;
    if (currentId) {
      setSessions((prev) => {
        const existing = prev.find((s) => s.id === currentId);
        const updated: ChatSession = {
          id: currentId,
          title: existing?.title ?? "New chat",
          folderId: existing?.folderId ?? null,
          messages,
          updatedAt: Date.now(),
        };
        return [updated, ...prev.filter((s) => s.id !== currentId)];
      });
      if (isAuthedRef.current) {
        updateRemoteSession(currentId, { messages });
        maybeCompileMemory(messages);
      }
      return;
    }

    const firstUserMessage = messages.find((m) => m.role === "user")?.content ?? "New chat";
    const placeholderTitle =
      firstUserMessage.length > 40 ? `${firstUserMessage.slice(0, 40)}…` : firstUserMessage;
    // Consumed once — the folder targeting only applies to this one new
    // session, not every subsequent "new chat" after it.
    const targetFolderId = pendingFolderIdRef.current;
    pendingFolderIdRef.current = null;

    if (!isAuthedRef.current) {
      const id = crypto.randomUUID();
      const placeholder: ChatSession = {
        id,
        title: placeholderTitle,
        folderId: targetFolderId,
        messages,
        updatedAt: Date.now(),
      };
      activeSessionIdRef.current = id;
      setActiveSessionId(id);
      setSessions((prev) => [placeholder, ...prev]);
      generateTitle(firstUserMessage).then((title) => {
        setSessions((prev) => prev.map((s) => (s.id === id ? { ...s, title } : s)));
      });
      return;
    }

    // Signed in: reuse an in-flight creation if a later call (e.g. the
    // assistant's reply) lands before the session finished being created,
    // instead of dropping it or creating a duplicate session.
    const isFirstCaller = !creatingRef.current;
    const creation = creatingRef.current ?? createRemoteSession(placeholderTitle, messages, targetFolderId);
    creatingRef.current = creation;

    creation.then((id) => {
      creatingRef.current = null;
      activeSessionIdRef.current = id;
      setActiveSessionId(id);

      if (isFirstCaller) {
        setSessions((prev) => [
          { id, title: placeholderTitle, folderId: targetFolderId, messages, updatedAt: Date.now() },
          ...prev,
        ]);
        generateTitle(firstUserMessage).then((title) => {
          setSessions((prev) => prev.map((s) => (s.id === id ? { ...s, title } : s)));
          updateRemoteSession(id, { title });
        });
      } else {
        setSessions((prev) => {
          const existing = prev.find((s) => s.id === id);
          const updated: ChatSession = {
            id,
            title: existing?.title ?? placeholderTitle,
            folderId: existing?.folderId ?? targetFolderId,
            messages,
            updatedAt: Date.now(),
          };
          return [updated, ...prev.filter((s) => s.id !== id)];
        });
        updateRemoteSession(id, { messages });
      }
      maybeCompileMemory(messages);
    });
  }, []);

  const setActiveMessages = React.useCallback(
    (update: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])) => {
      setActiveMessagesState((prev) => {
        const next = typeof update === "function" ? update(prev) : update;
        persist(next);
        return next;
      });
    },
    [persist]
  );

  const startNewChat = React.useCallback((folderId: string | null = null) => {
    activeSessionIdRef.current = null;
    pendingFolderIdRef.current = folderId;
    setActiveSessionId(null);
    setActiveMessagesState([]);
  }, []);

  const loadSession = React.useCallback(
    (id: string) => {
      const session = sessions.find((s) => s.id === id);
      if (!session) return;
      activeSessionIdRef.current = id;
      setActiveSessionId(id);
      setActiveMessagesState(session.messages);
    },
    [sessions]
  );

  const deleteSession = React.useCallback((id: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== id));
    if (activeSessionIdRef.current === id) {
      activeSessionIdRef.current = null;
      setActiveSessionId(null);
      setActiveMessagesState([]);
    }
    if (isAuthedRef.current) deleteRemoteSession(id);
  }, []);

  const moveToFolder = React.useCallback((sessionId: string, folderId: string | null) => {
    setSessions((prev) => prev.map((s) => (s.id === sessionId ? { ...s, folderId } : s)));
    if (isAuthedRef.current) updateRemoteSession(sessionId, { folderId });
  }, []);

  const createFolder = React.useCallback((name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;

    if (!isAuthedRef.current) {
      setFolders((prev) => [...prev, { id: crypto.randomUUID(), name: trimmed }]);
      return;
    }
    createRemoteFolder(trimmed).then((id) => {
      setFolders((prev) => [...prev, { id, name: trimmed }]);
    });
  }, []);

  const deleteFolder = React.useCallback((id: string) => {
    setFolders((prev) => prev.filter((f) => f.id !== id));
    setSessions((prev) => prev.map((s) => (s.folderId === id ? { ...s, folderId: null } : s)));
    if (isAuthedRef.current) deleteRemoteFolder(id);
  }, []);

  return (
    <ChatSessionsContext.Provider
      value={{
        sessions,
        folders,
        activeSessionId,
        activeMessages,
        setActiveMessages,
        startNewChat,
        loadSession,
        deleteSession,
        moveToFolder,
        createFolder,
        deleteFolder,
      }}
    >
      {children}
    </ChatSessionsContext.Provider>
  );
}

export function useChatSessions(): ChatSessionsContextValue {
  const ctx = React.useContext(ChatSessionsContext);
  if (!ctx) throw new Error("useChatSessions must be used within a ChatSessionsProvider");
  return ctx;
}

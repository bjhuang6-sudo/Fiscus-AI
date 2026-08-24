"use client";

import * as React from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/auth/form-field";

export function AccountTab() {
  const { data: session, update } = useSession();
  const [name, setName] = React.useState(session?.user?.name ?? "");
  const [nameStatus, setNameStatus] = React.useState<string | null>(null);
  const [namePending, setNamePending] = React.useState(false);

  const [currentPassword, setCurrentPassword] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [passwordStatus, setPasswordStatus] = React.useState<string | null>(null);
  const [passwordPending, setPasswordPending] = React.useState(false);

  const hasPassword = Boolean(session?.user?.hasPassword);

  async function handleNameSubmit(e: React.FormEvent) {
    e.preventDefault();
    setNamePending(true);
    setNameStatus(null);
    const res = await fetch("/api/account", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const data = await res.json();
    setNamePending(false);
    if (!res.ok) {
      setNameStatus(data.error ?? "Something went wrong.");
      return;
    }
    setNameStatus("Saved.");
    update({ name });
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPasswordPending(true);
    setPasswordStatus(null);
    const res = await fetch("/api/account/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const data = await res.json();
    setPasswordPending(false);
    if (!res.ok) {
      setPasswordStatus(data.error ?? "Something went wrong.");
      return;
    }
    setPasswordStatus("Password updated.");
    setCurrentPassword("");
    setNewPassword("");
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h3 className="text-sm font-medium">Profile</h3>
        <p className="mt-1 text-xs text-muted-foreground">{session?.user?.email}</p>
        <form onSubmit={handleNameSubmit} className="mt-3 flex max-w-sm flex-col gap-3">
          <FormField label="Name" value={name} onChange={(e) => setName(e.target.value)} />
          {nameStatus && <p className="text-xs text-muted-foreground">{nameStatus}</p>}
          <Button type="submit" size="sm" className="self-start" disabled={namePending}>
            {namePending ? "Saving…" : "Save name"}
          </Button>
        </form>
      </div>

      {hasPassword && (
        <div>
          <h3 className="text-sm font-medium">Password</h3>
          <form onSubmit={handlePasswordSubmit} className="mt-3 flex max-w-sm flex-col gap-3">
            <FormField
              label="Current password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
            <FormField
              label="New password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            {passwordStatus && <p className="text-xs text-muted-foreground">{passwordStatus}</p>}
            <Button type="submit" size="sm" className="self-start" disabled={passwordPending}>
              {passwordPending ? "Updating…" : "Update password"}
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}

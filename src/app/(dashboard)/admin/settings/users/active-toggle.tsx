"use client";

import * as React from "react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { setUserActiveAction } from "./actions";

export function ActiveToggle({ userId, isActive }: { userId: string; isActive: boolean }) {
  const [checked, setChecked] = React.useState(isActive);
  const [pending, setPending] = React.useState(false);

  async function handleChange(value: boolean) {
    setPending(true);
    setChecked(value);
    try {
      await setUserActiveAction(userId, value);
      toast.success(value ? "User activated" : "User deactivated");
    } catch {
      setChecked(!value);
      toast.error("Could not update user.");
    } finally {
      setPending(false);
    }
  }

  return <Switch checked={checked} onCheckedChange={handleChange} disabled={pending} />;
}

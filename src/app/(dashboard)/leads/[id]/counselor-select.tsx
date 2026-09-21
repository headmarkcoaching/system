"use client";

import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { assignLeadCounselorAction } from "../actions";

export function CounselorSelect({
  leadId,
  assignedCounselorId,
  counselors,
}: {
  leadId: string;
  assignedCounselorId: string | null;
  counselors: { id: string; fullName: string }[];
}) {
  async function handleChange(value: string) {
    try {
      await assignLeadCounselorAction(leadId, value);
      toast.success(value === "unassigned" ? "Counselor unassigned" : "Counselor assigned");
    } catch {
      toast.error("Could not update counselor.");
    }
  }

  return (
    <Select defaultValue={assignedCounselorId ?? "unassigned"} onValueChange={handleChange}>
      <SelectTrigger className="h-8 w-[180px] text-sm">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="unassigned">Unassigned</SelectItem>
        {counselors.map((c) => (
          <SelectItem key={c.id} value={c.id}>
            {c.fullName}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

"use client";

import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updateTestStatusAction } from "@/app/(dashboard)/tests/actions";

type TestStatus = "DRAFT" | "SCHEDULED" | "ACTIVE" | "COMPLETED" | "ARCHIVED";

export function TestStatusSelect({ testId, status }: { testId: string; status: TestStatus }) {
  async function handleChange(value: string) {
    try {
      await updateTestStatusAction(testId, value as TestStatus);
      toast.success("Status updated");
    } catch {
      toast.error("Could not update status.");
    }
  }

  return (
    <Select defaultValue={status} onValueChange={handleChange}>
      <SelectTrigger className="w-[140px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="DRAFT">Draft</SelectItem>
        <SelectItem value="SCHEDULED">Scheduled</SelectItem>
        <SelectItem value="ACTIVE">Active</SelectItem>
        <SelectItem value="COMPLETED">Completed</SelectItem>
        <SelectItem value="ARCHIVED">Archived</SelectItem>
      </SelectContent>
    </Select>
  );
}

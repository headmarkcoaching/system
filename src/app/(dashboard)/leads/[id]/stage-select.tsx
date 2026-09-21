"use client";

import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { changeLeadStageAction } from "../actions";

const STAGES = [
  { value: "NEW", label: "New" },
  { value: "CONTACTED", label: "Contacted" },
  { value: "ASSESSMENT_BOOKED", label: "Assessment Booked" },
  { value: "ASSESSMENT_COMPLETED", label: "Assessment Completed" },
  { value: "FREE_TRIAL", label: "Free Trial" },
  { value: "COUNSELLING", label: "Counselling" },
  { value: "PAYMENT_PENDING", label: "Payment Pending" },
  { value: "ENROLLED", label: "Enrolled" },
  { value: "LOST", label: "Lost" },
];

export function StageSelect({ leadId, stage }: { leadId: string; stage: string }) {
  async function handleChange(value: string) {
    try {
      await changeLeadStageAction(leadId, value);
      toast.success("Stage updated");
    } catch {
      toast.error("Could not update stage.");
    }
  }

  return (
    <Select defaultValue={stage} onValueChange={handleChange}>
      <SelectTrigger className="w-[180px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {STAGES.map((s) => (
          <SelectItem key={s.value} value={s.value}>
            {s.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

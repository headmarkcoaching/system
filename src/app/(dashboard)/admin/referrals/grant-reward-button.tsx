"use client";

import { Button } from "@/components/ui/button";
import { EntityDialog, type FieldDef } from "@/components/shared/entity-dialog";
import { grantReferralRewardAction } from "./actions";

const REWARD_OPTIONS = [
  { value: "DISCOUNT", label: "Discount" },
  { value: "FREE_MONTH", label: "Free Month" },
  { value: "BONUS_CLASS", label: "Bonus Class" },
  { value: "POINTS", label: "Points (awarded to referring student)" },
  { value: "OTHER", label: "Other" },
];

const fields: FieldDef[] = [
  { type: "select", name: "rewardType", label: "Reward Type", required: true, options: REWARD_OPTIONS },
  { type: "text", name: "description", label: "Description", placeholder: "e.g. 20% off next month's fee" },
  { type: "number", name: "value", label: "Value (Rs. amount or points)" },
];

export function GrantRewardButton({ referralId }: { referralId: string }) {
  return (
    <EntityDialog
      trigger={
        <Button variant="outline" size="sm" onClick={(e) => e.stopPropagation()}>
          Grant Reward
        </Button>
      }
      title="Grant Referral Reward"
      fields={fields}
      onSubmit={(data) => grantReferralRewardAction(referralId, data)}
    />
  );
}

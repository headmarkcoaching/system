"use server";

import { requireRoleSession } from "@/lib/session";
import { STAFF_ROLES } from "@/lib/permissions";
import { getPaymentProvider } from "@/lib/payments";

export async function testPaymentProviderConnectionAction() {
  await requireRoleSession(STAFF_ROLES);
  const provider = getPaymentProvider();
  return provider.initiate({ amount: 100, currency: "PKR", studentId: "test" });
}

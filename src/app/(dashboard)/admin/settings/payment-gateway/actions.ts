"use server";

import { requireRoleSession } from "@/lib/session";
import { SUPER_ADMIN_ONLY } from "@/lib/permissions";
import { getPaymentProvider } from "@/lib/payments";

export async function testPaymentProviderConnectionAction() {
  await requireRoleSession(SUPER_ADMIN_ONLY);
  const provider = getPaymentProvider();
  return provider.initiate({ amount: 100, currency: "PKR", studentId: "test" });
}

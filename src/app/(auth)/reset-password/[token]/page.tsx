import * as passwordResetService from "@/lib/services/password-reset";
import { ResetPasswordForm } from "./reset-password-form";

export default async function ResetPasswordPage({ params }: { params: { token: string } }) {
  const record = await passwordResetService.verifyResetToken(params.token);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4 py-10">
      <ResetPasswordForm token={params.token} tokenValid={!!record} />
    </div>
  );
}

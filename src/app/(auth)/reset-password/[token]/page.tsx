import * as passwordResetService from "@/lib/services/password-reset";
import { ResetPasswordForm } from "./reset-password-form";

export default async function ResetPasswordPage(props: { params: Promise<{ token: string }> }) {
  const params = await props.params;
  const record = await passwordResetService.verifyResetToken(params.token);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4 py-10">
      <ResetPasswordForm token={params.token} tokenValid={!!record} />
    </div>
  );
}

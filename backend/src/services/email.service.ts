import { Resend } from 'resend';

// Resend client — initialized lazily so tests can run without RESEND_API_KEY
function getResend(): Resend {
  return new Resend(process.env.RESEND_API_KEY);
}

const FROM_ADDRESS = process.env.EMAIL_FROM ?? 'Receipts Tracker <noreply@yourdomain.com>';
const APP_URL = process.env.APP_URL ?? 'http://localhost:4001';

/**
 * Send invitation email to a new team member.
 * rawToken is the plain token (64-char hex) — embedded in the URL.
 * The recipient clicks the link, lands on /accept-invite?token=<rawToken>.
 */
export async function sendInviteEmail({
  to,
  rawToken,
  invitedByName,
  companyName,
  role,
}: {
  to: string;
  rawToken: string;
  invitedByName: string;
  companyName: string;
  role: string;
}): Promise<void> {
  const inviteUrl = `${APP_URL}/accept-invite?token=${rawToken}`;
  const { error } = await getResend().emails.send({
    from: FROM_ADDRESS,
    to: [to],
    subject: `You have been invited to ${companyName}`,
    html: `
      <p>Hello,</p>
      <p><strong>${invitedByName}</strong> has invited you to join <strong>${companyName}</strong> as a <strong>${role}</strong>.</p>
      <p><a href="${inviteUrl}">Accept Invitation</a></p>
      <p>This link expires in 48 hours.</p>
      <p>If you did not expect this invitation, you can safely ignore this email.</p>
    `,
  });
  if (error) {
    throw new Error(`Email send failed: ${(error as any).message}`);
  }
}

/**
 * Send password reset email.
 * rawToken is the plain token (64-char hex) — embedded in the URL.
 * The recipient clicks the link, lands on /reset-password?token=<rawToken>.
 */
export async function sendPasswordResetEmail({
  to,
  rawToken,
}: {
  to: string;
  rawToken: string;
}): Promise<void> {
  const resetUrl = `${APP_URL}/reset-password?token=${rawToken}`;
  const { error } = await getResend().emails.send({
    from: FROM_ADDRESS,
    to: [to],
    subject: 'Reset your password',
    html: `
      <p>Hello,</p>
      <p>You requested a password reset. Click the link below to set a new password:</p>
      <p><a href="${resetUrl}">Reset Password</a></p>
      <p>This link expires in 1 hour.</p>
      <p>If you did not request a password reset, you can safely ignore this email.</p>
    `,
  });
  if (error) {
    throw new Error(`Email send failed: ${(error as any).message}`);
  }
}

/**
 * Email service — sends transactional emails via Resend.
 *
 * Free tier: 3,000 emails/month, no credit card required.
 * Docs: https://resend.com/docs
 */
const { Resend } = require('resend');
const env = require('../config/env');

const resend = new Resend(env.RESEND_API_KEY);

// Sender address — use your verified domain, or Resend's onboarding address for testing
const FROM_ADDRESS = env.EMAIL_FROM || 'AMK Steels <onboarding@resend.dev>';

/**
 * Send a password-reset email with a clickable link.
 */
async function sendPasswordResetEmail({ to, resetToken, userName }) {
  const resetUrl = `${env.FRONTEND_URL}/reset-password?token=${resetToken}`;

  const { data, error } = await resend.emails.send({
    from: FROM_ADDRESS,
    to: [to],
    subject: 'Reset your AMK Steels password',
    html: passwordResetTemplate({ resetUrl, userName }),
  });

  if (error) {
    console.error('📧 Email send failed:', error);
    throw new Error(`Failed to send email: ${error.message}`);
  }

  console.log(`📧 Password reset email sent to ${to} (id: ${data?.id})`);
  return data;
}

// ── HTML Template ───────────────────────────────────────────────────────

function passwordResetTemplate({ resetUrl, userName }) {
  const name = userName || 'there';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Reset your password</title>
</head>
<body style="margin:0; padding:0; background-color:#f0f2f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
    <tr>
      <td align="center" style="padding: 40px 16px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:520px; background:#ffffff; border-radius:12px; overflow:hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.08);">
          
          <!-- Header -->
          <tr>
            <td style="background-color:#1a2b4a; padding:28px 32px; text-align:center;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 auto;">
                <tr>
                  <td style="background-color:#2563eb; border-radius:8px; width:40px; height:40px; text-align:center; vertical-align:middle;">
                    <span style="color:#ffffff; font-family:monospace; font-weight:bold; font-size:14px;">AMK</span>
                  </td>
                  <td style="padding-left:12px;">
                    <span style="color:#ffffff; font-family:monospace; font-size:20px; font-weight:600; letter-spacing:-0.5px;">AMK Steels</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <h1 style="margin:0 0 8px 0; font-size:22px; font-weight:700; color:#1a1a1a;">Reset your password</h1>
              <p style="margin:0 0 24px 0; font-size:15px; line-height:1.6; color:#555555;">
                Hi ${name}, we received a request to reset the password for your AMK Steels account. Click the button below to set a new password.
              </p>

              <!-- CTA Button -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 auto 24px auto;">
                <tr>
                  <td style="border-radius:8px; background-color:#e65100;">
                    <a href="${resetUrl}" target="_blank" style="display:inline-block; padding:14px 32px; font-size:15px; font-weight:600; color:#ffffff; text-decoration:none; border-radius:8px;">
                      Reset password
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 16px 0; font-size:13px; line-height:1.6; color:#888888;">
                This link will expire in <strong style="color:#555;">1 hour</strong>. If you didn't request a password reset, you can safely ignore this email — your password won't be changed.
              </p>

              <!-- Fallback URL -->
              <div style="background-color:#f7f8fa; border-radius:8px; padding:14px 16px; margin-top:20px;">
                <p style="margin:0 0 6px 0; font-size:12px; color:#888888; font-weight:600; text-transform:uppercase; letter-spacing:0.5px;">Or copy this link:</p>
                <p style="margin:0; font-size:13px; color:#2563eb; word-break:break-all;">
                  <a href="${resetUrl}" style="color:#2563eb; text-decoration:none;">${resetUrl}</a>
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px; border-top:1px solid #eee; text-align:center;">
              <p style="margin:0; font-size:12px; color:#aaaaaa; line-height:1.6;">
                AMK Steels · Mill-direct structural steel<br/>
                This is an automated email. Please do not reply.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

module.exports = {
  sendPasswordResetEmail,
};

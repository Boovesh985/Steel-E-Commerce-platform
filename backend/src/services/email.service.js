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

/**
 * Send an order receipt / billing invoice email after successful payment.
 */
async function sendOrderReceiptEmail({ to, userName, order }) {
  const { data, error } = await resend.emails.send({
    from: FROM_ADDRESS,
    to: [to],
    subject: `Order Confirmed — ${order.orderNumber} | AMK Steels`,
    html: orderReceiptTemplate({ userName, order }),
  });

  if (error) {
    console.error('📧 Receipt email send failed:', error);
    // Don't throw — payment is already confirmed, receipt failure shouldn't block
    return null;
  }

  console.log(`📧 Order receipt sent to ${to} (id: ${data?.id})`);
  return data;
}

// ── Order Receipt HTML Template ─────────────────────────────────────────

function orderReceiptTemplate({ userName, order }) {
  const name = userName || 'Customer';
  const addr = order.shippingAddress || {};
  const addressStr = [addr.line1, addr.line2, addr.city, addr.state, addr.pincode].filter(Boolean).join(', ');
  const orderDate = new Date(order.createdAt).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
  const orderUrl = `${env.FRONTEND_URL}/orders/${order.id}`;

  const formatCurrency = (val) => Number(val).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // Build items rows
  const itemRows = (order.items || []).map((item) => `
    <tr>
      <td style="padding:10px 12px; border-bottom:1px solid #eee; font-size:14px; color:#333;">${item.productName}</td>
      <td style="padding:10px 12px; border-bottom:1px solid #eee; font-size:14px; color:#555; text-align:center;">${item.quantity}</td>
      <td style="padding:10px 12px; border-bottom:1px solid #eee; font-size:14px; color:#555; text-align:right; font-family:monospace;">₹${formatCurrency(item.unitPrice)}</td>
      <td style="padding:10px 12px; border-bottom:1px solid #eee; font-size:14px; color:#333; text-align:right; font-family:monospace; font-weight:600;">₹${formatCurrency(item.subtotal)}</td>
    </tr>
  `).join('');

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Order Receipt — ${order.orderNumber}</title>
</head>
<body style="margin:0; padding:0; background-color:#f0f2f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
    <tr>
      <td align="center" style="padding: 40px 16px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:600px; background:#ffffff; border-radius:12px; overflow:hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background-color:#1a2b4a; padding:28px 32px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td>
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td style="background-color:#2563eb; border-radius:8px; width:40px; height:40px; text-align:center; vertical-align:middle;">
                          <span style="color:#ffffff; font-family:monospace; font-weight:bold; font-size:14px;">AMK</span>
                        </td>
                        <td style="padding-left:12px;">
                          <span style="color:#ffffff; font-family:monospace; font-size:20px; font-weight:600;">AMK Steels</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td style="text-align:right; vertical-align:middle;">
                    <span style="color:#94a3b8; font-size:12px; text-transform:uppercase; letter-spacing:1px;">Order Receipt</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Success Banner -->
          <tr>
            <td style="background-color:#059669; padding:16px 32px; text-align:center;">
              <span style="color:#ffffff; font-size:16px; font-weight:600;">✓ Payment Successful — Order Confirmed</span>
            </td>
          </tr>

          <!-- Order Info -->
          <tr>
            <td style="padding:28px 32px 0 32px;">
              <p style="margin:0 0 4px; font-size:15px; color:#555;">Hi <strong style="color:#333;">${name}</strong>,</p>
              <p style="margin:0 0 20px; font-size:15px; line-height:1.6; color:#555;">
                Thank you for your order! Here's your billing receipt.
              </p>

              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:#f7f8fa; border-radius:8px; padding:16px;">
                <tr>
                  <td style="padding:12px 16px;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                      <tr>
                        <td style="font-size:13px; color:#888; padding-bottom:6px;">Order Number</td>
                        <td style="font-size:13px; color:#888; padding-bottom:6px; text-align:right;">Date</td>
                      </tr>
                      <tr>
                        <td style="font-size:16px; font-weight:700; color:#1a1a1a; font-family:monospace;">${order.orderNumber}</td>
                        <td style="font-size:14px; color:#333; text-align:right;">${orderDate}</td>
                      </tr>
                      ${order.paymentId ? `
                      <tr>
                        <td colspan="2" style="padding-top:10px; font-size:12px; color:#888;">
                          Payment ID: <span style="font-family:monospace; color:#555;">${order.paymentId}</span>
                        </td>
                      </tr>` : ''}
                      ${order.buyerGstin ? `
                      <tr>
                        <td colspan="2" style="padding-top:6px; font-size:12px; color:#888;">
                          Buyer GSTIN: <span style="font-family:monospace; color:#555;">${order.buyerGstin}</span>
                        </td>
                      </tr>` : ''}
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Items Table -->
          <tr>
            <td style="padding:24px 32px 0 32px;">
              <h2 style="margin:0 0 12px; font-size:16px; font-weight:700; color:#1a1a1a;">Items Ordered</h2>
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border:1px solid #e5e7eb; border-radius:8px; overflow:hidden;">
                <tr style="background:#f9fafb;">
                  <th style="padding:10px 12px; text-align:left; font-size:12px; font-weight:600; color:#888; text-transform:uppercase; letter-spacing:0.5px; border-bottom:1px solid #e5e7eb;">Product</th>
                  <th style="padding:10px 12px; text-align:center; font-size:12px; font-weight:600; color:#888; text-transform:uppercase; letter-spacing:0.5px; border-bottom:1px solid #e5e7eb;">Qty</th>
                  <th style="padding:10px 12px; text-align:right; font-size:12px; font-weight:600; color:#888; text-transform:uppercase; letter-spacing:0.5px; border-bottom:1px solid #e5e7eb;">Price</th>
                  <th style="padding:10px 12px; text-align:right; font-size:12px; font-weight:600; color:#888; text-transform:uppercase; letter-spacing:0.5px; border-bottom:1px solid #e5e7eb;">Total</th>
                </tr>
                ${itemRows}
              </table>
            </td>
          </tr>

          <!-- Totals -->
          <tr>
            <td style="padding:16px 32px 0 32px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td style="padding:6px 0; font-size:14px; color:#555;">Subtotal</td>
                  <td style="padding:6px 0; font-size:14px; color:#333; text-align:right; font-family:monospace;">₹${formatCurrency(order.subtotal)}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0; font-size:14px; color:#555;">GST</td>
                  <td style="padding:6px 0; font-size:14px; color:#333; text-align:right; font-family:monospace;">₹${formatCurrency(order.gstAmount)}</td>
                </tr>
                <tr>
                  <td colspan="2" style="border-top:2px solid #1a2b4a; padding-top:10px;"></td>
                </tr>
                <tr>
                  <td style="padding:4px 0; font-size:18px; font-weight:700; color:#1a1a1a;">Total Paid</td>
                  <td style="padding:4px 0; font-size:18px; font-weight:700; color:#059669; text-align:right; font-family:monospace;">₹${formatCurrency(order.totalAmount)}</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Shipping Address -->
          ${addressStr ? `
          <tr>
            <td style="padding:24px 32px 0 32px;">
              <h3 style="margin:0 0 8px; font-size:14px; font-weight:600; color:#888; text-transform:uppercase; letter-spacing:0.5px;">Ship To</h3>
              <p style="margin:0; font-size:14px; color:#333; line-height:1.6;">
                ${addr.label ? `<strong>${addr.label}</strong><br/>` : ''}
                ${addressStr}
              </p>
            </td>
          </tr>` : ''}

          <!-- CTA -->
          <tr>
            <td style="padding:28px 32px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 auto;">
                <tr>
                  <td style="border-radius:8px; background-color:#2563eb;">
                    <a href="${orderUrl}" target="_blank" style="display:inline-block; padding:14px 32px; font-size:15px; font-weight:600; color:#ffffff; text-decoration:none; border-radius:8px;">
                      View Order Details
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px; border-top:1px solid #eee; text-align:center;">
              <p style="margin:0; font-size:12px; color:#aaaaaa; line-height:1.6;">
                AMK Steels · Mill-direct structural steel<br/>
                This is an automated receipt. Please do not reply.
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
  sendOrderReceiptEmail,
};

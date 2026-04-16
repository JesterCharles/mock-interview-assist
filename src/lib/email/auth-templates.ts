const ACCENT = '#C85A2E';
const INK = '#1A1A1A';
const MUTED = '#7A7267';
const BG = '#F5F0E8';
const SURFACE = '#FFFFFF';
const BORDER = '#DDD5C8';
const FONT = "-apple-system, 'DM Sans', BlinkMacSystemFont, 'Segoe UI', sans-serif";

function baseTemplate(title: string, bodyContent: string): string {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
  </head>
  <body style="margin:0;padding:0;background-color:${BG};font-family:${FONT};color:${INK};">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:${BG};padding:40px 16px;">
      <tr>
        <td align="center">
          <table width="520" cellpadding="0" cellspacing="0" style="background-color:${SURFACE};border:1px solid ${BORDER};border-radius:12px;overflow:hidden;">
            <!-- Header -->
            <tr>
              <td style="padding:28px 40px 20px;border-bottom:1px solid ${BORDER};">
                <p style="margin:0;font-size:13px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:${MUTED};">Next Level Mock</p>
              </td>
            </tr>
            <!-- Body -->
            <tr>
              <td style="padding:32px 40px;">
                ${bodyContent}
              </td>
            </tr>
            <!-- Footer -->
            <tr>
              <td style="padding:20px 40px;border-top:1px solid ${BORDER};background-color:${BG};">
                <p style="margin:0;font-size:12px;color:${MUTED};line-height:1.6;">
                  &copy; ${new Date().getFullYear()} Next Level Mock. All rights reserved.
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
 * HTML email for password reset.
 * Always return 200 from the API — never confirm whether the email exists.
 */
export function getResetEmailHtml(resetLink: string): string {
  const body = `
    <h1 style="margin:0 0 8px;font-size:28px;font-weight:600;letter-spacing:-0.02em;color:${INK};">Reset your password</h1>
    <p style="margin:0 0 24px;font-size:14px;color:${MUTED};line-height:1.6;">
      We received a request to reset the password for your Next Level Mock account.
      Click the button below to choose a new password.
    </p>
    <table cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
      <tr>
        <td style="border-radius:8px;background-color:${ACCENT};">
          <a href="${resetLink}" target="_blank"
             style="display:inline-block;padding:12px 28px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">
            Reset password
          </a>
        </td>
      </tr>
    </table>
    <p style="margin:0 0 8px;font-size:13px;color:${MUTED};line-height:1.6;">
      Or copy and paste this URL into your browser:
    </p>
    <p style="margin:0 0 24px;font-size:12px;color:${MUTED};word-break:break-all;line-height:1.6;">
      ${resetLink}
    </p>
    <p style="margin:0;font-size:13px;color:${MUTED};line-height:1.6;">
      If you didn&apos;t request a password reset, you can safely ignore this email.
      Your password will not be changed.
    </p>
  `;
  return baseTemplate('Reset your Next Level Mock password', body);
}

/**
 * HTML email for associate magic-link sign-in.
 */
export function getMagicLinkEmailHtml(magicLink: string): string {
  const body = `
    <h1 style="margin:0 0 8px;font-size:28px;font-weight:600;letter-spacing:-0.02em;color:${INK};">Sign in to Next Level Mock</h1>
    <p style="margin:0 0 24px;font-size:14px;color:${MUTED};line-height:1.6;">
      Click the button below to sign in to your associate account. This link expires in 7 days.
    </p>
    <table cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
      <tr>
        <td style="border-radius:8px;background-color:${ACCENT};">
          <a href="${magicLink}" target="_blank"
             style="display:inline-block;padding:12px 28px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">
            Sign in
          </a>
        </td>
      </tr>
    </table>
    <p style="margin:0 0 8px;font-size:13px;color:${MUTED};line-height:1.6;">
      Or copy and paste this URL into your browser:
    </p>
    <p style="margin:0 0 24px;font-size:12px;color:${MUTED};word-break:break-all;line-height:1.6;">
      ${magicLink}
    </p>
    <p style="margin:0;font-size:13px;color:${MUTED};line-height:1.6;">
      This link expires in 7 days. If you didn&apos;t request this, you can safely ignore this email.
    </p>
  `;
  return baseTemplate('Sign in to Next Level Mock', body);
}

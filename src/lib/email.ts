/**
 * Email sending utility using Resend
 * Handles password reset and magic sign-in link emails
 */

import { Resend } from 'resend';

// Lazy initialization - only create Resend client when needed
let resend: Resend | null = null;

function getResendClient(): Resend | null {
  if (!process.env.RESEND_API_KEY) {
    return null;
  }

  if (!resend) {
    resend = new Resend(process.env.RESEND_API_KEY);
  }

  return resend;
}

const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@exploretheuniverse2175.com';
const SITE_NAME = 'Explore the Universe 2175';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Send an email using Resend
 */
export async function sendEmail(options: EmailOptions): Promise<boolean> {
  const client = getResendClient();

  // If no API key is configured, log to console (development mode)
  if (!client) {
    console.log('📧 Email would be sent (Resend not configured):');
    console.log(`To: ${options.to}`);
    console.log(`Subject: ${options.subject}`);
    console.log(`Body:\n${options.text || options.html}`);
    return true;
  }

  try {
    const result = await client.emails.send({
      from: FROM_EMAIL,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });

    if (result.error) {
      console.error('Failed to send email:', result.error);
      return false;
    }

    console.log('✅ Email sent successfully:', result.data?.id);
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(email: string, token: string): Promise<boolean> {
  const resetUrl = `${SITE_URL}/reset-password?token=${token}`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Your Password</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #0a0a14;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a14;">
          <tr>
            <td align="center" style="padding: 40px 20px;">
              <table width="600" cellpadding="0" cellspacing="0" style="background-color: #1a1a2e; border-radius: 8px; overflow: hidden;">
                <!-- Header -->
                <tr>
                  <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">
                      ${SITE_NAME}
                    </h1>
                  </td>
                </tr>

                <!-- Body -->
                <tr>
                  <td style="padding: 40px 30px; color: #e0e0e0;">
                    <h2 style="margin: 0 0 20px; color: #ffffff; font-size: 24px;">Reset Your Password</h2>

                    <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6;">
                      We received a request to reset your password. Click the button below to choose a new password:
                    </p>

                    <!-- CTA Button -->
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td align="center" style="padding: 20px 0;">
                          <a href="${resetUrl}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
                            Reset Password
                          </a>
                        </td>
                      </tr>
                    </table>

                    <p style="margin: 20px 0 0; font-size: 14px; line-height: 1.6; color: #b0b0b0;">
                      This link will expire in <strong>1 hour</strong>. If you didn't request this, you can safely ignore this email.
                    </p>

                    <p style="margin: 20px 0 0; font-size: 14px; line-height: 1.6; color: #b0b0b0;">
                      Or copy and paste this link into your browser:<br>
                      <a href="${resetUrl}" style="color: #667eea; word-break: break-all;">${resetUrl}</a>
                    </p>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="padding: 30px; background-color: #0f0f1e; text-align: center; color: #808080; font-size: 12px;">
                    <p style="margin: 0 0 10px;">
                      ${SITE_NAME} &copy; ${new Date().getFullYear()}
                    </p>
                    <p style="margin: 0;">
                      This is an automated email. Please do not reply.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;

  const text = `
Reset Your Password - ${SITE_NAME}

We received a request to reset your password. Click the link below to choose a new password:

${resetUrl}

This link will expire in 1 hour. If you didn't request this, you can safely ignore this email.

${SITE_NAME} © ${new Date().getFullYear()}
  `.trim();

  return sendEmail({
    to: email,
    subject: `Reset your ${SITE_NAME} password`,
    html,
    text,
  });
}

/**
 * Send magic sign-in link email
 */
export async function sendMagicLinkEmail(email: string, token: string): Promise<boolean> {
  const magicUrl = `${SITE_URL}/api/auth/magic-link-callback?token=${token}`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Your Magic Sign-In Link</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #0a0a14;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a14;">
          <tr>
            <td align="center" style="padding: 40px 20px;">
              <table width="600" cellpadding="0" cellspacing="0" style="background-color: #1a1a2e; border-radius: 8px; overflow: hidden;">
                <!-- Header -->
                <tr>
                  <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">
                      ${SITE_NAME}
                    </h1>
                  </td>
                </tr>

                <!-- Body -->
                <tr>
                  <td style="padding: 40px 30px; color: #e0e0e0;">
                    <h2 style="margin: 0 0 20px; color: #ffffff; font-size: 24px;">Your Magic Sign-In Link</h2>

                    <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6;">
                      Click the button below to sign in to your account. No password required!
                    </p>

                    <!-- CTA Button -->
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td align="center" style="padding: 20px 0;">
                          <a href="${magicUrl}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
                            Sign In Now
                          </a>
                        </td>
                      </tr>
                    </table>

                    <p style="margin: 20px 0 0; font-size: 14px; line-height: 1.6; color: #b0b0b0;">
                      This link will expire in <strong>15 minutes</strong>. If you didn't request this, you can safely ignore this email.
                    </p>

                    <p style="margin: 20px 0 0; font-size: 14px; line-height: 1.6; color: #b0b0b0;">
                      Or copy and paste this link into your browser:<br>
                      <a href="${magicUrl}" style="color: #667eea; word-break: break-all;">${magicUrl}</a>
                    </p>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="padding: 30px; background-color: #0f0f1e; text-align: center; color: #808080; font-size: 12px;">
                    <p style="margin: 0 0 10px;">
                      ${SITE_NAME} &copy; ${new Date().getFullYear()}
                    </p>
                    <p style="margin: 0;">
                      This is an automated email. Please do not reply.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;

  const text = `
Your Magic Sign-In Link - ${SITE_NAME}

Click the link below to sign in to your account. No password required!

${magicUrl}

This link will expire in 15 minutes. If you didn't request this, you can safely ignore this email.

${SITE_NAME} © ${new Date().getFullYear()}
  `.trim();

  return sendEmail({
    to: email,
    subject: `Your magic sign-in link for ${SITE_NAME}`,
    html,
    text,
  });
}

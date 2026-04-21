/**
 * Email service powered by Nodemailer (SMTP).
 *
 * Required environment variables:
 *   SMTP_HOST — e.g. smtp.gmail.com
 *   SMTP_PORT — e.g. 587 (TLS) or 465 (SSL)
 *   SMTP_USER — SMTP username (usually your email)
 *   SMTP_PASS — SMTP password / app password
 *   SMTP_FROM — (optional) "Display Name <email@example.com>"; defaults to SMTP_USER
 *
 * For Gmail: enable 2FA and create an App Password at
 * https://myaccount.google.com/apppasswords
 */

import nodemailer, { type Transporter } from "nodemailer";

let transporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    throw new Error(
      "SMTP credentials are not configured. Set SMTP_HOST, SMTP_USER and SMTP_PASS."
    );
  }

  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // true for 465, false for other ports (STARTTLS on 587)
    auth: { user, pass },
  });

  return transporter;
}

export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
}): Promise<void> {
  try {
    const tx = getTransporter();
    const from =
      process.env.SMTP_FROM ||
      `Competition Spark <${process.env.SMTP_USER}>`;

    await tx.sendMail({
      from,
      to: params.to,
      subject: params.subject,
      html: params.html,
    });
  } catch (error) {
    console.error("Failed to send email:", error);
    throw error;
  }
}

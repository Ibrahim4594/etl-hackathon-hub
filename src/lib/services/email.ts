/**
 * Email service powered by Resend.
 *
 * Uses the RESEND_API_KEY env var to authenticate and sends
 * transactional email via the Resend REST API.
 */

const RESEND_API_URL = "https://api.resend.com/emails";
// Use Resend's free testing address until domain is verified
// Change to "Competition Spark <noreply@yourdomain.com>" once verified in Resend dashboard
const FROM_ADDRESS = process.env.RESEND_FROM_EMAIL || "Competition Spark <onboarding@resend.dev>";

export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
}): Promise<void> {
  try {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error("RESEND_API_KEY environment variable is not set");
    }

    const response = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: FROM_ADDRESS,
        to: params.to,
        subject: params.subject,
        html: params.html,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(
        `Resend API error (${response.status}): ${body}`
      );
    }
  } catch (error) {
    console.error("Failed to send email:", error);
    throw error;
  }
}

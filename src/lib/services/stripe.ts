/**
 * Stripe payment service.
 *
 * Handles Checkout Session creation and webhook event processing.
 * Requires the `stripe` npm package: npm install stripe
 */

import Stripe from "stripe";
import { db } from "@/lib/db";
import { payments, competitions } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export function getStripeClient() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2026-02-25.clover",
  });
}

// ────────────────────────── Checkout ──────────────────────────

export async function createCheckoutSession(params: {
  competitionId: string;
  organizationId: string;
  amount: number;
  currency?: string;
}): Promise<string> {
  const { competitionId, organizationId, amount, currency = "usd" } = params;

  // Create Stripe Checkout Session first — avoids orphan DB records if Stripe fails
  const stripe = getStripeClient();
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency,
          product_data: {
            name: "Competition Listing Fee",
            description: `Payment for competition ${competitionId}`,
          },
          unit_amount: amount, // amount in smallest currency unit (cents)
        },
        quantity: 1,
      },
    ],
    metadata: {
      competitionId,
      organizationId,
    },
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/sponsor/competitions/${competitionId}?payment=success`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/sponsor/competitions/${competitionId}?payment=cancelled`,
  });

  if (!session.url) {
    throw new Error("Stripe did not return a checkout session URL");
  }

  // Create payment record after successful Stripe session creation
  await db.insert(payments).values({
    organizationId,
    competitionId,
    amount,
    currency,
    status: "pending",
    description: `Competition listing fee`,
    stripeCheckoutSessionId: session.id,
  });

  return session.url;
}

// ────────────────────────── Webhook ──────────────────────────

export async function handleWebhookEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const competitionId = session.metadata?.competitionId;

      // Look up payment by Stripe session ID
      const [payment] = await db
        .select({ id: payments.id, status: payments.status })
        .from(payments)
        .where(eq(payments.stripeCheckoutSessionId, session.id));

      if (!payment) {
        console.error("Stripe webhook: no payment record for session", session.id);
        return;
      }

      // Idempotency — skip if already processed
      if (payment.status === "completed") {
        return;
      }

      // Atomically update payment + competition status
      await db.transaction(async (tx) => {
        await tx
          .update(payments)
          .set({
            status: "completed",
            stripePaymentIntentId:
              typeof session.payment_intent === "string"
                ? session.payment_intent
                : session.payment_intent?.id ?? null,
            updatedAt: new Date(),
          })
          .where(eq(payments.id, payment.id));

        if (competitionId) {
          await tx
            .update(competitions)
            .set({
              status: "pending_review",
              updatedAt: new Date(),
            })
            .where(and(
              eq(competitions.id, competitionId),
              eq(competitions.status, "pending_review")  // Only update if still pending
            ));
        }
      });

      break;
    }

    default: {
      console.log(`Unhandled Stripe event type: ${event.type}`);
    }
  }
}

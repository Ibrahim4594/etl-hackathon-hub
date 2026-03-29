/**
 * Stripe payment service.
 *
 * Handles Checkout Session creation and webhook event processing.
 * Requires the `stripe` npm package: npm install stripe
 */

import Stripe from "stripe";
import { db } from "@/lib/db";
import { payments, competitions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

function getStripeClient() {
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

  // Create a pending payment record
  const [payment] = await db
    .insert(payments)
    .values({
      organizationId,
      competitionId,
      amount,
      currency,
      status: "pending",
      description: `Competition listing fee`,
    })
    .returning();

  // Create a Stripe Checkout Session
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
      paymentId: payment.id,
    },
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/sponsor/competitions/${competitionId}?payment=success`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/sponsor/competitions/${competitionId}?payment=cancelled`,
  });

  // Store the checkout session ID
  await db
    .update(payments)
    .set({
      stripeCheckoutSessionId: session.id,
      updatedAt: new Date(),
    })
    .where(eq(payments.id, payment.id));

  if (!session.url) {
    throw new Error("Stripe did not return a checkout session URL");
  }

  return session.url;
}

// ────────────────────────── Webhook ──────────────────────────

export async function handleWebhookEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;

      const competitionId = session.metadata?.competitionId;
      const paymentId = session.metadata?.paymentId;

      if (!paymentId) {
        console.error("Stripe webhook: missing paymentId in metadata");
        return;
      }

      // Update payment status to completed
      await db
        .update(payments)
        .set({
          status: "completed",
          stripePaymentIntentId:
            typeof session.payment_intent === "string"
              ? session.payment_intent
              : session.payment_intent?.id ?? null,
          updatedAt: new Date(),
        })
        .where(eq(payments.id, paymentId));

      // Update competition status to pending_review
      if (competitionId) {
        await db
          .update(competitions)
          .set({
            status: "pending_review",
            updatedAt: new Date(),
          })
          .where(eq(competitions.id, competitionId));
      }

      break;
    }

    default: {
      console.log(`Unhandled Stripe event type: ${event.type}`);
    }
  }
}

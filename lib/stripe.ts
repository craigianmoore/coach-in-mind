// Server-only Stripe client. Never import this into a "use client"
// component — the secret key must never reach the browser.
import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY is not set — add it to .env.local (and Vercel's Environment Variables).");
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-06-20",
});

import Stripe from "stripe";
import { serverEnv } from "./env";

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(serverEnv.stripeSecretKey(), {
      apiVersion: "2024-06-20",
    });
  }
  return _stripe;
}

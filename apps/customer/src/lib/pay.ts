/**
 * Card payment with Stripe's native PaymentSheet — the mobile counterpart of
 * the web checkout's Payment Element. The amount is never set here: the
 * server creates the PaymentIntent from the signed fare quote. Stripe's
 * publishable key comes from /api/app/config, so the app always uses the same
 * live / test mode as the web.
 */
import * as Linking from "expo-linking";
import { handleNextAction, initPaymentSheet, initStripe, presentPaymentSheet, PaymentSheetError } from "@stripe/stripe-react-native";
import { app as appApi, bookings as bookingsApi } from "@movo/api";

let stripeReady: Promise<void> | null = null;

function ensureStripe(): Promise<void> {
  stripeReady ??= appApi.appConfig().then(async ({ stripePublishableKey }) => {
    if (!stripePublishableKey) throw new Error("Payments aren't available right now. Please try again later.");
    await initStripe({ publishableKey: stripePublishableKey, urlScheme: "movoprive" });
  }).catch((e) => { stripeReady = null; throw e; });
  return stripeReady;
}

export type PayResult = { status: "paid"; intentId: string } | { status: "canceled" };

/** Charges exactly the quoted total. Throws with a message the rider can read. */
export async function payForQuote(quote: string, billing: { name?: string; email?: string | null }): Promise<PayResult> {
  await ensureStripe();
  const { clientSecret, id } = await bookingsApi.createPaymentIntent(quote);

  const init = await initPaymentSheet({
    merchantDisplayName: "Movo Privé",
    paymentIntentClientSecret: clientSecret,
    returnURL: Linking.createURL("stripe-redirect"),
    defaultBillingDetails: { name: billing.name, email: billing.email ?? undefined, address: { country: "CA" } },
    appearance: { colors: { primary: "#131936" } },
  });
  if (init.error) throw new Error(init.error.message || "Couldn't start the payment. Please try again.");

  const paid = await presentPaymentSheet();
  if (paid.error) {
    if (paid.error.code === PaymentSheetError.Canceled) return { status: "canceled" };
    throw new Error(paid.error.message || "Your payment didn't go through. Please try again.");
  }
  return { status: "paid", intentId: id };
}

/** A mid-ride charge (new destination / stop) the bank wants confirmed (3D Secure) */
export async function confirmExtraCharge(clientSecret: string): Promise<void> {
  await ensureStripe();
  const { error } = await handleNextAction(clientSecret, Linking.createURL("stripe-redirect"));
  if (error) throw new Error(error.message || "Card authentication failed");
}

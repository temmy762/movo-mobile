import type { SavedCard } from "@movo/shared";
import { request } from "../client";

export const cards = () => request<{ paymentMethods: SavedCard[] }>("/api/stripe/payment-methods");

/* Only the rider's own cards (404 otherwise) */
export const removeCard = (paymentMethodId: string) =>
  request<{ success: true }>("/api/stripe/payment-methods", { method: "DELETE", body: { paymentMethodId } });

/* Pay the quoted total with a saved card. status "requires_action" = the bank
   wants a 3D Secure check (confirm clientSecret, then book with `id`). */
export const chargeSaved = (quote: string, paymentMethodId: string) =>
  request<{ id: string; status: string; clientSecret: string | null }>("/api/stripe/charge-saved", { body: { quote, paymentMethodId } });

/* Save a new card without paying (Profile → Payment methods) */
export const setupIntent = () => request<{ clientSecret: string }>("/api/stripe/setup-intent", { method: "POST" });

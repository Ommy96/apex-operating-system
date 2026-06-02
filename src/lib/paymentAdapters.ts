/**
 * Payment provider adapter stubs for public donations.
 *
 * The actual provider calls are performed server-side by the
 * `donation-init` edge function (M-Pesa STK Push today; Stripe/PayPal
 * are stubbed so the UI flow is complete and integrations can be
 * dropped in without touching components).
 */

export type PaymentProvider = "mpesa" | "stripe" | "paypal";

export interface DonationProviderMeta {
  id: PaymentProvider;
  label: string;
  description: string;
  requiresPhone: boolean;
  available: boolean;
}

export const PROVIDERS: DonationProviderMeta[] = [
  {
    id: "mpesa",
    label: "M-Pesa",
    description: "Pay instantly from your phone via STK Push.",
    requiresPhone: true,
    available: true,
  },
  {
    id: "stripe",
    label: "Card (Stripe)",
    description: "Coming soon — international card payments.",
    requiresPhone: false,
    available: false,
  },
  {
    id: "paypal",
    label: "PayPal",
    description: "Coming soon — pay with your PayPal balance.",
    requiresPhone: false,
    available: false,
  },
];

export function getProvider(id: PaymentProvider) {
  return PROVIDERS.find((p) => p.id === id) ?? PROVIDERS[0];
}
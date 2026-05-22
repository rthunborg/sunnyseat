# Future Monetization Archive — Season Pass and Swish

**Created:** 2026-05-19
**Status:** Preserved for post-MVP pickup
**Reason:** Consumer monetization is deferred until SunnySeat has enough usage to validate demand and pricing.

## Scope Preserved

This artifact preserves the Season Pass work removed from the MVP plan. Nothing here is active MVP scope.

Preserved capabilities:

- Soft upsell prompt for future monetization.
- Season Pass paywall with Swedish copy and single-purchase positioning.
- Swish payment on mobile via deep-link.
- Swish payment on desktop via QR code.
- Payment processing, polling, timeout, failure, and retry states.
- Premium activation persistence without user accounts.
- Recovery by Swish transaction ID.
- Server-side payment callbacks and idempotent webhook handling.
- Future premium status JWT model.

## Deferred Requirements

- **FR21:** Soft upsell prompt for monetized features.
- **FR22:** Season Pass purchase via Swish.
- **FR23:** Swish mobile deep-link and desktop QR code.
- **FR24:** Payment confirmation and premium activation.
- **FR25:** Premium recovery without a user account.
- **FR26:** Payment failure handling and retry.

These requirements are post-MVP and must not gate MVP planner, date picker, or favourites functionality.

## Deferred Stories

Future Epic 4 should be restarted from these preserved story concepts:

- **4.1 Premium Gate & Upsell Card** — optional future gate and Season Pass teaser.
- **4.2 Paywall Screen & Swish Payment** — mobile deep-link and desktop QR payment flow.
- **4.3 Payment Failure & Retry** — timeout, failed, retry, and contact flows.
- **4.4 Premium Activation & Persistence** — JWT-backed premium state after payment confirmation.
- **4.5 Premium Recovery** — Swish transaction ID recovery flow.

Former Story 4.5 "Future Date Picker & Time Simulation" moved into MVP Story 2.5 as free functionality and should not be restored as premium-only unless a future product decision explicitly reverses this correction.

## Preserved UX References

The following visual references remain useful, but are inactive for MVP gates:

- `premium-upsell`
- `premium-paywall`
- `premium-paywall-processing`
- `payment-failed`
- `premium-recovery`

Current MVP visual validation should not fail because these screens are absent from the runtime. If future monetization resumes, the references should be checked against the latest product positioning before implementation.

## Preserved Architecture Notes

Future monetization can reuse the original architecture direction:

- `/api/payments/create` for initiating Swish payment sessions.
- `/api/payments/status/[id]` for polling payment state.
- `/api/payments/webhook` for Swish callback processing.
- `/api/payments/recover` for transaction-ID recovery.
- Signed premium JWT in localStorage after successful payment.
- Server verification of premium JWT for any future paid-only API endpoints.

For MVP, these routes and hooks should remain absent or dormant. Free planner/date/favourites flows must not depend on premium status.

## Code Preservation Strategy

Rasmus prefers dormant monetization code to be moved out of live app files when it is not needed for the free MVP. Preserve the useful decisions and contracts here, but avoid leaving unused premium/payment providers, hooks, API routes, or components wired into active runtime paths.

When cleaning MVP code, use this rule:

- If the code is only a type/API contract, preserve the interface shape in this archive or an inactive future-monetization reference file.
- If the code is a component or hook that would save future work, move it under an explicit inactive `future-premium` archive and ensure nothing imports it from active routes, providers, planner/date flows, or favourites flows.
- If the code is a provider or route stub, remove it from live wiring unless a current MVP story uses it for non-monetization behaviour.
- If a future agent reactivates Season Pass, they should start from this archive, refresh product assumptions, and then reintroduce code deliberately through a new Future Monetization story.

The MVP cleanup removed the earlier live stubs for:

- `PremiumContext` / `PremiumProvider` / `usePremiumStatus`
- `queryKeys.premium.status()`
- `lib/types/payment.ts`
- empty `messages/*/premium.json` scopes
- unused CSS tokens `--radius-premium-tag` and `--gradient-premium-button`

If reintroduced, the previous contract shape was:

```ts
type PurchaseStatus = 'pending' | 'paid' | 'failed' | 'cancelled';

interface Purchase {
  id: string;
  sessionId: string;
  swishPaymentId?: string;
  amount: number;
  currency: string;
  status: PurchaseStatus;
  createdAt: string;
  completedAt?: string;
}

interface PremiumStatus {
  sessionId: string;
  isPremium: boolean;
  purchaseId?: string;
  activatedAt?: string;
  expiresAt?: string;
}

interface CreatePaymentResponse {
  paymentId: string;
  swishUrl: string;
  qrCode: string;
  purchaseId: string;
}

interface SwishCallbackPayload {
  id: string;
  payeePaymentReference: string;
  paymentReference: string;
  callbackUrl: string;
  payerAlias: string;
  payeeAlias: string;
  amount: number;
  currency: string;
  message: string;
  status: 'PAID' | 'DECLINED' | 'ERROR' | 'CANCELLED';
  dateCreated: string;
  datePaid?: string;
  errorCode?: string;
  errorMessage?: string;
}
```

## Reactivation Checklist

Before reactivating Season Pass:

- Validate price, value proposition, and timing with real MVP usage data.
- Decide which feature, if any, becomes paid without weakening the core free loop.
- Refresh Swedish copy and design references.
- Reassess legal/privacy handling for Swish transaction data.
- Add tests proving paid gates do not block unrelated free features.

# IVRE Revision 2 — implementation status

Updated 17 September 2026. **Partial production release, not the completed payment marketplace.**

## Live in this release

- Website discovery now uses published Supabase storefronts, not sample influencers or invented match scores.
- Creator dashboard: opt-in publication, service packages, pause/reactivate packages, delivery days, usage rights, previous work, languages and image/video/reel URLs.
- Company dashboard: signed-in full creator profiles, package selection, a persistent company cart, quantities, removal, saved campaign briefs and a fee breakdown.
- Each 10% fee uses creator earnings independently. ₹10,000 earnings = ₹11,000 displayed package + ₹1,000 company fee = ₹12,000 before tax.
- First matching search allowance is saved; guest search tokens are signed and linked to the company at login. Technical/empty results do not intentionally consume a credit. Anonymous trials remain best-effort browser based, not proof of one search per person.
- Company plans display ₹299/₹499/₹999 and 10/30/100 searches. Company plan GST is shown separately at the previously specified 18%.
- Optional Creator Premium is displayed at the user-confirmed ₹199/month. Free profiles can still publish and appear organically.
- Homepage and directory have honest empty/error states. There is currently one registered creator and no published storefronts; no fictional inventory was inserted.
- Payment buttons fail closed. No charges, payouts or refunds were performed.

## Not finished / not active

- Razorpay order creation, captured-payment verification, signed/replay-safe webhooks and reconciliation.
- Automated company plan purchases, explicit monthly renewal and billing-period entitlements. Existing upgrade-request workflow remains; current paid-search counting still uses calendar months.
- Creator Premium purchase, paid placement, sponsorship labels on results, recommendation-review administration and priority-payout implementation. The visible Premium panel is an inactive preview, not a purchasable service.
- Direct-booking orders, acceptance, fulfilment and revision state machine; human dispute review; replacement allocation; seven-day refund workflow.
- Marketplace provider/KYC eligibility and supported standard/priority settlement timing. Website approval alone was not treated as approval for marketplace settlements.
- Creator-booking tax base, invoices, withholding and refund tax adjustments. Checkout shows these as unconfigured rather than inventing a payable total.
- Direct media file uploads and editing existing package details (packages can currently be paused and replaced).
- Independent social verification, automatic analytics and a true LLM search implementation. Current prompt parsing is rules-based and stats are creator-provided.

## Verification

- 10 company unit tests passed, including independent fee rounding, refund allocation math, invalid monetary values, unsafe media URLs and plan amounts.
- Company and creator production builds passed. Website JavaScript syntax checks passed.
- Browser fixture tests passed: full profile → add to cart → checkout, disabled unconfigured payment button, desktop/mobile company layout, mobile creator storefront editor. These tests mock Supabase and are not proof of a real paid transaction.
- Rolled-back database fixture checks passed for quote totals, private-field exclusion, first/second search quota and anonymous denial of full profiles.
- Live smoke checks passed: ivre.in loads real empty-state search; directory has no mobile horizontal overflow; both live portal login screens render correctly.
- Live permission checks: anonymous users cannot execute full-profile or service-only trial RPCs. Zero QA fixture creator rows remained.
- Initial company Vercel runtime error lookup returned no logs. This is not a long-duration production load test.
- Browser notices observed: missing favicon requests (cosmetic 404s). No payment flow was tested with a real card or live charge.
- No independent code review or external CI run was available; local tests and Vercel builds were used.

## Deployment / rollback record

Current production portal deployments:

- Company: `dpl_51PGAs2ZDAzRsdQ3M4kr5hazq5S9`, https://ivre-company-dashboard.vercel.app
- Creator: `dpl_9X1Nfb5XRAy8aCEcCfzm7ooPrevM`, https://app.ivre.in
- Website: `dpl_CaDGFLewzajGHfmjzJXTvsjXDu3W`, https://ivre.in (includes the follow-up Premium-coming-soon wording).

Previous production deployments available for frontend rollback:

- Website: `dpl_EMM596Pr8HgUE17H5ycFhai2snGm`
- Company: `dpl_8GwGq5JzaQgeHjSHGS7yt9jVioGj`
- Creator: `dpl_HFBcGGu81TYhuxgVNq7qJfsW9bex`

Supabase additions: `marketplace_storefronts`, `marketplace_search`; edge function `marketplace-search` v1. Do not drop these tables as a frontend rollback step: preserve any newly entered creator/cart data. Restoring frontend alone does not revert changed search quotas.

Roll back an affected frontend if login fails, profiles cannot be opened, or cart/brief writes consistently fail. Disable discovery and investigate immediately if private profile fields become exposed. Keep payment collection off until its independent acceptance tests pass.

## Next integration inputs

Razorpay keys already exist in the company deployment's production environment, but no IVRE webhook secret or server-side Supabase credential is configured there. Do not expose a service-role key or Razorpay secret to browser code. Confirm the merchant's marketplace settlement support and define booking invoice/refund tax rules before enabling live creator payments. These requirements do not prevent continuing to build the remaining backend.

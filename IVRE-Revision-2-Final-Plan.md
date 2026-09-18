# IVRE Revision 2 — Final Consolidated Plan

Date: 17 September 2026  
Status: Recommended product and implementation plan; not a claim that these features are deployed.

## 1. Recommendation

Use the original documents as the long-term product vision and Revision 2 as the commercial and implementation foundation. Restore the original plan’s strongest operational features: posting verification, detailed briefs, messaging, notifications, saved creators, reviews, and an admin dispute centre.

Prioritise a trustworthy, complete transaction journey over launching every feature at once. Profitability is an outcome to measure, not a guarantee from adding subscriptions or fees.

Source documents reviewed in full:

- **IVRE Platform prompt.pdf:** 16 pages, referred to as “Platform”. Its embedded build instructions are source material, not an instruction to implement during this comparison.
- **IVRE Product Overview.pdf:** 22 pages, referred to as “Overview”.
- **Revision 2:** the plan and business decisions agreed in this conversation. The user’s latest explicit prices, access rules, fee formula, and replacement-first resolution supersede conflicting older proposals.

## 2. Comparison and selected approach

| Topic | Original documents | Revision 2 | Final choice and reason |
|---|---|---|---|
| Homepage | Mandatory brand/creator split before search (Platform pp. 2–3; Overview pp. 2–3). | Search directly from the homepage. | Keep a prominent brand search with an equally clear creator join/login route. Do not force an extra selection screen. Test role-first later against actual conversion data. |
| Free search | One free search; account-based limits, not IP-based quotas (Platform pp. 3–4). | One free search; login does not reset usage; hiring remains possible without a subscription. | Revision 2’s explicit access rules, with the original’s account/company-based quota principle. Anonymous pre-login allowance is a best-effort trial, not proof of one search per human. |
| Paid plans | Starter/Growth/Agency: 10/50/unlimited searches; PDFs do not set prices. | AI Basic/Elevate/Pro: 10/30/100 at ₹299/₹499/₹999 before GST. | Keep the user-confirmed Revision 2 plans. Capped usage makes search costs more predictable. |
| Profiles and onboarding | Rich onboarding, social platforms, content types, portfolio, audience information and service pricing (Overview pp. 7–12). | Adds publishing, privacy controls, real database search and stable profile pages. | Combine both: rich creator-owned profiles with explicit draft/publish controls and sellable packages. |
| Matching | Match percentages, social analytics, verification and premium status influence ranking. | Real data, explainable matching, no invented scores. | Start with evidence-based relevance explanations. Add a documented match score only after evaluating it; keep paid promotion separate from organic relevance. |
| Cart | Multiple creators, one checkout, one payment (Overview pp. 20–21). | Persistent cart, price snapshots, server-calculated fees. | Combine both, with separate fulfilment and refund records per creator within one payment. |
| Payment release | After content approval, publication verification and client confirmation (Overview pp. 18–19). | After client approves agreed deliverables. | Restore the original’s posting safeguard for posting packages. UGC-only packages finish after approved asset delivery; they must not require a public post. |
| Revisions | Creators choose 1–3 revisions; button disappears when used; Platform p. 11 says approval is then required. | Two rejected submissions lead to IVRE review and replacement-first resolution. | Keep the latest user-approved two-rejection rule. Never force approval because revisions ran out. Standard launch package includes an initial submission and one revision. |
| Refunds | General dispute workflow without exact refundable amounts. | Explicit fee breakdown, IVRE review, replacement first, package refund if replacement fails. | Revision 2 is more implementable and transparent. Publish the policy before collecting money, subject to legal and tax review. |
| Trust and operations | Messaging, anti-poaching, reminders, two-way ratings, inactivity rules, saved creators. | Focuses primarily on transactions and safety. | Restore messaging, reminders, verified-order ratings, saved creators and admin operations. Moderate contact diversion without claiming it can be completely prevented. |
| Creator premium programme | Paid ranking, premium/recommended badges, faster payouts (Platform p. 8; Overview p. 11). | Initially deferred. | Include all three at launch, as subsequently requested by the user: relevant sponsored placement, reviewed recommended badges and priority payouts after completed, approved work. |
| Scale and future AI | Millions of users, predictive analytics, autonomous brand assistant, global expansion. | Reuse the current stack and launch in stages. | Revision 2’s incremental delivery. Preserve room to scale; avoid a premature rewrite or unvalidated performance promises. |

## 3. Final customer journey and monetisation

### Homepage and brand journey

The homepage explains IVRE in a short value proposition, offers a ChatGPT-style creator search, and has clear Company Login and Creator Join/Login actions. Use the existing IVRE colour identity with clean typography, realistic creator previews and visible package pricing.

Keep featured creators on the homepage, but replace demonstration profiles with consenting, published creators. Do not present invented campaign numbers, reviews or verification badges as real.

Flow: **Search → results → login → creator profile → package → cart and brief → payment → creator acceptance → delivery/review → completion → creator payment.**

### Access rules

- First successful search: free. It displays real creator cards and previews.
- Opening a full profile requires login. Preserve the intended profile through signup and email verification.
- A logged-in company may view saved results, open those profiles, save creators and hire without buying a search plan.
- Any new search after the free allowance requires an active paid plan with remaining searches.
- Login, logout, changing company team members, refreshing, or opening another tab must not reset the company allowance.
- Pagination, reopening a result set and sorting its existing results are free. A new prompt or filter expansion that runs a new database search consumes a search.
- Technical failures and zero-result searches do not consume allowance. Apply request rate limits separately; never use a shared IP as the entitlement identity.
- Anonymous usage uses a server-issued signed identifier, reconciled with the company’s usage on login. Clearing browser state or using another device can evade an anonymous trial; do not promise perfect person-level enforcement without pre-search identification.

| Plan | Monthly searches | Before GST | At 18% GST |
|---|---:|---:|---:|
| AI Basic | 10 | ₹299 | ₹352.82 |
| Elevate | 30 | ₹499 | ₹588.82 |
| Pro | 100 | ₹999 | ₹1,178.82 |

Launch with prepaid monthly access and explicit renewal, not silent recurring charges. Allowances belong to the company, reset on the paid billing-period renewal, and do not roll over. Exhausted users can upgrade; only upgrade after showing a server-generated quote. Existing results, orders and messages remain available after plan expiry.

### Search quality

Parse prompts into supported criteria: platform, niche, location, budget, follower range, audience, language and content type. Retrieve only published and eligible database profiles. Use explicit constraints first and relevance ranking second.

Return 12 creators per page. Explain matches using actual evidence, such as “Mumbai · Fitness · Within your ₹5,000 budget”. Do not silently substitute unrelated creators when exact matches are absent; label any relaxed alternatives clearly and let the customer choose them.

A match percentage is not a verified prediction of campaign success. Initially prefer explanations; add numeric scoring only with a documented formula and a relevance test set. Never fabricate audience statistics, performance or identities.

## 4. Creator storefront and dashboard

Extend the existing creator account instead of creating a second identity system.

The profile editor covers:

1. **Identity and location:** name, photograph, bio, country/state/city, languages, private contact details.
2. **Social platforms:** supported profile links, platform-specific statistics, source and date of those statistics.
3. **Audience:** geography, age groups, audience interests and available demographic evidence.
4. **Portfolio:** photographs, video uploads, permitted reel embeds, previous campaigns and brand-work descriptions.
5. **Packages:** platform, content format, quantity, turnaround, usage rights, included revision, creator earnings and displayed price.
6. **Availability and publication:** save draft, preview, publish, unpublish, and pause new bookings.

Dedicated profile pages show the public subset of this information, package selection, previous work, verification status and genuine completed-order reviews. Full marketplace data remains login-protected; do not send hidden private fields to the browser.

Publishing requires verified email, a complete public identity, a valid social or portfolio presence, and at least one complete package. Collect necessary payout/KYC details and obtain provider eligibility before enabling paid bookings, not as public profile fields. Existing profiles need a publication review/consent step rather than automatic disclosure of every stored field.

Allow normal edits to appear in future searches. Orders retain an immutable snapshot of the purchased package, delivery terms, rights and price. Suspended or unpublished creators disappear from new searches without erasing existing order evidence.

Use labelled creator-provided stats at launch. Add official connected-account analytics platform by platform after confirming API availability, permissions and creator consent. Do not promise that every social platform can supply every metric automatically.

### Creator Premium — included in launch scope

Create a separate optional paid creator membership at ₹199/month, confirmed by the user during implementation. Free creators can still publish, rank organically and receive bookings. This is distinct from the ₹299/₹499/₹999 company search subscriptions.

- **Paid ranking:** provide clearly labelled Sponsored positions above organic results for premium creators who meet the query's explicit requirements. Use at most two sponsored cards within each 12-card page, fill unused positions organically, and do not duplicate the same creator on that page. Rank eligible sponsored creators by relevance, rotating ties. Paid placement must not inflate match scores or bypass budget, location, availability or publication restrictions.
- **Recommended badges:** active premium members receive a Premium badge. They can also receive an IVRE Recommended badge after an admin records a profile/portfolio quality review, social-ownership verification and confirmation that the account has no unresolved serious trust issue. Explain the criteria and the paid membership relationship in the badge details. Subscription payment alone does not confer the recommendation or a Verified badge. Remove the recommendation when eligibility is lost; keep an audit history and allow an appeal.
- **Faster payouts:** premium members enter the priority release queue once all package deliverables are completed and approved, posting checks are satisfied where required, payout/KYC eligibility is complete, and no dispute or provider hold is active. Do not advance money before those conditions. Publish a faster settlement timeframe only after the provider confirms it is supported; show processing and estimated settlement separately from money actually received.
- **Dashboard and billing:** show membership status, sponsored impressions, profile views, booking conversions, badge eligibility and payout status. Activate membership only on verified payment. Expiry stops sponsored placement and premium badges without hiding the creator's organic profile or interrupting existing orders. Snapshot payout eligibility at order acceptance so expiry does not silently remove a promised benefit from existing work; safety holds still apply.
- **Commercial launch checks:** creator membership price is confirmed at ₹199/month. Tax treatment and a deliverable priority-payout service level remain launch checks before taking membership payments; do not advertise unsupported speed. Use prepaid monthly access with explicit renewal for the initial release. The user has requested implementing the optional membership now while accounting details are resolved later; unresolved booking tax must remain visible and cannot be silently treated as zero.
- **Profitability:** track creator membership revenue separately, alongside incremental completed bookings, sponsored-to-organic conversion differences, and the extra provider/support cost of priority payouts. Do not guarantee creators leads, sales or earnings.

## 5. Booking, payment and delivery

### Cart and brief

Support multiple creators in one persistent company cart and one payment. Each creator receives a separate sub-order, brief, deadline, review history and payout/refund allocation. One disputed creator must not freeze unrelated completed work.

Collect the essential brief **before payment**, an improvement over the original’s post-payment brief: product, objective, deliverables, audience, deadline, references, talking points, CTA, posting requirements and usage rights. Optional AI polishing must not add obligations that the company did not approve.

Checkout shows selected packages, company fee, applicable taxes, total, merchant identity and resolution terms. Revalidate prices and availability before creating payment; require acceptance of changes. Offer only payment methods supported by the merchant and compatible with the required refund flow.

### Confirmed platform fee formula

Both 10% fees use the creator earnings base, not a compounded calculation.

| Component | Example before tax |
|---|---:|
| Creator earnings | ₹10,000 |
| IVRE creator-side markup | ₹1,000 |
| Displayed creator package | ₹11,000 |
| IVRE company-side fee | ₹1,000 |
| Client subtotal | ₹12,000 |

Explain that displayed package prices include the creator-side IVRE fee, and disclose the company-side fee before payment. Successful completion yields ₹2,000 gross platform fees in this example, before operating costs and tax—not ₹2,000 net profit.

### Payment handling

Collect immediately using IVRE-branded Razorpay checkout under the disclosed UKIYOAI PRIVATE LIMITED merchant arrangement. Start the booking only after the backend verifies capture, ownership, amount and currency.

Use a provider-approved marketplace settlement arrangement, with Razorpay Route as the preferred integration. Route supports holding settlement for a transfer until business conditions are met, but product availability and this merchant’s approval must be verified. Website approval alone does not establish it. Do not advertise legal escrow or simulate safeguarded money using a database flag.

Reference: https://razorpay.com/route/

### Acceptance and delivery states

Paid → awaiting creator acceptance → in production → content submitted → revision requested or approved → posting/delivery verification → completed → payout processing → paid.

The creator has 72 hours to accept, with notifications on creation and at 24/48 hours. At 72 hours, expire unanswered requests and notify both sides. Refused or expired requests enter replacement/cancellation handling. Do not automatically suspend a creator merely because the service failed to deliver a notification; introduce warnings and human-reviewed restrictions with an appeal process.

For posting packages, content approval is not completion: the creator submits the live link, IVRE checks available evidence of account/platform/publication, and the client confirms or raises an issue. Where automatic checks are unavailable, use a disclosed manual review rather than pretend verification.

For UGC-only packages, approved final asset delivery satisfies completion; no public post is required. Mixed packages must satisfy every contracted deliverable before release. Usage-right timing must be written into the package terms, and rejected work does not grant the client usage rights.

Send client review reminders at 48 hours and escalate to IVRE after seven days of inactivity. Do not silently auto-approve or leave creators unpaid indefinitely; an admin resolves the case using the agreed evidence and terms.

## 6. Revisions, replacements, refunds and tax

### Revision rule

The standard launch package includes an initial submission plus one revision. A rejection needs specific feedback linked to the agreed brief. Rejection of the revised submission is the second distinct rejection and opens an IVRE dispute review. Duplicate clicks, retries and unrelated files do not count as new rejected submissions.

This supersedes the original’s selectable 1–3 revisions for launch. Never force approval or automatically refund solely because a counter reached a limit. Freeze creator payment while IVRE considers evidence from both sides.

### Replacement-first rule

After an upheld failed-delivery claim:

1. Offer a suitable replacement and obtain the client’s acceptance; do not silently assign one.
2. Apply the creator-package allocation to that replacement. For the example above, this is ₹11,000, including the original ₹1,000 creator-side markup.
3. Retain the original ₹1,000 company fee and do not charge it again for an equal-value replacement.
4. Offer a replacement within seven calendar days. A deadline extension requires the client’s agreement; otherwise provide the package refund.
5. If replacement is unsuitable or cannot be agreed, refund ₹11,000 to the original payment method, plus/minus the approved invoice tax adjustments. Retain only the ₹1,000 company-side fee under the disclosed, legally reviewed policy.
6. Refund any unused allocation for a cheaper replacement. A more expensive replacement needs an explicit incremental quote showing the original credit, any additional company fee on the increased creator base, and tax; never recharge the original company fee.

A refund and replacement cannot spend the same allocation. Retain creator-side fees only when the corresponding replacement service is fulfilled, not as an extra fee on top of the replacement’s package.

Before-work creator refusal/non-response should offer replacement or full cancellation refund. Fraud, duplicate charges, non-delivery, statutory rights and provider chargebacks must not be forced into a blanket non-refundable-fee rule. Final exceptions require reviewed terms, not discretionary hidden rules.

### Tax boundary

Do not assume “GST applies only to IVRE fees” or that creator services are always exempt. Have the accountant confirm the supplier/marketplace arrangement, each creator’s tax treatment, invoices, fee taxes, relevant withholding obligations and replacement/refund adjustments.

GST is not a customer wallet balance or an undefined amount “on hold”. Keep tax and service liabilities separate and use the appropriate invoice/credit-note workflow. Live creator checkout stays disabled until the configuration and terms are approved. This is a launch dependency, not permission for the implementer to invent tax policy.

Razorpay supports partial refunds, subject to payment/account conditions. Refund requests remain pending until the provider confirms their outcome; display the provider’s actual status rather than promising instant receipt.

References:

- https://razorpay.com/docs/api/refunds/?locale=en-US
- https://taxinformation.cbic.gov.in/content-page/explore-act/1000304/1000001 — CGST Section 34, credit/debit notes.

## 7. Restore the original’s operating tools

### Company workspace

Overview, search/history, saved creator lists, campaigns, orders, messages, submissions and approvals, billing/invoices, payment/refund status, team roles and settings. Revenue-critical screens must show real records and clear empty states, not sample activity.

### Creator workspace

Public profile/packages, opportunities, applications, active orders, deliverables, messaging, earnings, payout eligibility/status, availability and settings. Show gross package price, creator earnings and fees distinctly.

### Admin workspace — required for launch

Profile reports, publication/suspension controls, disputed orders, submission evidence, replacement assignment, refund approvals, settlement failures and audit history. Restrict financial actions to authorised staff. Every decision needs an actor, timestamp, reason and order link.

### Messaging, notifications and trust

- Launch with order-linked text, image and document messages plus submission/video assets; add secure ownership checks, upload limits and restricted downloads.
- Moderate attempts to divert transactions, provide understandable warnings and allow review of false positives. Campaign reference links and required post-proof links must remain usable. Public social identities mean complete prevention of off-platform contact is unrealistic.
- Launch transactional email and in-app notifications with delivery tracking and retries. Defer SMS and mobile push until justified by usage/cost.
- Add saved creator lists and two-way reviews limited to completed orders. Reviews appear after both parties submit or after a 14-day review window; report abusive reviews without allowing businesses to edit others’ ratings.
- Label verified identity, verified social ownership and self-reported audience data separately. A paid badge cannot imply verification.

## 8. Implementation foundation and release order

Reuse the existing Vercel applications and shared Supabase project. Keep creator/company profile data and permissions separate while sharing orders and collaboration records. Do not rewrite the stack merely to meet the original’s hypothetical million-user target.

Add the minimum durable records for published profiles, packages, portfolio assets, search results/usage, entitlements, carts, parent orders and creator sub-orders, versioned submissions, disputes, replacements, financial allocations, payment/refund/transfer events, notifications and reviews.

Backend interfaces must cover search/access checks, profile publication, cart operations, server-priced checkout, provider confirmation/webhooks, submission reviews and authorised resolution actions. Use row-level ownership controls, private secrets, atomic quota updates, unique payment event identifiers and idempotent money-moving operations. Keep bookkeeping-only external payments separate from actual captured payments.

Release milestones:

1. **Real supply:** profile editor, publication consent, portfolio, package pricing, availability and authenticated profile pages.
2. **Discovery:** database-backed prompt search, saved results/creators, free-search enforcement, paid company plan entitlements and Creator Premium sponsored placements/badge review. Activate paid products only after real results, tested payment verification and their commercial launch checks are complete.
3. **Transaction:** multi-creator cart, essential brief, itemised checkout, captured payments and provider-approved settlement controls. Finish finance/legal launch dependencies before exposing live booking payments.
4. **Fulfilment:** creator acceptance, notifications, messaging, revision history, posting/asset verification, approval and standard/priority payout queues. Verify provider support before promising a faster premium settlement timeframe.
5. **Resolution and retention:** admin disputes, replacements, refunds, reviews, reconciliation and funnel reporting. These resolution functions must be ready before public paid bookings launch, even if built last internally.

Use additive migrations. Do not reset existing search usage, erase active campaigns, expose private profiles, or silently alter paid customer entitlements. For legacy free companies, any previously used search exhausts the new one-free allowance; preserve their existing results. Existing orders retain their original terms.

## 9. Acceptance tests and business measures

Required tests before enabling payments:

- Only published, eligible profiles appear in real searches; no invented results or unsupported badges.
- Signup returns to the requested page and does not replenish free searches.
- Concurrent requests, team members, direct API access and multiple tabs cannot overspend company quota.
- Failed and empty-result searches do not decrement quota; repeated retries are rate-limited.
- An unpaid company can hire from its saved free results; an expired plan still permits access to existing orders.
- Price changes require consent; ₹10,000 creator earnings produces exactly ₹12,000 before tax.
- One captured payment can fund multiple independent creator sub-orders without double counting.
- Cancelled checkout, duplicate callbacks, replayed webhooks and forged browser amounts do not create paid orders.
- Posting packages cannot release payment on draft approval alone; UGC-only packages do not demand a post link.
- The second distinct rejection opens review; payout and refund cannot race or both consume the same funds.
- The ₹11,000 package allocation is correctly replaced/refunded while the disclosed ₹1,000 company fee is handled separately.
- Provider refund/payout failure remains visible, retryable and reconcilable; no false success status.
- Companies and creators cannot read other users’ private records or change financial state through ordinary browser writes.
- Mobile signup, media playback, search, cart and checkout are usable, with readable labels and keyboard-accessible controls.
- Sponsored cards are labelled, satisfy the query constraints, never duplicate organic cards on the same page and stop on membership expiry.
- Recommended badges require recorded review; payment alone cannot create verification or recommendation status.
- Priority payouts never bypass completion, posting checks, disputes, KYC or provider holds; retries cannot release the same creator allocation twice.

Use test-mode end-to-end runs and reconcile amounts before any controlled, explicitly authorised live test. Release behind feature flags with payment-disable switches and error monitoring.

Measure search-to-login, profile-to-cart, checkout completion, subscription conversion/renewal, creator acceptance, fulfilment time, repeat bookings, disputes and refunds. Track contribution margin per completed booking and per paid plan after creator earnings, processing/search costs, support and refunds; do not count tax or held creator money as IVRE revenue.

## 10. Later roadmap — not launch promises

Add official social analytics integrations, stronger audience verification, richer campaign reporting, optional recurring billing and agency tools after the core transaction flow works reliably. Creator Premium paid ranking, reviewed recommended badges and faster eligible payouts are launch features, not deferred roadmap items.

Any sponsored placement must be clearly labelled and still relevant to the query. Verification and IVRE quality recommendations must remain evidence-based, not purchased. Faster payouts cannot bypass completion/dispute safeguards.

Defer automated performance predictions, an autonomous campaign assistant, native mobile apps, a general-purpose customer wallet and multi-country expansion until transaction volume, operating costs and provider/legal support justify them. Scale search indexes, background jobs and storage from measured bottlenecks rather than premature infrastructure complexity.

## Final decision

**Build the original plan’s complete marketplace experience using Revision 2’s clearer business rules and financial safeguards.** Restore publication verification for posting packages, the operational tools needed to support real paid work, and the user-selected Creator Premium programme: paid ranking, reviewed recommended badges and faster eligible payouts. Preserve the latest one-free-search rule, 10/30/100 paid allowances, ₹299/₹499/₹999 company prices, non-compounded fees and IVRE-reviewed replacement-first resolution.

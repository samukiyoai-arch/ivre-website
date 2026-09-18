# IVRE Creator Marketplace

Source for the IVRE website, company portal, creator portal and shared Supabase marketplace schema.

This is a partial production release. Live Razorpay collection, automated paid-plan activation, Premium ranking/badges, direct-booking fulfilment, refunds and payouts are not complete. See [release status](REVISION-2-RELEASE-STATUS.md) and [the final product plan](IVRE-Revision-2-Final-Plan.md).

## Repository layout

- Root: static website at https://ivre.in.
- `company-dashboard/`: React/Vite company portal at https://ivre-company-dashboard.vercel.app.
- `creator-marketplace/`: React/TypeScript/Vite creator portal at https://app.ivre.in.
- `supabase/migrations/`: marketplace migrations and prerequisite internal-team schema migrations. Unrelated outreach/lead data migrations are intentionally not included.
- `supabase/functions/marketplace-search/`: guest trial search and authenticated trial-claim endpoint.

The portal folders are source snapshots of the existing separately deployed workspaces. Set each Vercel project's Root Directory to its respective folder if connecting these projects to this repository. Root website deployments exclude portal/database source via `.vercelignore`. This Git push does not change Vercel project connections or Supabase configuration.

## Local Preview

```bash
python3 -m http.server 8765
```

Then open `http://127.0.0.1:8765/`.

## Portal development

Run `npm install` inside the chosen portal, set its local environment using `.env.example`, then run `npm run dev`. `npm run build` creates its production output. Company tests run with `npm test`.

Only the Supabase URL and publishable client key belong in `VITE_` variables. Keep Razorpay secrets, service-role keys and other provider credentials in server-side deployment settings, never in Git or browser code. Environment files, browser sessions, downloaded keys, build output and dependencies are excluded.

## Database

These migrations are historical changes to an existing shared Supabase project. Inspect its migration history before applying anything; do not replay migrations against a live project. The original creator migration includes historical demonstration campaign seeds. No production data export, login credentials or lead lists are included.

The current storefront/cart additions do not move money. Payment collection remains disabled until the backend verification, entitlement and settlement workflows are implemented and tested.

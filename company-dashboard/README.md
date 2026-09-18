# IVRE company dashboard

React/Vite company workspace using the shared Supabase database. Supports campaign management, published creator discovery, saved creators, messages, content feedback, external payment records, storefront profiles, cart and campaign briefs.

One matching search is free; subsequent searches require a paid allowance. Company plan prices are ₹299/₹499/₹999 before 18% GST for 10/30/100 searches. Upgrade requests do not charge money or automatically activate a plan.

Copy `.env.example` values into an untracked local environment file, then run `npm install`, `npm run dev`, `npm test`, and `npm run build` as needed. Port 4190 is used for local development.

See the root release-status document for verification and remaining work. Razorpay collection and automated fulfilment, subscriptions, refunds and payouts are not finished. Do not confuse external payment bookkeeping with money transfer.

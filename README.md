# CanopyBargain — canopybargain.com

A complete canopy-tent ecommerce storefront with a built-in **Design Studio**: customers
shop pop-up canopies, design fully custom printed tents on a live 3D model, and check out
in one flow. 100% static — no backend required.

## Features

- **Catalog** — 10 products across custom print tents, pop-up canopies, and accessories,
  with color variants, search, category filters, badges, and related products.
- **Design Studio** (the APCanopy configurator) — per-panel 2D editor (backgrounds,
  patterns, curved text, logo upload, bleed/safe guides) synced live onto a procedural
  3D canopy (10×10 / 10×15 / 10×20, optional walls), with live pricing.
- **Cart** — studio designs attach to cart lines with a design thumbnail, editable
  in place (“edit design” reopens the studio with that line's design). Promo code
  `BARGAIN10` gives 10% off.
- **Checkout** — validated shipping form, demo payment (no real charge), order
  confirmation page with per-item design-file downloads. Orders persist in localStorage.
- The standalone requirements document for the configurator lives in
  [REQUIREMENTS.md](REQUIREMENTS.md).

## Develop

```bash
npm install
npm run dev
```

## Deploy (GitHub Pages)

1. Create a GitHub repo (e.g. `canopybargain`) and push:
   ```bash
   git remote add origin git@github.com:<you>/canopybargain.git
   git push -u origin main
   ```
2. In the repo settings → **Pages** → Source: **GitHub Actions**.
   The included workflow (`.github/workflows/deploy.yml`) builds and deploys on every
   push to `main`.
3. **Custom domain**: `public/CNAME` already contains `canopybargain.com`. At your DNS
   provider, point the domain at GitHub Pages (apex `A` records `185.199.108.153`
   `.109` `.110` `.111`, plus a `www` CNAME to `<you>.github.io`), then set the custom
   domain in the Pages settings and enable **Enforce HTTPS**.

Also deploys unchanged to Vercel/Netlify (build command `npm run build`, output `dist/`).
The app uses hash-based routing, so no server rewrites are needed anywhere.

## Going production-real

- Payments: swap the demo payment step for Stripe Checkout or a Shopify Buy Button —
  `placeOrder()` in `src/shop/cartStore.ts` is the single integration point.
- Order intake: POST the order JSON (includes the full print-ready design) to your
  fulfillment endpoint instead of localStorage.

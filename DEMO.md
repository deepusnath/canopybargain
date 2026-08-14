# CanopyBargain — 5-Minute Client Demo Script

**Audience:** Charles (store owner). **Goal:** show that his catalog + a self-serve
design studio = more custom-canopy orders with zero designer back-and-forth.
**Setup:** fresh browser tab at the live site. Nothing else needed — sample designs
are built in.

## The walkthrough

**1. Home (20s).**
"This is your store, rebuilt. Same products, same prices — pulled live from your
Shopify catalog — with a modern storefront on top." Point at free-shipping bar and
the hero CTA.

**2. Shop (30s).**
Open **Shop**. "All 42 of your products, your photos, your variant pricing.
Watch the filters — Custom Print, Pop-Ups, Party Tents, Accessories." Type
`10x20` in search to show instant filtering.

**3. The wow: Design Studio (2 min).**
Open the **Custom 10×10** product → **Customize in Design Studio**.
- Load the sample design **Summit Athletics** (Save/Load → Sample designs):
  a finished tent appears on the live 3D model. Spin it.
- Click the headline text → drag it, **resize with a corner handle, rotate with
  the top handle**. Point out the 3D updating live.
- Hit **undo** a few times, redo. "Customers can't break anything."
- **Quick Design**: type a brand name, pick two colors, Generate — a complete
  tent in one click. "This is what a customer with no design skills gets."
- Toggle a **back wall** on — price updates live in the header.

**4. Order flow (1 min).**
**Review & Add to Cart** — show the per-panel print summary with exact print
dimensions, then the cart (design thumbnail attached), promo code `BARGAIN10`,
checkout, place order. On the confirmation: **the print-ready design file
downloads right from the order**. "Your print shop gets exactly what they saw."

**5. Close (30s).**
Show the GitHub issue board: "This is the roadmap to fully live — payments,
your domain, the 5×5, templates. Everything you just saw was built in a day
with Claude. Question is only what we ship first."

## Wow-moment checklist
- [ ] 3D spin with a finished design
- [ ] Corner-handle resize + rotate on canvas
- [ ] Undo/redo
- [ ] Quick Design generate
- [ ] Live price change from wall toggle
- [ ] Design file attached to the placed order

## Recovery notes
- If 3D fails (old GPU): the 2D editor keeps working and says so gracefully.
- If the network is down: the whole site is static — everything except the
  hotlinked product photos still works.
- Reset state between runs: Save/Load → Reset design; cart empties after each
  placed order automatically.

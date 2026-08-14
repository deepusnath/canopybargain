# QA Matrix — pre-demo verification (issue #17)

Test journey per cell: home → shop → PDP (variant + photo gallery) → studio
(sample design, handle resize/rotate, undo, wall toggle, add to cart) → cart
(promo) → checkout (validation + place order) → confirmation (design download).

| Environment | Status | Date | Notes |
|---|---|---|---|
| Chromium (headless, automated) | ✅ pass | 2026-08-15 | Full journey automated; WebGL-less fallback path exercised |
| Chromium desktop 1342×969 (Browser pane) | ✅ pass | 2026-08-15 | 3D verified: all sizes, trapezoid textures, live edits |
| Chromium mobile viewport 375×812 | ✅ pass | 2026-08-15 | Stacked layout, no horizontal overflow, editor full-size |
| Chrome (real device, macOS) | ⬜ pending | | |
| Safari (macOS) | ⬜ pending | | Check canvas text metrics + pointer capture |
| Firefox (macOS) | ⬜ pending | | |
| Edge (Windows) | ⬜ pending | | |
| iPhone Safari | ⬜ pending | | Touch drag/resize handles; 3D perf on device |
| Android Chrome | ⬜ pending | | |
| iPad Safari | ⬜ pending | | |

## Automated results (2026-08-15)

- 42 products render with photos on shop grid; search + category filters work
- PDP variant selection updates price/image; out-of-stock variants disabled
- Studio: sample designs load; corner-handle resize verified (exact 1.5× scale
  factor on a 1.5× drag); rotate with Shift-snap; undo/redo round-trips
- Same-on-4-sides mirroring + per-side forking + side-content dots
- Cart: variant-priced lines, design thumbnails, promo BARGAIN10 (−10%)
- Checkout: all 6 validations fire; demo order placed; confirmation shows
  delivery status and design-file download
- Production build + tsc clean; deployed site smoke-tested after each push

## Known environment caveats

- WebGL-less browsers: 3D pane shows a graceful fallback; 2D editor unaffected
- three.js logs 4 console errors before the fallback renders (issue #-deferred,
  low severity)
- Product photos hotlink the client's Shopify CDN — offline demos show grey
  frames for photos while everything else keeps working

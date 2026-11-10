# Suitly — Brand & UI Guide

Method borrowed from a brand-guidelines workflow (palette → type → usage → components), applied to **Suitly's own identity**.

## Colors
| Token | Hex | Use |
|---|---|---|
| Green (primary) | `#173B3B` | Text on light, primary buttons, dark sections |
| Mint (accent) | `#72B6A2` | Highlights, live indicators, icon tiles, focus accents |
| Sand (warm) | `#D5A76B` | Warm tiles, price emphasis, secondary CTA touches |
Rules: one accent per view; no pure black/white-on-white text (use green on tinted off-white); body text ≥ 4.5:1 contrast; shadows are tinted green, never grey/neon.

## Typography
- Headings: **Readex Pro** — Arabic + Latin, friendly but precise.
- Body: **IBM Plex Sans Arabic**.
- Logotype only: **Montserrat** (inside the logo SVG).
- Body ≥ 16px, line-height 1.6–1.75, line length ≤ 70ch.

## Logo
Files in `public/brand/`: `suitly-logo-midnight.svg` (primary), `suitly-logo.svg`, `suitly-icon-512.png` (app icon). Keep clear space ≥ the height of the "S". Never recolor, stretch, or place on busy imagery.

## Voice
Arabic first (clear, warm, Saudi-friendly Modern Standard); English mirrors it. Concrete verbs, no hype ("seamless", "unleash"). Always show the real total before payment.

## UI principles
- Icons: Phosphor, regular weight, one family only; no emojis.
- Layout: asymmetric hero, bento tiles instead of equal 3-column rows, listing rail on mobile.
- States: every async surface has a skeleton, empty and error state; buttons disable while submitting and press with a small translate.
- Motion: transform/opacity only, staggered reveal on load, fully disabled under `prefers-reduced-motion`.
- Touch: targets ≥ 44px; visible focus ring on every interactive element; no horizontal scroll at 375px.
- RTL/LTR: logical properties and direction-aware chevrons (`<Chevron />`).

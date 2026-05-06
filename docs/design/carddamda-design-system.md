# Carddamda Design System

Date: 2026-05-06
Status: V1 design reference
Inspiration: Spotify-style dark, immersive app UI

## Completed Design Reference

The completed design prototype lives in `designbase/`.

Use these files as the visual implementation source of truth:

- `designbase/ShoppingCarta.html`: runnable HTML prototype shell for the completed design
- `designbase/app.jsx`: React prototype for the Carddamda screen, layout, mock states, and component structure
- `designbase/tweaks-panel.jsx`: prototype tweak controls used by the design export

Implementation rule:

- Before building or changing frontend UI, inspect `designbase/ShoppingCarta.html` and `designbase/app.jsx`.
- Prefer `designbase/` over older prose when deciding concrete layout, spacing, component hierarchy, state presentation, and visual styling.
- Preserve the product constraints in `docs/product/` and provider boundaries in `docs/architecture/`; do not copy prototype-only mock behavior as real domain logic.
- The filename `ShoppingCarta.html` is legacy from the earlier name. The product name is Carddamda / 카드담다.

## Design Thesis

Carddamda uses a dark, compact, content-first interface inspired by Spotify's product feel.

The goal is not to copy Spotify branding. The goal is to use a near-black, pill-shaped, high-density app surface where the UI recedes and the user's purchase session becomes the focus.

For Carddamda, the "content color" is not album art. It is:

- card thumbnails
- product images
- price and availability state
- provider badges such as Naver and TCGShop
- the primary green action color

## Visual Tone

The UI should feel:

- immersive
- fast
- compact
- tactile
- app-like, not website-like
- optimized for repeated purchase-session work

The UI should not feel:

- like a marketing landing page
- like a generic ecommerce storefront
- like a collectible gallery
- like a light productivity dashboard
- like a decorative music app clone

## Core Color Tokens

```text
Background: #121212
Surface: #181818
Surface raised: #1f1f1f
Surface card: #252525
Surface card alternate: #272727
Text primary: #ffffff
Text secondary: #b3b3b3
Text tertiary: #cbcbcb
Accent primary: #1ed760
Accent primary hover: #1db954
Border muted: #4d4d4d
Border strong: #7c7c7c
Error: #f3727f
Warning: #ffa42b
Info: #539df5
```

Rules:

- Use near-black surfaces as the default app environment.
- Use green only for functional emphasis: primary search, active states, selected filters, and high-value actions.
- Do not use green as decorative background fill.
- Let product imagery and provider badges create most non-green color.
- Avoid adding a second brand accent color.

## Typography

Use Korean-friendly system fonts rather than proprietary Spotify fonts.

```css
font-family: Pretendard, Inter, "Apple SD Gothic Neo", "Noto Sans KR", "Helvetica Neue", Arial, system-ui, sans-serif;
```

Scale:

- App title: 20-24px, 700
- Section title: 18-20px, 700
- Group title: 15-16px, 700
- Product title: 13-14px, 600
- Price: 14-15px, 700
- Metadata: 12-13px, 400
- Status label: 11-12px, 700
- Button label: 13-14px, 700, uppercase when English-only
- Badge: 10.5-12px, 600

Rules:

- Keep type compact. This is a working app, not editorial content.
- Use weight contrast more than large size jumps.
- Preserve Korean readability. Do not force uppercase for Korean labels.
- English-only button labels may use uppercase with 1.4-2px letter spacing.

## Shape and Controls

Carddamda uses pill and circle geometry for controls.

- Primary button: full pill, 500px-9999px radius
- Secondary button: dark pill, 9999px radius
- Icon button: circle, 50% radius
- Search/input field: pill or soft rounded rectangle, 12-500px radius depending on density
- Result group/card: 6-8px radius
- Badge: 9999px radius or 2-4px radius when space is tight

Rules:

- Buttons should feel tactile and touch-ready.
- Result groups should remain compact and scannable.
- Do not nest cards inside cards.
- Product rows can be flatter than marketing cards.

## Surface and Elevation

```text
Heavy shadow: rgba(0,0,0,0.5) 0px 8px 24px
Medium shadow: rgba(0,0,0,0.3) 0px 8px 8px
Inset border: rgb(18,18,18) 0px 1px 0px, rgb(124,124,124) 0px 0px 0px 1px inset
```

Rules:

- Use dark shade changes before visible borders.
- Use heavy shadows for menus, overlays, and elevated panels.
- Use inset borders for active inputs on dark surfaces.
- Avoid raw gray outlines unless needed for accessibility or focus.

## Layout Principles

- V1 remains a single-screen web app.
- Desktop uses a fixed left input panel and flexible right result workspace.
- Mobile stacks input and results.
- Keep the requested-card group as the central visual unit.
- Use dense spacing, but never let group identity become ambiguous.
- Use the 8px spacing system with compact values: 4, 6, 8, 10, 12, 16, 20, 24.

## Component Defaults

- App shell: `#121212` background.
- Left session panel: `#181818` or `#1f1f1f`.
- Request row: dark raised surface, compact controls, quantity stepper/input.
- Search button: green pill with dark text or high-contrast white text after contrast check.
- Result group: `#181818` or `#1f1f1f`, 6-8px radius.
- Product row: compact row with thumbnail, title, price, seller, metadata, and outbound action.
- External link action: dark or outlined pill; reserve green for the main session search/action.
- Loading/empty/partial-failure states: visible inside the relevant requested-card group.

## Do

- Use near-black backgrounds.
- Use green for primary actions and active states.
- Make buttons pill-shaped and icon controls circular.
- Keep typography compact and high-contrast.
- Let card/product images bring visual color.
- Make requested-card grouping unmistakable.

## Don't

- Do not create a Spotify clone or use Spotify logos/assets.
- Do not use proprietary Spotify fonts.
- Do not use a light dashboard palette for V1.
- Do not make green decorative.
- Do not add marketing hero sections.
- Do not make product results an ungrouped ecommerce feed.

# Carddamda (카드담다) V1 PRD and Figma Make Design Brief

Date: 2026-05-06
Status: Draft for design generation

## Product Definition

Carddamda, branded in Korean as 카드담다, is a purchase-session accelerator for heavy TCG card buyers.

It is not a generic shopping search app, price tracker, collection manager, social product, or account-based shopping service. V1 exists to help a buyer process a multi-card purchase list faster than they can by repeatedly searching Naver Store one card at a time.

The product should feel like a compact buying desk: fast, clear, dense enough for real work, and quiet enough to use during an active purchase session.

## V1 Goal

Let a user enter multiple search terms with separate quantities into one screen, run search once, review grouped results by requested card, and jump out to external product links quickly.

The first wow moment is:

> The user enters a 10-card list and immediately sees search results grouped under each requested card.

## Target User

Heavy TCG card buyers who often buy many individual cards in one session.

They already know what cards they want. They do not need discovery, recommendations, social proof, or editorial content. They need to reduce repeated search, tab switching, and back-navigation friction.

## Core User Flow

1. User opens the single-screen web app.
2. User enters a purchase list in the left input panel.
3. Each row contains a search term field and a separate quantity field.
4. User runs the search.
5. The app validates and normalizes the rows into requested card groups.
6. The app shows loading state per requested card.
7. Search results appear grouped by requested card.
8. User scans product name, price, seller, thumbnail, and relevance.
9. User opens an external product link.
10. User returns to Carddamda and continues with the next card.

## V1 Functional Requirements

### Purchase List Input

- Provide repeatable input rows for search terms and quantities.
- Each row should have a search term input and a separate quantity input.
- Support adding, removing, and editing multiple rows quickly.
- Allow paste-friendly entry where possible, but the primary V1 model is structured rows, not one freeform textarea.
- Show validated requested cards before or during search.
- Preserve user-entered search terms while validating.
- Make validation warnings visible without blocking the whole session.

Expected input examples:

```text
Search term: 피카츄 ex      Quantity: 2
Search term: 리자몽 VMAX   Quantity: 1
Search term: 나오하        Quantity: 3
```

### Session Validation

- Treat search term and quantity as separate fields.
- Default quantity to 1 for newly added rows.
- Require a non-empty search term before searching that row.
- Keep invalid rows visible as warnings.
- Do not hide or discard invalid rows silently.

### Search Execution

- Run search for all valid requested cards.
- Show progress across the whole session.
- Show loading state per requested card group.
- Allow retry for a failed group.
- Avoid making the user restart the whole session for one failure.

### Grouped Results

- Results must be grouped by requested card.
- Every result must clearly show which requested card it belongs to.
- Each group should show:
  - requested card name
  - requested quantity
  - result count
  - group status
  - result list

### Result Item

Each result item should include:

- product thumbnail
- product title
- price
- seller/store name
- brief metadata if available
- external link action

The external link action is the primary action. V1 does not add items to cart automatically.

### Required States

The design must include first-class states for:

- idle state before search
- validation warnings
- loading state
- grouped loading state
- successful results
- no results for a requested card
- partial failure across groups
- retrying a failed group

## Explicitly Out of Scope for V1

- Account system
- Login
- Social features
- Notifications
- Automatic cart insertion
- Browser extension behavior
- Saved collections
- Price history
- Price alerts
- Inventory tracking
- Checkout
- In-app payment
- Recommendation feed
- Marketing landing page

If a design idea does not make the purchase-session flow faster, it should not be in the V1 screen.

## Design Tone

Use the Spotify-inspired dark app system in `docs/design/carddamda-design-system.md`.

The interface should stay calm and high-clarity, but it should feel like a dark purchase-session app rather than a light dashboard.

The interface should feel:

- fast
- compact
- reliable
- utilitarian
- buyer-focused
- information-dense without feeling crowded
- dark-surfaced, with product imagery and state taking visual focus

The interface should not feel:

- like a generic ecommerce homepage
- like a collectible gallery
- like a social app
- like a marketing landing page
- decorative, playful, or overly card-heavy
- like a light productivity dashboard

Visual references:

- combine Spotify-style dark app immersion with a focused procurement or trading workspace
- less like a lifestyle shopping app

## Layout Direction

V1 is a single-screen web app.

Recommended desktop layout:

- left fixed-width panel for structured session input and validated list
- right flexible workspace for grouped results
- top compact command row for search, refresh, and session summary
- no landing hero
- no onboarding cards
- no promotional sections

Recommended mobile layout:

- input and results should stack
- validated list summary should remain easy to revisit
- result groups must remain visually separated
- external link actions must be thumb-friendly

## Information Architecture

Primary hierarchy:

1. Session input
2. Validated requested cards
3. Search status
4. Result groups by requested card
5. Individual external product links

The requested card group is the central unit of the UI. Product results should never appear as an ungrouped feed.

## Typography Rules

Use a Korean-friendly sans-serif typeface that handles Korean, English, and numbers cleanly.

Recommended font stack:

```css
font-family: Pretendard, Inter, "Apple SD Gothic Neo", "Noto Sans KR", system-ui, sans-serif;
```

Typography scale:

- App title: 18-20px, 700
- Panel heading: 14-16px, 650
- Requested card group title: 15-16px, 700
- Product title: 13-14px, 500-600
- Price: 14-15px, 700
- Seller and metadata: 12-13px, 400-500
- Status labels: 11-12px, 600
- Buttons: 13-14px, 600

Rules:

- Do not use hero-scale typography.
- Prioritize scan speed over personality.
- Keep line height compact but readable.
- Product titles may wrap to two lines.
- Prices should be easy to compare vertically.
- Quantity should be visually attached to the requested card, not buried in metadata.

## Color System

Use a dark neutral base with one clear action color.

Suggested tokens:

```text
Background: #121212
Surface: #181818
Surface raised: #1f1f1f
Surface card: #252525
Text primary: #ffffff
Text secondary: #b3b3b3
Text tertiary: #cbcbcb
Primary action: #1ed760
Primary action hover: #1db954
Border muted: #4d4d4d
Border strong: #7c7c7c
Error: #f3727f
Warning: #ffa42b
Info: #539df5
```

Rules:

- Use near-black surfaces as the default app environment.
- Use green only for primary search, active states, and key CTAs.
- Do not use green as decorative background fill.
- Let product images, provider badges, and state indicators provide most non-green color.
- Avoid gradients as the main visual identity.

## Spacing, Density, and Shape

Use compact operational spacing:

- Page padding desktop: 20-24px
- Panel gap: 16px
- Group gap: 12-16px
- Result item padding: 10-12px
- Input padding: 12px
- Button height: 34-38px
- Small control height: 28-32px
- Result group radius: 6-8px
- Button radius: 500px-9999px pill
- Icon button radius: 50% circle

Rules:

- Cards should be functional containers, not decorative marketing cards.
- Do not put cards inside cards.
- Major buttons and controls should follow pill/circle geometry.
- Keep repeated result items aligned for fast comparison.
- Use stable row heights where possible.

## Component System

Design these components:

- App shell
- Session input panel
- Purchase request row with search term input and quantity input
- Validated requested card row
- Validation warning row
- Search command bar
- Session progress indicator
- Result group
- Result group header
- Product result row
- External link button
- Empty group state
- Loading skeleton
- Partial failure banner
- Retry group action

## Interaction Rules

- Search should be the obvious primary action.
- External link should be the obvious product-level action.
- Partial failures should not block successful groups.
- Empty results should be visible under the relevant requested card.
- The user should be able to continue scanning while one group fails.
- Avoid modals for normal flow.

## Figma Make Prompt

Use the following prompt in Figma Make:

```text
Design a single-screen web app called Carddamda, branded in Korean as 카드담다.

Carddamda is a purchase-session accelerator for heavy TCG card buyers. It is not a generic shopping search app and not an ecommerce landing page. The core job is to help a user process a multi-card purchase list faster than searching Naver Store one card at a time.

Create a calm, compact, high-clarity buying workspace optimized for speed, scanning, and grouped search results.

The screen must include:
- A left-side session input panel with repeatable rows. Each row has a search term input and a separate quantity input.
- Fast controls for adding, removing, and editing purchase request rows.
- A validated list preview showing each requested card and quantity.
- Validation warning examples for empty search terms, invalid quantities, or duplicate-looking rows.
- A compact command row with a primary Search button, session status, and refresh/retry affordances.
- A main results workspace on the right.
- Search results grouped by requested card, not as a generic feed.
- Each result group must clearly show the requested card name, requested quantity, result count, and status.
- Each product result row should show thumbnail, product title, price, seller/store name, brief metadata, and an external link button.
- First-class UI states for idle, loading, no results, partial failure, and retrying one failed group.

Use a Spotify-inspired dark app visual style adapted for Carddamda:
- Near-black background (#121212), dark surfaces (#181818, #1f1f1f), white text, and silver secondary text.
- Use one green primary action color (#1ed760), only for search, active states, and key CTAs.
- Buttons and major controls should be pill-shaped (500px-9999px radius); icon buttons should be circular.
- Product images and provider badges should provide most non-green color.
- Use heavy shadows and dark surface variation for depth, not a light dashboard style.
- Clear status colors for warning, error, and info.
- No gradients, no decorative blobs, no marketing hero, no social features, no account UI.
- Avoid oversized cards and gallery-style browsing. This is a working purchase session interface.

Use typography suitable for Korean, English, and numbers:
- Pretendard or similar Korean-friendly sans-serif.
- App title around 18-20px bold.
- Group titles around 15-16px bold.
- Product titles around 13-14px medium.
- Prices around 14-15px bold.
- Metadata around 12-13px.
- Compact line heights for fast scanning.
- English-only button labels may use uppercase and wide letter spacing; do not force that treatment onto Korean labels.

The visual hierarchy should make the requested card group the central unit of the interface. The user should always know which requested card each product result belongs to.

Desktop layout:
- Left fixed-width input panel.
- Right flexible grouped results workspace.
- Compact top command/status row.
- Single-screen app, no landing sections.

Mobile layout:
- Stack input and results.
- Keep group identity and external link actions clear and thumb-friendly.

Include sample Korean TCG card data in the mockup, such as:
- 피카츄 ex x2
- 리자몽 VMAX x1
- 나오하 x3
- 루기아 VSTAR x1

Show realistic mixed states:
- One group with several results.
- One group loading.
- One group with no results.
- One group with a recoverable error and retry action.

The design should look production-ready as a V1 web app, not a concept poster.
```

## Design Acceptance Criteria

The generated design is acceptable only if:

- It is a single-screen application, not a landing page.
- The left input panel and right grouped result area are both visible on desktop.
- Product results are grouped by requested card.
- Quantity is visible near each requested card.
- Loading, empty, and partial-failure states are visible.
- External product link actions are clear.
- The design follows the dark app palette and pill/circle control rules in `docs/design/carddamda-design-system.md`.
- There are no account, social, notification, checkout, or automatic cart features.
- The screen can plausibly help a user process a 10-card purchase list faster than Naver Store directly.

## Notes for Future Implementation

This document defines the product and design target only. Implementation must keep session input validation, provider logic, result normalization, and link generation independently testable. UI components must not parse provider HTML directly.

The completed design prototype lives in `designbase/`. For frontend implementation, use `designbase/ShoppingCarta.html` and `designbase/app.jsx` as the primary reference for concrete layout, component structure, state presentation, spacing, and visual treatment.

For product-source integration rules, use `docs/architecture/search-provider-contract.md` as the reference specification.

# Context Snapshot: result-group-scroll-adjustment

Objective: Fix awkward/non-working internal scroll behavior when a result group has only a few product rows.

Implementation:
- Adjusted result group body max-height from `min(62vh, 720px)` to `min(70vh, 560px)`.
- Kept internal scrolling only for genuinely long groups.
- Added `overscroll-behavior: contain` and `scrollbar-gutter: stable` to reduce nested-scroll friction and layout shift.
- Disabled group-level internal scrolling on mobile so the page scroll handles short and medium result sets naturally.

Verification:
- `npm test`: 5 files passed, 11 tests passed.
- `npm run build`: passed.

Known limitations:
- Desktop still uses internal group scrolling for long result groups to prevent one card search from pushing every other group far down the page.

# Context Snapshot: result-group-layout-fix

Date: 2026-05-07
Objective: Fix result rows visually clipping or interfering when a group has multiple products.

## Root Cause

Result groups needed stronger layout containment. Product rows and empty-state actions could visually feel clipped or crowded because the group body had no explicit scrolling boundary for long lists, and empty/error rows used a space-between flex layout that could press actions into group edges.

## Implementation Summary

- Added bounded internal scrolling to `.sc-group-body` for long result groups.
- Kept collapsed groups hidden explicitly with `.sc-group-body[hidden]`.
- Added minimum product row height and start alignment.
- Allowed long product titles to wrap safely.
- Reworked empty/error rows to grid layout so the TCGShop direct-search action does not overlap or crowd following groups.

## Evidence

- `npm test`: 4 files passed, 8 tests passed.
- `npm run build`: passed.
- Vite HMR accepted `src/app/styles.css`.

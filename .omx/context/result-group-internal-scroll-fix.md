# Context Snapshot: result-group-internal-scroll-fix

Objective: Ensure each search result group scrolls internally when it has around 3 product rows, while the outer results area scrolls when the user scrolls outside a group.

Implementation:
- Changed desktop `.sc-group-body` max-height to `276px`, making 3-row groups overflow inside the card.
- Changed mobile `.sc-group-body` max-height to `242px` and restored internal scrolling.
- Kept `overscroll-behavior: contain` and `scrollbar-gutter: stable`.

Verification:
- `npm test`: 5 files passed, 11 tests passed.
- `npm run build`: passed.

Known limitations:
- Trackpad momentum can still hand off to the outer result list after the internal group reaches its top or bottom. This is expected browser behavior.

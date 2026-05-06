# Context Snapshot: link-rewrite-collapse-empty-input

Date: 2026-05-06
Objective: Rewrite preferred seller links, make result groups collapsible, and start without default card rows.

## Implementation Summary

- Rewrote CardKingdom links to `https://smartstore.naver.com/cardkingdom/products/{productId}`.
- Rewrote Yugioh Store links to `https://smartstore.naver.com/yugiohstore/products/{productId}`.
- Preserved TCGShop links when surfaced via Naver.
- Added collapsible result groups.
- Removed default input rows and added an empty-panel guide.

## Evidence

- `npm test`: 4 files passed, 8 tests passed.
- `npm run build`: passed.
- API spot check for `증식의 G` returns canonical CardKingdom URLs.
- Playwright snapshot shows 0 default rows and the empty input guide.

## Known Limitation

Naver may still redirect canonical SmartStore product URLs to login or rate-limit pages depending on session/security policy. The app now avoids the `smartstore.naver.com/main/products/...` intermediate URL, but it cannot override Naver's access policy.

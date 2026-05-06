# Context Snapshot: preferred-store-filter

Date: 2026-05-06
Objective: Reduce result confusion by showing only CardKingdom, Yugioh Store, and TCGShop listings when available.

## Product Decision

Carddamda should not show every Naver Shopping result. V1 now limits visible product choices to:

- `https://smartstore.naver.com/yugiohstore`
- `https://smartstore.naver.com/cardkingdom`
- TCGShop listings surfaced through Naver Shopping API

Because Naver often returns Smart Store links as `https://smartstore.naver.com/main/products/...`, filtering uses `mallName` first and direct URL slug as a fallback.

## Implementation Summary

- Added preferred seller filter to the Naver provider normalization layer.
- Provider now returns only preferred seller results to UI.
- Updated architecture contract with preferred seller policy.
- Updated fixtures and tests.

## Evidence

- `npm test`: 4 files passed, 7 tests passed.
- `npm run build`: passed.
- Real API spot checks:
  - `푸른눈의 백룡`: 9 filtered results from CardKingdom/Yugioh Store.
  - `블랙 매지션`: 11 filtered results from CardKingdom/Yugioh Store.
  - `증식의 G`: 8 filtered results from CardKingdom.
  - `피카츄 ex`: empty, because no preferred seller result appeared in the Naver API response.

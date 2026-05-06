# Context Snapshot: implement-carddamda-v1

Date: 2026-05-06
Objective: Implement Carddamda V1 as a single-screen purchase-session web app.

## Product Constraints

- Single-screen app.
- Structured purchase request rows with search term and quantity.
- Results grouped by requested card.
- External product links only; no checkout or automation.
- Naver Shopping Search API is the primary provider.
- TCGShop direct crawling is deferred; provide group-level direct search links.
- UI implementation must use `designbase/` as visual source of truth.

## Relevant References

- `AGENTS.md`
- `shoppingcarta-design-20260506.md`
- `docs/product/v1-figma-make-brief.ko.md`
- `docs/design/carddamda-design-system.md`
- `docs/architecture/search-provider-contract.md`
- `designbase/ShoppingCarta.html`
- `designbase/app.jsx`

## Implementation Summary

- Added Vite React/TypeScript app.
- Added Express API server with `/api/search` and `/api/health`.
- Added session validation domain module.
- Added normalized Naver Shopping provider adapter.
- Added TCGShop direct-search link generation.
- Added grouped result contract and state mapping.
- Added fixture-backed tests.

## Open Risks

- `.env.local` must contain `NAVER_CLIENT_ID` and `NAVER_CLIENT_SECRET` for local server searches.
- TCGShop is only surfaced through Naver results or a direct outbound user action in V1.

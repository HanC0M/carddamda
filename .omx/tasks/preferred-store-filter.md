# Task Breakdown: preferred-store-filter

## developer-backend

- Add preferred seller detection for CardKingdom and Yugioh Store.
- Preserve TCGShop via Naver detection.
- Filter provider output after normalization and dedupe.
- Keep filtering out of UI components.

Status: complete

## qa-agent

- Extend fixture tests for preferred seller filtering.
- Run unit tests and build.
- Spot-check real API responses.

Status: complete

## release-reviewer

- Confirm UX goal is met: fewer choices, only trusted sellers shown.
- Confirm architecture rule is met: provider logic remains outside UI.

Status: complete

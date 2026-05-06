# Task Breakdown: implement-carddamda-v1

## developer-frontend

- Implement single-screen React app.
- Use `designbase/` dark UI layout and Carddamda branding.
- Provide search term + quantity rows.
- Show idle, loading, empty, failed, and grouped result states.
- Keep external links as outbound product actions.

Status: complete

## developer-backend

- Implement server-side Naver Shopping API endpoint.
- Keep provider logic under `src/adapters/providers/`.
- Normalize Naver API results to the shared result contract.
- Generate TCGShop direct-search auxiliary action without crawling.
- Keep session validation and group building independently testable.

Status: complete

## qa-agent

- Run unit/integration tests.
- Run production build.
- Verify local dev server and health endpoint.
- Verify real Naver Shopping API key can call official API.
- Verify browser renders the app.

Status: complete

## release-reviewer

- Review implementation evidence.
- Confirm product, architecture, and UX constraints.
- Declare GO or NO_GO.

Status: complete

# QA: deck image recognition import

## Scope
Verify the feature for uploading Yu-Gi-Oh NEURON / Master Duel deck-list images and adding recognized cards to purchase request rows in bulk.

## Evidence
- Unit/integration tests:
  - Command: `PATH=/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin npm test`
  - Result: 13 test files passed, 33 tests passed.
- Production build:
  - Command: `PATH=/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin npm run build`
  - Result: TypeScript and Vite production build succeeded.
- Local server smoke:
  - Command: `npm run dev`
  - App URL: `http://localhost:3002/`
  - `GET http://localhost:5174/api/health`: `{"ok":true,"service":"carddamda"}`
- API missing-config behavior:
  - `POST /api/deck-image-recognition` with a valid image data URL and no local `OPENAI_API_KEY`
  - Result: `503 {"error":"덱 이미지 인식 설정이 아직 연결되지 않았습니다."}`
- Browser flow with mocked recognition response:
  - Playwright uploaded a valid PNG into the hidden file input.
  - Mocked `/api/deck-image-recognition` returned `증식의 G x3`, `무한포영 x2`, one unresolved card, and one warning.
  - UI added both recognized search rows.
  - UI displayed `2개 카드를 구매 요청에 추가했습니다.`
  - UI displayed warning text including `1개 카드는 인식하지 못했습니다.`

## Coverage
- Domain normalization deduplicates recognized cards and sums quantity.
- Purchase-row append logic quantity-merges existing rows by normalized search term.
- API request parser validates data URL MIME/type and missing provider configuration.
- OpenAI adapter test verifies image input and structured output parsing without external network calls.
- UI state flow is verified through browser-level mock API interaction.

## Known limitations
- Actual vision recognition requires `OPENAI_API_KEY` in local/production env.
- Recognition quality depends on screenshot quality and model output; unresolved/low-confidence warnings remain first-class.
- Current UI appends recognized rows directly after provider success. A fuller per-card review table remains future hardening.

## QA verdict
PASS

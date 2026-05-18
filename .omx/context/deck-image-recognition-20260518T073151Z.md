# Ralph Context: deck image recognition import

## Task statement
Implement a feature where users can upload Yu-Gi-Oh NEURON / Master Duel deck-list images and have recognized cards added to the purchase search rows in bulk.

## Desired outcome
- Users can choose a deck-list screenshot from the single-screen app.
- The app sends the image to a server endpoint for recognition.
- The server returns normalized candidate rows with `searchTerm` and `quantity`.
- Recognized rows are appended to the existing purchase request list in bulk.
- Unrecognized or uncertain cards are surfaced as warnings instead of silently disappearing.
- Domain parsing/normalization and API contracts are independently testable.

## Known facts / evidence
- Existing architecture keeps purchase rows in `src/domain/session/validation.ts`.
- Existing API pattern uses Vercel functions under `api/` and local Express routes in `src/server.ts`.
- Existing future design note exists at `docs/architecture/deck-image-recognition.md`.
- Current product rule: V1 remains a single-screen purchase-session accelerator.
- OpenAI Responses API supports image inputs and structured JSON output according to official docs search results.

## Constraints
- Do not parse provider/card-source HTML in UI components.
- Keep recognition/provider logic outside UI.
- Keep the UI compact and consistent with `designbase/` and the dark Carddamda design system.
- Do not start product search automatically; this feature only prepares/updates purchase rows.
- Preserve grouped result behavior.

## Unknowns / open questions
- Production needs `OPENAI_API_KEY`; without it, the endpoint should fail with a clear 503.
- Vision recognition is candidate generation; screenshots with alternate art, small crops, or poor quality may be incomplete.

## Likely touchpoints
- `src/domain/deck-image-recognition/`
- `src/adapters/deck-recognition/openaiVision.ts`
- `src/api/deckImageRecognition.ts`
- `api/deck-image-recognition.ts`
- `src/server.ts`
- `src/app/main.tsx`
- `src/app/styles.css`
- `tests/`

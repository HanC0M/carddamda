# QA: deck recognition low-resolution/name mutation fix

## Scope
Verify that low-confidence recognition guesses and mutated card names are not blindly added to the purchase list.

## Evidence
- Reproduction before fix:
  - Low-resolution synthetic deck image returned both `증식의 G` and `하루 우라라` for source `Ash Blossom & Joyous Spring`.
  - The same run returned `말살의 지명자` for source `Called by the Grave`.
- Focused regression tests:
  - Command: `npm test -- tests/domain/deck-image-recognition.test.ts tests/adapters/openai-deck-recognition.test.ts`
  - Result: 2 test files passed, 5 tests passed.
- Full unit/integration suite:
  - Command: `npm test`
  - Result: 13 test files passed, 36 tests passed.
- Production build:
  - Command: `npm run build`
  - Result: TypeScript and Vite production build succeeded.
- Local live recognition smoke after fix:
  - Input: same low-resolution synthetic deck image.
  - Result: HTTP 200 with exact visible English names preserved: `Blue-Eyes White Dragon`, `Dark Magician`, `Ash Blossom & Joyous Spring`, `Called by the Grave`, `Raigeki`, `Blue-Eyes Spirit Dragon`.
  - Incorrect duplicate/mutated rows were not returned.

## Coverage
- Low-confidence recognized rows are moved to `unresolved`.
- Same `sourceName` conflicts keep only the highest-confidence candidate.
- OpenAI request prompt is tested for visible-title preservation and unresolved-on-uncertainty rules.
- Small uploaded images are upscaled before recognition to improve OCR.

## Known limitations
- If a real image contains only card art and no readable title, the model may still need to infer the card identity. Low-confidence results are now blocked from auto-add.
- English visible titles are now preserved as English search terms rather than translated. This prevents wrong-name mutation, but Korean shop search quality may require a future verified card-name dictionary.

## QA verdict
PASS

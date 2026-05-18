# Context: deck recognition low-resolution/name mutation fix

## User symptom
- Low-resolution deck images fail to produce useful search rows.
- The recognizer mutates card names into incorrect names before adding them to the purchase list.

## Root cause
- The OpenAI prompt asked for Korean shopping search terms, which allowed translation/localization instead of preserving readable card titles.
- Domain normalization only warned on low confidence and still auto-added low-confidence guesses.
- Domain normalization deduplicated by final search term only, so the same `sourceName` could create multiple purchase rows with different names.
- Frontend image preparation downscaled large uploads but did not upscale small screenshots for OCR.

## Fix strategy
- Prefer OCR-visible titles and preserve readable title text exactly.
- Move low-confidence recognized cards into `unresolved` instead of auto-adding them.
- Deduplicate conflicting recognized rows by `sourceName`, keeping the highest-confidence candidate.
- Upscale small upload images to a 1200px long edge before sending to recognition.

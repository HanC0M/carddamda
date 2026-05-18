# Deck Image Recognition Future Plan

Date: 2026-05-07
Updated: 2026-05-18
Status: Implemented as reviewed candidate import

## Purpose

This document captures a future plan for importing card purchase rows from deck-list screenshots such as Yu-Gi-Oh Master Duel deck grids.

This began as a future note and is now implemented as a candidate import path. Carddamda V1 remains a single-screen purchase-session accelerator where users submit card names and quantities, review grouped search results, and leave through external product links.

The implemented version does not start product search automatically. It converts a deck screenshot into purchase request rows, appends recognized cards in bulk, and leaves warnings for unresolved or uncertain cards.

## Problem Shape

Deck screenshots from apps such as Master Duel are not text deck lists. They are card image grids:

- Card names are usually not visible.
- Duplicate cards can be represented by repeated tiles or small quantity badges.
- Main deck and extra deck areas can be visually separated.
- App layouts differ by source, aspect ratio, language, and screen size.

Because of this, plain OCR is not enough. The task is image recognition plus counting:

1. Detect the deck app/template.
2. Locate card tiles.
3. Crop each card tile.
4. Match each crop against a card visual database.
5. Count duplicates and quantity badges.
6. Map the recognized card to a Korean search name.
7. Let the user review before adding rows.

## Product Direction

The first viable version should be a candidate generator, not a fully automatic importer.

Carddamda should show:

- Recognized cards: card image, proposed Korean search name, quantity, confidence.
- Needs Korean name: visually recognized card with no approved Korean search mapping.
- Unresolved cards: cropped tile image and a manual input field.

The user must confirm or edit the result before rows are appended to the existing purchase-request list. This preserves the product rule that the user always knows which requested card a result belongs to.

## Data Source Assessment

### YGOPRODeck

YGOPRODeck is useful as an initial public data source for:

- card IDs/passcodes
- English names
- card image metadata
- Master Duel format metadata where available

Limitations:

- It does not provide Korean card names through the public API.
- Its documented language support is English, French, German, Portuguese, and Italian.
- It warns against continuous hotlinking of card images. Matching images should be downloaded and re-hosted or cached by Carddamda before use.

Recommended use:

- Use YGOPRODeck as a bootstrap source for visual identity and English metadata.
- Store matching thumbnails, hashes, or embeddings in Carddamda-controlled storage.
- Do not depend on hotlinked images at runtime.

### Official Yu-Gi-Oh Card Database / NEURON

The official card database and NEURON are stronger candidates for Korean names, but they are not confirmed as stable product APIs.

Open questions before using them as a source:

- Is there a public, documented API suitable for server-side synchronization?
- Are Korean card names available through that API or only through web/app UI?
- Do the terms allow automated synchronization or redistribution of derived name mappings?
- Are rate limits, authentication requirements, and locale behavior stable enough for production?

Recommended position:

- Treat the official database as a research candidate for Korean name mapping.
- Do not build V1 or early V2 around HTML scraping of official pages.
- If official access is not available, maintain a Carddamda-owned Korean search-name mapping table populated by admin review and user suggestions.

## Proposed Internal Data

The future implementation should keep visual recognition and Korean search naming separate.

### `card_visual_identity`

Purpose: identify a card from an image crop.

Suggested fields:

- `card_id`
- `english_name`
- `source`
- `source_card_url`
- `image_storage_url`
- `image_hash`
- `embedding_ref`
- `formats`
- `updated_at`

### `card_korean_name_mapping`

Purpose: map a recognized card to a Korean search term usable in Carddamda.

Suggested fields:

- `card_id`
- `english_name`
- `korean_search_name`
- `aliases`
- `source`
- `status`: `approved` or `needs_review`
- `reviewed_at`
- `updated_at`

### `deck_image_templates`

Purpose: support multiple screenshot sources without hardcoding all layout logic together.

Suggested fields:

- `template_id`
- `source_app`: `master_duel`, `neuron`, or another app key
- `version`
- `main_deck_region`
- `extra_deck_region`
- `tile_grid_rules`
- `quantity_badge_rules`
- `active`

## Recognition Pipeline

1. Validate upload: `jpg`, `png`, or `webp`, with a strict size limit.
2. Detect template from image dimensions, visual anchors, and deck labels.
3. Extract main-deck and extra-deck card tile crops.
4. Detect quantity badges or repeated cards.
5. Match each crop against local visual identity data.
6. Group matches by `card_id`.
7. Join Korean search-name mappings.
8. Return results in three buckets:
   - `recognized`
   - `needs_korean_name`
   - `unresolved`
9. Append only user-confirmed rows to the existing `searchTerm + quantity` purchase list.

## API Shape

Future endpoint:

```ts
POST /api/deck-image-recognition
```

Input:

- multipart image file

Output:

```ts
type DeckImageRecognitionResponse = {
  sourceTemplate: string | null;
  recognized: RecognizedDeckCard[];
  needsKoreanName: RecognizedDeckCard[];
  unresolved: UnresolvedDeckTile[];
  warnings: string[];
};
```

The endpoint should not start product search. It only prepares purchase rows.

## Testing Requirements

Required fixtures:

- Master Duel deck screenshot with main deck and extra deck.
- Cropped card tile examples.
- Duplicate quantity examples.
- Low-confidence or unmatched cards.
- Korean mapping present and missing cases.

Required test areas:

- template detection
- tile extraction
- quantity counting
- visual match confidence thresholding
- Korean search-name mapping
- unresolved-card fallback
- append-to-purchase-rows UI flow

## Risks

- Recognition accuracy can be poor if screenshots are compressed, cropped, themed, or scaled.
- Alternate artworks and rarity overlays can confuse image matching.
- Korean card names may not be available from a reliable public API.
- Official database scraping may create maintenance and policy risk.
- Image storage and embedding generation add cost and operational complexity.

## Implemented V1 Behavior

- The session panel accepts `jpg`, `png`, and `webp` deck screenshots.
- The browser resizes/compresses the screenshot before upload to keep request payloads bounded.
- `POST /api/deck-image-recognition` validates the image data URL and sends it to the recognition provider.
- The initial provider is OpenAI vision through the Responses API with structured JSON output.
- Provider logic lives outside UI under `src/adapters/deck-recognition/`.
- Response normalization and duplicate quantity merging live under `src/domain/deck-image-recognition/`.
- Recognized cards are appended to the existing purchase rows. Existing matching rows are quantity-merged.
- Unresolved cards and provider warnings are shown in the panel.

Required environment:

```text
OPENAI_API_KEY=
OPENAI_DECK_RECOGNITION_MODEL=gpt-5.2
```

## Decision

Implement deck image recognition as a bounded import flow backed by:

1. a vision provider that returns candidate Korean search names,
2. independently testable response normalization,
3. visible unresolved-card warnings, and
4. purchase-row append/merge behavior before the user runs search.

Future hardening can still add local visual identity data, a Korean search-name mapping table, app-specific deck templates, and a fuller review table before append.

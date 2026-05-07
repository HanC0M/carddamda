# Deck Image Recognition Future Plan

Date: 2026-05-07
Status: Future architecture note

## Purpose

This document captures a future plan for importing card purchase rows from deck-list screenshots such as Yu-Gi-Oh Master Duel deck grids.

This is not a V1 implementation commitment. Carddamda V1 remains a single-screen purchase-session accelerator where users submit card names and quantities, review grouped search results, and leave through external product links.

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

## Decision

Do not implement deck image recognition in V1.

For a future version, implement it as a reviewed import flow backed by:

1. local visual identity data derived from an allowed card source,
2. a separately maintained Korean search-name mapping table,
3. app-specific deck image templates, and
4. a user confirmation UI before adding purchase rows.

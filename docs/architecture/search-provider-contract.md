# Search Provider Contract

Date: 2026-05-06
Status: V1 reference specification

## Purpose

This document defines how Carddamda, branded in Korean as 카드담다, retrieves and normalizes external product information in V1.

Carddamda is a purchase-session accelerator, not a generic shopping crawler. Provider integrations must help users process grouped purchase requests faster while keeping provider-specific logic outside UI components.

## V1 Provider Policy

### Naver Shopping

`naver-shopping` is the primary V1 provider.

- Use the official Naver Shopping Search API from the server side.
- Keep `NAVER_CLIENT_ID` and `NAVER_CLIENT_SECRET` on the server. Never expose them to the browser.
- Use the API to search each validated purchase request row.
- Normalize API results before they reach UI state.
- Deduplicate results by provider product ID when available.
- After normalization, show only preferred sellers in V1: 카드스퀘어, `카드킹덤`, `카드냥`, and TCGShop listings surfaced through Naver.

Recommended initial API defaults:

- `sort=sim`
- `exclude=used:rental:cbshop`
- `display=40` per search term for V1
- Query each requested card with the raw search term, a CardSquare-biased search term, `"{searchTerm} 카드스퀘어"`, and a CardNyang-biased search term, `"{searchTerm} 카드냥"`, unless the user already included the corresponding seller term.
- If users report that a missing result is listed under another keyword, accept a local companion-keyword rule such as `"체셔 캣" should also search `"체셔캣"`. Apply those rules before provider-specific expansion.

These defaults can change after real purchase-session testing, but the normalized result contract should remain stable.

### Preferred Seller Filter

V1 intentionally limits visible product choices to reduce purchase-session confusion.

Allowed product results:

- CardSquare results identified by `mallName` or SmartStore routing
- `https://smartstore.naver.com/cardkingdom`
- `https://smartstore.naver.com/cardnyang`
- TCGShop listings when they appear through the Naver Shopping API

Filtering rules:

- Prefer `mallName` matching because Naver may return Smart Store links as `https://smartstore.naver.com/main/products/...`.
- Accept `카드스퀘어`, `유희왕STORE`, `유희왕스토어`, `yugiohstore`, or `yugioh store` as 카드스퀘어.
- Accept `카드킹덤`, `cardkingdom`, or `card kingdom` as CardKingdom.
- Accept `카드냥`, `cardnyang`, or `card nyang` as 카드냥.
- Also accept direct Smart Store slug URLs for `/sulyunyen/`, legacy `/yugiohstore/`, `/cardkingdom/`, and `/cardnyang/`.
- Preserve Naver Shopping API `link` values for outbound clicks. Do not rewrite SmartStore links to guessed canonical slugs; `https://smartstore.naver.com/main/products/...` is the provider-owned routing URL and may resolve differently per product/store state.
- Do not show general Naver catalog results or unrelated smart stores in V1.

### TCGShop

Do not directly crawl TCGShop search-result HTML in V1.

The site currently exposes restrictive crawl guidance in `robots.txt`, including broad disallow rules and a long crawl delay. V1 should avoid depending on direct automated search-result scraping.

TCGShop support in V1 works in two safer ways:

1. If a Naver Shopping API result represents a TCGShop listing, show it as a normal product result with a TCGShop source tag.
2. If no TCGShop listing appears through Naver, provide a group-level external action labeled `TCGShop에서 직접 검색`.

The TCGShop direct-search action is not a product result. It is a user-initiated outbound link.

### Reference Repository

`https://github.com/tcg-optimizer/tcg-be` may be used as a behavioral reference for ideas such as:

- normalized price fields
- provider separation
- Naver Shopping API usage
- TCGShop EUC-KR handling, if direct integration is ever approved

Do not copy code from that repository into Carddamda. No root license file was found during inspection, so implementation should be original.

## Normalized Result Contract

Every provider result must be normalized before UI consumption.

```ts
type SearchProviderId = "naver-shopping" | "tcgshop-direct";

type ProductAvailability = "available" | "unavailable" | "unknown";

type NormalizedProductResult = {
  provider: SearchProviderId;
  merchantName: string;
  title: string;
  price: number | null;
  imageUrl: string | null;
  externalUrl: string;
  productId: string;
  availability: ProductAvailability;
  sourceTags: string[];
};
```

V1 expected `sourceTags`:

- `tcgshop-via-naver`: Naver Shopping API result appears to be a TCGShop listing.

Rules:

- UI components consume only normalized results.
- UI components must not parse provider HTML.
- Provider-specific parsing and mapping live under `src/adapters/providers/`.
- Link generation must be independently testable.
- Missing provider fields should become `null` or `unknown`, not ad hoc placeholder strings.

## Group Response Contract

Search is initiated from validated purchase request rows.

```ts
type PurchaseRequest = {
  id: string;
  searchTerm: string;
  quantity: number;
};

type SearchGroupStatus = "idle" | "loading" | "success" | "empty" | "partial" | "failed";

type SearchResultGroup = {
  requestId: string;
  searchTerm: string;
  quantity: number;
  status: SearchGroupStatus;
  results: NormalizedProductResult[];
  auxiliaryActions: SearchAuxiliaryAction[];
  errorMessage: string | null;
};

type SearchAuxiliaryAction = {
  id: string;
  label: string;
  externalUrl: string;
  reason: string;
};
```

TCGShop direct search should be represented as an auxiliary action:

```ts
{
  id: "tcgshop-direct-search",
  label: "TCGShop에서 직접 검색",
  externalUrl: "http://www.tcgshop.co.kr/search_result.php?search=meta_str&searchstring=...",
  reason: "TCGShop direct search is user-initiated in V1."
}
```

## Provider Behavior

### Naver Result Mapping

Map Naver Shopping API fields as follows:

- `provider`: `naver-shopping`
- `merchantName`: normalized seller display name. For preferred Smart Store sellers, show 카드스퀘어 for CardSquare/Yugioh Store matches, 카드킹덤 for `cardkingdom`, and 카드냥 for `cardnyang`.
- `title`: API title with markup removed
- `price`: numeric `lprice`, or `null` if unavailable
- `imageUrl`: `image`, or `null`
- `externalUrl`: `link`
- `productId`: `productId` when available, otherwise a deterministic URL-based fallback
- `availability`: `unknown`
- `sourceTags`: include `tcgshop-via-naver` when TCGShop is detected

After this mapping, filter out any result that is not CardKingdom, 카드스퀘어, 카드냥, or TCGShop via Naver.

### Companion Keyword Rules

When a requested card returns no results, the UI can collect a user-provided rule:

```ts
type KeywordSearchRule = {
  sourceKeyword: string;
  targetKeyword: string;
};
```

Rules:

- Store these rules in the browser for V1. They are session acceleration hints, not canonical product data.
- Apply rules only by exact normalized source keyword match.
- If a user says `AA` should search with `BB`, the provider should query both `AA` and `BB`, then apply normal provider-specific expansion such as CardSquare-biased terms.
- Keep rule parsing and expansion in domain code, not UI components.

TCGShop detection should use conservative matching:

- `mallName` includes `TCGShop` or `tcgshop`
- or `externalUrl` hostname belongs to `tcgshop.co.kr`

### TCGShop Direct Link

Generate the direct search URL from the user's search term.

Rules:

- Treat this as a user outbound action only.
- Do not fetch or parse the TCGShop search page in V1.
- Keep the action at the requested-card group level.
- Do not mix the action into product result rows.

## Error and State Rules

- A provider failure for one requested card must not fail the whole purchase session.
- A failed group should be retryable independently.
- An empty result group must still show the original `searchTerm` and `quantity`.
- Partial provider failure should be visible but should not hide successful results.
- The user should always know which requested card a result belongs to.

## Analytics

V1 uses Mixpanel only from the browser and only when `VITE_MIXPANEL_TOKEN` is configured.

Tracked events:

- `Search Completed`: request count, keyword rule count, and empty group count.
- `Search Failed`: request count.
- `Result Group Retried`: search term, result count, and final status.
- `Keyword Rule Added`: source keyword, target keyword, and saved rule count.

Rules:

- Do not send API keys or provider credentials to analytics.
- Keep analytics optional. The app must run normally without a Mixpanel token.
- Do not track raw product links or secret environment variables.

## Testing Requirements

Provider changes require fast tests before UI or E2E tests.

Required coverage:

- Naver API result normalization
- title markup removal
- price number conversion
- product ID deduplication
- TCGShop detection via `mallName`
- TCGShop detection via URL hostname
- preferred seller filtering for CardKingdom, 카드스퀘어, 카드냥, and TCGShop
- exclusion of general Naver catalog results and unrelated smart stores
- direct TCGShop auxiliary action generation
- group status for success, empty, partial failure, and failed searches
- companion keyword rule validation and search-term expansion

Fixtures should live under `fixtures/` once implementation begins.

## Deferred Work

Direct TCGShop provider integration is deferred until there is a safer access path such as permission, a documented API, an export feed, or another explicit agreement.

If direct integration becomes approved later, add it as `tcgshop-direct` with:

- separate provider adapter
- EUC-KR decoding tests
- HTML parser fixtures
- normalization tests using the same `NormalizedProductResult` contract
- rate limiting that respects the provider's published guidance

# Context Snapshot: preserve-naver-smartstore-links

Objective: Fix product-not-found pages for CardKingdom and CardSquare outbound links.

Root cause:
- The app rewrote Naver Shopping API `link` values into guessed SmartStore canonical slug URLs.
- That is unstable. Naver's `/main/products/{id}` route is the provider-owned resolver and can redirect to different store slugs depending on product/store state.
- Live checks showed:
  - `/main/products/11153000742` redirects to `/cardkingdom/products/11153000742`.
  - `/main/products/11151278987` redirects to `/yugiohstore/products/11151278987`.
  - Earlier CardSquare checks also showed `/main/products/13184266985` redirecting to `/sulyunyen/products/13184266985`.
- Therefore CardSquare/CardKingdom slug guessing is not a stable link-generation strategy.

Implementation:
- Removed preferred SmartStore URL rewriting.
- Normalized results now preserve `item.link` from the Naver Shopping API as `externalUrl`.
- Kept preferred seller detection and display-name normalization.
- Updated tests to assert that `/main/products/...` API links are preserved.
- Updated provider contract docs to prohibit guessed SmartStore slug rewriting.

Verification:
- `npm test`: 5 files passed, 11 tests passed.
- `npm run build`: passed.
- Live provider spot check for `도마우스` now returns:
  - CardKingdom: `https://smartstore.naver.com/main/products/11153000742`
  - CardSquare: `https://smartstore.naver.com/main/products/11151278987`
  - CardSquare: `https://smartstore.naver.com/main/products/10814225376`
- `curl -I` confirmed Naver returns 307 redirects from `/main/products/...` to the current store slug.

Known limitations:
- Browser/login/security behavior is still controlled by Naver SmartStore.
- Do not reintroduce canonical SmartStore URL rewriting unless Naver provides a stable field for the final store slug.

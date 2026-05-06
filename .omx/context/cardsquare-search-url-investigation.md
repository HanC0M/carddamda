# Context Snapshot: cardsquare-search-url-investigation

Objective: Fix two provider issues:
- Search results were biased toward CardKingdom.
- CardSquare product links opened "product not found" pages.

Root cause:
- CardSquare results appear in Naver Shopping as either `mallName: "유희왕STORE"` or `mallName: "카드스퀘어"`.
- General card-name queries often do not include CardSquare results in the first Naver API page, while `"{searchTerm} 카드스퀘어"` does.
- The app rewrote CardSquare links to `/yugiohstore/products/{id}`, but Naver's own `/main/products/{id}` redirect for the reproduced product points to `/sulyunyen/products/{id}`.

Implementation:
- Added CardSquare-biased query expansion in `searchNaverShoppingProvider`.
- Added `buildNaverShoppingSearchTerms` tests.
- Changed CardSquare canonical link rewriting to `https://smartstore.naver.com/sulyunyen/products/{productIdFromNaverLink}`.
- Expanded CardSquare detection to include `카드스퀘어` and `/sulyunyen/`.
- Updated provider contract docs.

Verification:
- `npm test`: 5 files passed, 11 tests passed.
- `npm run build`: passed.
- Live provider spot check:
  - `도마우스`: CardKingdom 1, CardSquare 2.
  - `블랙 매지션`: CardKingdom 10, CardSquare 41.
  - CardSquare links now use `/sulyunyen/products/...`.
- `curl -I https://smartstore.naver.com/main/products/13184266985` returned `307 location: /sulyunyen/products/13184266985`, confirming `/yugiohstore/products/...` was the wrong canonical slug for that product.

Known limitations:
- Naver SmartStore may still return `429` or login/security pages depending on browser/session policy.
- CardSquare-biased search can produce many CardSquare variants for broad terms, but groups are collapsible and internally scrollable.

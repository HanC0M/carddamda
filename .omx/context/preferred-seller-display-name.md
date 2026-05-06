# Context Snapshot: preferred-seller-display-name

Objective: Show `yugiohstore` preferred seller results as `카드스퀘어` in the UI.

Implementation:
- Kept provider detection and canonical SmartStore link generation based on `yugiohstore`.
- Added preferred seller display-name normalization in the Naver Shopping normalizer.
- `유희왕STORE`, `유희왕스토어`, `yugiohstore`, `yugioh store`, and direct `/yugiohstore/` SmartStore slug results now expose `merchantName: "카드스퀘어"`.
- CardKingdom preferred results continue to expose `merchantName: "카드킹덤"`.
- Updated the search provider contract to document display-name normalization.

Verification:
- `npm test`: 4 files passed, 9 tests passed.
- `npm run build`: passed.

Known limitations:
- The outbound SmartStore URL slug remains `yugiohstore`; only the in-app seller display name changes.

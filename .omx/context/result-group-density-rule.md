# Context Snapshot: result-group-density-rule

Objective: Make large multi-card search sessions scannable by defining how many requested-card groups appear expanded at once.

Implementation:
- Added `DEFAULT_EXPANDED_RESULT_GROUPS = 3`.
- After a successful search, the first 3 result groups are expanded and the rest start collapsed.
- After a failed session-level search, failed groups follow the same first-3 expanded rule.
- Added `flex: 0 0 auto` to `.sc-group` so result cards do not shrink and clip their internal scroll containers inside the outer results flex column.

Verification:
- `npm test`: 5 files passed, 11 tests passed.
- `npm run build`: passed.

Known limitations:
- The default expanded count is currently a product constant in `src/app/main.tsx`, not a user preference.

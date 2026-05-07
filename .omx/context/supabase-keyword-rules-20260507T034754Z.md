# Task Snapshot: Supabase Keyword Rules, Mixpanel, Vercel Recovery

## Task statement
Implement the approved plan: recover the production search API, move keyword correction rules to an admin-approved global store, connect Mixpanel, and preserve GitHub/Vercel deployment flow.

## Desired outcome
- `carddamda.vercel.app/api/search` returns JSON successfully in production.
- Users can submit "AA should be searched with BB" suggestions from empty results.
- Suggestions are stored as pending and do not affect searches until admin approval.
- Approved rules apply globally to all users.
- Mixpanel token is configured and keyword suggestion events are tracked.

## Known facts/evidence
- Vercel production currently fails with `ERR_MODULE_NOT_FOUND` for `/var/task/src/api/searchSession` imported from `/var/task/api/search.js`.
- Existing keyword rules are localStorage-based and submitted with `/api/search`.
- Existing analytics wrapper no-ops when `VITE_MIXPANEL_TOKEN` is unset.
- Vercel Production currently has Naver env vars but not Supabase vars.

## Constraints
- V1 remains a single-screen purchase-session accelerator.
- Domain logic stays out of UI components.
- Provider-specific logic stays under `src/adapters/providers/`.
- Parser/provider/session changes need tests.
- Do not expose server-only Supabase credentials to the browser.

## Unknowns/open questions
- Supabase project URL and service role key are not available yet.
- Production DB migration cannot be applied until Supabase credentials/project are provided.

## Likely touchpoints
- `api/search.ts`
- `src/api/searchSession.ts`
- `src/domain/search/keywordRules.ts`
- `src/app/main.tsx`
- `src/app/styles.css`
- new Supabase adapter/API route files
- `.env.example`
- tests under `tests/`

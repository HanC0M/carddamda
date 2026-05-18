# Task Breakdown: deck image recognition import

## developer-backend
- Add domain types and normalization for deck image recognition results.
- Add an OpenAI vision adapter that returns normalized candidates.
- Add API endpoint for Vercel and local Express.
- Validate image MIME/size and missing API key states.

## developer-frontend
- Add compact image upload/import controls to the existing session panel.
- Append recognized rows to the existing purchase request list.
- Show loading, success, partial, and failure states in the panel.

## qa-agent
- Add focused unit/API tests for normalization and endpoint behavior.
- Run full unit test suite and production build.
- Verify the UI compiles and no product source behavior is broken.

## release-reviewer
- Confirm the prompt requirements are mapped to concrete artifacts.
- Confirm the feature keeps domain/provider logic outside UI.
- Return GO only after test/build evidence and known limitations are recorded.

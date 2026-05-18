# Task Breakdown: deck recognition low-resolution/name mutation fix

## developer-backend
- Tighten OpenAI recognition prompt around OCR-first behavior and no readable-title localization.
- Harden recognition normalization against low-confidence guesses and source-name conflicts.

## developer-frontend
- Improve upload image preparation for low-resolution screenshots without changing layout.

## qa-agent
- Add regression tests for low-confidence guesses and conflicting names from the same source card.
- Run focused tests, full tests, and production build.
- Reproduce low-resolution synthetic deck recognition against the local API.

## release-reviewer
- Confirm root cause is addressed at prompt, normalization, and input-preparation boundaries.
- Return GO only after tests/build and reproduction evidence pass.

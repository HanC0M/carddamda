# Carddamda Agent Guide

## Product truth

Carddamda, branded in Korean as 카드담다, is not a generic shopping search app.
It is a purchase-session accelerator for heavy TCG card buyers.

When making product or code decisions, optimize for this:
"Can a user process a multi-card purchase list faster than they can in Naver Store directly?"

If a change improves generic architecture but weakens the purchase-session flow, reject it.

## Scope rules

- V1 is a single-screen web app.
- V1 accepts multiple card names and quantities at once.
- V1 shows grouped search results by requested card.
- V1 sends users out to external product links.
- Do not add account systems, social features, notifications, or automation unless explicitly requested.

## Architecture rules

- Keep domain logic out of UI components.
- Never parse provider HTML in UI components.
- Provider-specific logic lives under `src/adapters/providers/`.
- Session parsing, result normalization, and link generation must be independently testable.
- New provider integrations must implement the same normalized result contract.

## Testing rules

- Any parser change must update or validate fixtures.
- Any session input format change must include parser tests.
- Do not claim success from screenshots alone.
- Prefer fast unit and integration coverage around parsing and state transitions before E2E.

## UX rules

- Default to speed and clarity over feature count.
- The user should always know which requested card a result belongs to.
- Loading, empty, and partial-failure states are first-class UI states.
- Avoid clutter. This tool is for active buyers in the middle of a purchase session.
- Treat `designbase/` as the completed visual design source of truth when implementing or reviewing UI.
- Before changing UI layout, visual style, component structure, spacing, colors, or interaction states, inspect the relevant files in `designbase/`.
- If `designbase/` conflicts with older design prose, prefer `designbase/` for visual implementation details while preserving the V1 product and architecture constraints.

## Workflow rules

- Before changing structure, read `shoppingcarta-design-20260506.md`.
- Before implementing frontend UI, read `docs/design/carddamda-design-system.md` and inspect `designbase/`.
- If a proposed feature is tempting but not clearly part of V1, write it into docs instead of sneaking it into code.
- Keep changes reversible. This product is still discovering its shape.

## Execution harness rules

- For implementation tasks, default to a Ralph-style loop, not one-shot execution.
- Required roles: `developer-frontend`, `developer-backend`, `qa-agent`, `release-reviewer`.
- `release-reviewer` is the only role allowed to declare `GO`.
- If QA or reviewer returns `NO_GO`, continue the loop with those findings as the next task input.
- Do not present work to the user as complete before reviewer `GO`.
- Persist loop artifacts under `.omx/context`, `.omx/tasks`, `.omx/reviews`, and `.omx/state`.

## Ralph loop completion contract

- "Works on my machine" is not completion.
- Passing implementation to the user before QA and release review is not completion.
- Completion requires:
  - implementation summary
  - test evidence
  - known limitations
  - reviewer verdict of `GO`

## Project directories

- `docs/` holds product, architecture, and decision docs.
- `designbase/` holds the completed design prototype and should be used as the visual implementation reference.
- `src/domain/` is the long-lived purchase-session core.
- `src/adapters/providers/naver-store/` is the unstable integration boundary.
- `fixtures/` is mandatory for parser and normalization work.
- `.omx/` stores execution loop state and review artifacts.

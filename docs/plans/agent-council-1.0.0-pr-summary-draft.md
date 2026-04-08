# PR Summary Draft: agent-council 1.0.0 parity + hardening

## Why

Ship `agent-council` as a full `1.0.0` parity release across OpenCode, Claude Code, and Codex while preserving `opencode-council` compatibility.

## What changed

- Extracted shared policy/domain logic into `packages/core`.
- Extracted supervisor/runtime execution flow into `packages/runtime`.
- Kept plugin compatibility by re-export shims in `plugins/orchestration-workflows/*.ts`.
- Upgraded docs with explicit milestones, hardening gates, and release notes draft.

## Parity evidence

- Cross-platform parity scenarios:
  - `tests/cross-platform-parity-scenarios.test.ts`
- Generated adapter conformance:
  - `tests/generated-agent-conformance.test.ts`
  - `tests/adapter-manifest-shape.test.ts`
  - `tests/adapter-contracts.test.ts`

## Validation evidence

- `npm run typecheck` passes.
- `npm test` passes (`54` test files, `482` tests).
- Local tri-platform lifecycle smoke passes:
  - `node ./bin/cli.mjs init --platform opencode --platform claude-code --platform codex --force`
  - `node ./bin/cli.mjs verify --platform opencode --platform claude-code --platform codex`
  - `node ./bin/cli.mjs uninstall --platform opencode --platform claude-code --platform codex`

## Compatibility and migration

- `agent-council` is primary.
- `opencode-council` remains supported as compatibility alias during `1.x`.
- See:
  - `docs/guides/compatibility-and-deprecations.md`
  - `docs/plans/agent-council-1.0.0-release-notes-draft.md`

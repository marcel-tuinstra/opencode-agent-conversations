# agent-council 1.0.0 Hardening Checklist

This checklist is the release gate for `1.0.0`.

## Runtime and parity gates

- [x] Core/runtime extraction moved supervisor planning, dispatch, governance, and budget-critical modules behind `packages/core` and `packages/runtime` with plugin compatibility re-exports.
- [x] OpenCode/Claude Code/Codex adapter installs are manifest-driven and share generated agents/skills.
- [x] Cross-platform parity scenario tests exist for governance, supervisor routing, and dispatch behavior.
- [x] Remaining plugin-local runtime helpers are explicitly accepted as OpenCode adapter-entry modules for `1.0.0`:
  - `plugins/agent-council/index.ts`
  - `plugins/agent-council/opencode-client-adapter.ts`
  - `plugins/agent-council/mcp.ts`
  - `plugins/agent-council/output.ts`
  - `plugins/agent-council/contracts.ts`
  - `plugins/agent-council/budget.ts`
  - `plugins/agent-council/delegation-bridge.ts`
  - `plugins/agent-council/debug.ts`

## Validation gates

- [x] `npm run typecheck` passes.
- [x] `npm test` passes (`56` files, `486` tests).
- [x] Tri-platform lifecycle smoke passes locally:
  - `init --platform opencode --platform claude-code --platform codex --force`
  - `verify --platform opencode --platform claude-code --platform codex`
  - `uninstall --platform opencode --platform claude-code --platform codex`
- [x] Optional golden snapshot refresh for generated artifacts is reviewed and committed when output format changes.

## Compatibility gates

- [x] `agent-council` primary bin remains active.
- [x] `agent-council` remains the sole primary CLI and package name.
- [x] Compatibility policy is documented in `docs/guides/compatibility-and-deprecations.md`.
- [x] Add explicit release note callout for alias deprecation timeline in final `1.0.0` notes.

## Release artifacts

- [x] Draft `1.0.0` release notes with: parity scope, migration path, CLI behavior, and known limits (`agent-council-1.0.0-release-notes-draft.md`).
- [x] Final milestone review against `docs/plans/agent-council-1.0.0-milestones.md`.
- [x] PR summary includes parity evidence and local validation outputs (`agent-council-1.0.0-pr-summary-draft.md`).

# agent-council 1.0.0 Release Notes

## Highlights

- `agent-council` is now the canonical package and CLI for OpenCode, Claude Code, and Codex.
- Runtime governance, supervisor execution, and budget policy now share package-backed implementations via `packages/core` and `packages/runtime`.
- Shared source prompts and skills generate platform artifacts for all three targets.
- Installer supports interactive multi-select and non-interactive multi-`--platform` flows.

## Migration and compatibility

- Existing workflows using `npx agent-council ...` continue to work.
- New installs should use `npx agent-council init`.

Compatibility timeline:

- `1.x`: `agent-council` remains the canonical CLI and package surface.
- Supervisor-specific APIs under `agent-council/supervisor` remain explicitly experimental during `1.x`.

## CLI behavior

- Interactive:

```bash
npx agent-council init
```

- Non-interactive multi-platform:

```bash
npx agent-council init --platform opencode --platform claude-code --platform codex
```

- Management:

```bash
npx agent-council verify
npx agent-council refresh
npx agent-council uninstall
```

## Validation summary

- `npm run typecheck` passes.
- `npm test` passes (`56` files / `486` tests).
- Tri-platform smoke lifecycle passes:
  - init (all 3 platforms)
  - verify (all 3 platforms)
  - uninstall (all 3 platforms)

## Known limits for 1.0.0

- OpenCode plugin entrypoint and a small set of adapter-focused helpers remain intentionally plugin-local:
  `index.ts`, `opencode-client-adapter.ts`, `mcp.ts`, `output.ts`, `contracts.ts`, `budget.ts`, `delegation-bridge.ts`, `debug.ts`.
- These modules are tracked for potential follow-up migration when adapter boundaries are further reduced.

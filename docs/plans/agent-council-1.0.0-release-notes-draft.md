# agent-council 1.0.0 (Draft)

## Highlights

- `agent-council` is now the canonical package and CLI for OpenCode, Claude Code, and Codex.
- Runtime governance, supervisor execution, and budget policy now share package-backed implementations via `packages/core` and `packages/runtime`.
- Shared source prompts and skills generate platform artifacts for all three targets.
- Installer supports interactive multi-select and non-interactive multi-`--platform` flows.

## Migration and compatibility

- `opencode-council` remains available as a compatibility alias.
- Existing workflows using `npx opencode-council ...` continue to work.
- New installs should use `npx agent-council init`.

Deprecation timeline:

- `1.0.x`: alias supported and documented.
- `1.1.x`: alias remains supported with stronger migration messaging.
- `2.0.0` (planned): alias removal candidate, pending final confirmation.

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
- `npm test` passes (`54` files / `482` tests).
- Tri-platform smoke lifecycle passes:
  - init (all 3 platforms)
  - verify (all 3 platforms)
  - uninstall (all 3 platforms)

## Known limits for 1.0.0

- OpenCode plugin entrypoint and a small set of adapter-focused helpers remain intentionally plugin-local:
  `index.ts`, `opencode-client-adapter.ts`, `mcp.ts`, `output.ts`, `contracts.ts`, `budget.ts`, `delegation-bridge.ts`, `debug.ts`.
- These modules are tracked for potential follow-up migration when adapter boundaries are further reduced.

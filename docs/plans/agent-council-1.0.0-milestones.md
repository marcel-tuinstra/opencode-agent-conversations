# agent-council 1.0.0 Milestones

## Scope lock

`1.0.0` ships with parity on all three platforms:

- OpenCode
- Claude Code
- Codex

Mandatory parity areas:

- runtime governance
- supervisor runtime
- budget engine behavior

## Milestone checklist

1. **Architecture freeze** (`done`)
   - package boundaries (`core`, `runtime`, `generator`, adapters, `cli`)
   - capability matrix for OpenCode/Claude/Codex
   - backward compatibility rules for `agent-council`

2. **Core and runtime extraction** (`done`)
   - isolate platform-agnostic logic into `packages/core`
   - isolate runtime lifecycle/scheduler/state into `packages/runtime`
   - keep OpenCode behavior stable while extracting

3. **Shared prompt spec and generation** (`done`)
   - define canonical agent/skill prompt sources in `shared/`
   - generate platform-specific agents for all three platforms
   - add golden snapshots for generated artifacts

4. **OpenCode adapter parity baseline** (`done`)
   - wire OpenCode plugin through `core` + `runtime`
   - verify governance/supervisor/budget parity against current behavior

5. **Unified CLI** (`done`)
   - `agent-council init` interactive auto-detect with multi-select
   - non-interactive `--platform` flags for CI and scripts
   - `verify`, `refresh`, `uninstall` across selected platforms

6. **Claude Code adapter parity** (`done`)
   - generated agents + skill protocol integration
   - parity execution path for governance/supervisor/budget

7. **Codex adapter parity** (`done`)
   - generated agents + skill protocol integration
   - parity execution path for governance/supervisor/budget

8. **Compatibility and release hardening** (`done`)
   - finalize compatibility and migration messaging
   - migration docs and release notes
   - cross-platform conformance tests

Current hardening gate status is tracked in [`agent-council-1.0.0-hardening.md`](./agent-council-1.0.0-hardening.md).

## Exit criteria for 1.0.0

- all three adapters pass the same parity acceptance scenarios
- generated assets come from shared sources only
- interactive and non-interactive install flows both pass
- compatibility and migration messaging remain documented for the `1.x` line

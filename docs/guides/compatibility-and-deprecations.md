# Compatibility and Deprecations

This document is the source of truth for compatibility promises and deprecation timing for the `agent-council` `1.x` line.

## Stability classes

### Stable root (`agent-council`)

Stable runtime exports:

- `AgentConversations`
- `SUPPORTED_ROLES`

Stable CLI command intents:

- `init` - install for selected platforms
- `refresh` - reinstall and prune managed files
- `verify` - health-check installed assets
- `uninstall` - remove managed assets
- `help` - show usage

Rules for `1.x`:

- Do not remove or rename stable root exports.
- Do not remove or rename stable CLI command names.
- Additive flags and additive output are allowed.

### Experimental supervisor entry (`agent-council/supervisor`)

Supervisor helpers remain experimental during `1.x`.

Rules for `1.x`:

- Breaking changes are allowed with release-note callouts.
- Keep supervisor-specific exports off the stable root barrel.

### Internal

Anything not exported from public entry points is internal and may change between releases.

## Configuration compatibility (`1.x`)

Policy file path:

- `.opencode/supervisor-policy.json`

Budget/debug environment variables:

- Existing `ORCHESTRATION_WORKFLOWS_*` env vars remain supported in `1.x` for backward compatibility.
- `AGENT_COUNCIL_DEBUG` is supported as the preferred debug toggle.

## Deprecation policy (`1.x`)

For stable surfaces:

1. Announce deprecation in docs and release notes.
2. Provide a migration path.
3. Keep behavior available for the remainder of the `1.x` line unless there is a security/critical correctness exception.

Removals of stable surfaces are targeted for a future major line.

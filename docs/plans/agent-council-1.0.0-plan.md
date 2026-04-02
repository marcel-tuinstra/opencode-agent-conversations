# agent-council 1.0.0 Plan

## Executive summary

`agent-council` becomes the new product name and ships as `1.0.0` on all three platforms at the same time:

- OpenCode
- Claude Code
- Codex

This is a full-parity release, not a partial port. The `1.0.0` bar includes:

- full OpenCode runtime-governance parity
- heavy supervisor-runtime parity
- budget engine parity
- shared agent definitions across all platforms
- a unified installer with interactive and non-interactive flows
- deprecated backward compatibility for `opencode-council`

The recommended architecture is a monorepo with shared runtime/domain packages, a prompt generator, and thin platform adapters.

## Product decisions

### Name

Use `agent-council` as the primary package, repo, and plugin name.

### Versioning

Release `1.0.0` simultaneously on:

- OpenCode
- Claude Code
- Codex

### Backward compatibility

Keep `opencode-council` as a deprecated compatibility wrapper:

- `npx opencode-council init` continues to work
- old package usage forwards to `agent-council`
- deprecation warnings point users to the new name

### Installer behavior

Default install command:

```bash
npx agent-council init
```

The installer must:

1. auto-detect available platforms
2. show the detected targets to the user
3. present a multi-select prompt
4. allow installing to multiple platforms in one run

Non-interactive mode must also be supported, for example:

```bash
npx agent-council init --platform opencode --platform claude-code --platform codex
```

## Architecture recommendation

## 1. Shared prompt spec plus generator

Shared agent prompts and skill definitions must be the source of truth.

Do not hand-maintain three copies of:

- agents
- deliberation instructions
- supervisor instructions
- role-specific behavior

Instead, define canonical prompt/spec inputs once and generate per platform.

This is mandatory to avoid prompt drift and parity regressions.

## 2. `packages/core`

`packages/core` should contain all pure, platform-agnostic domain logic:

- roles and intent models
- delegation planning
- governance policy
- budget policy and profiles
- approval rules
- protected path rules
- work-unit normalization
- lane planning contracts
- reason codes
- shared event and policy schemas

If a module depends on a host runtime, platform filesystem, or platform session API, it does not belong in `core`.

## 3. `packages/runtime`

Use an embeddable shared runtime package for `1.0.0`, not a standalone sidecar process.

`packages/runtime` should own the cross-platform execution engine:

- supervisor execution workflow
- scheduler and dispatch loop
- durable run/session state
- recovery and repair playbooks
- compaction behavior
- budget enforcement during execution
- observability and audit snapshots
- capability negotiation with platform adapters

A separate daemon can be reconsidered later, but should not be a `1.0.0` dependency.

## 4. Thin platform adapters

Create thin adapters for:

- OpenCode
- Claude Code
- Codex

Adapters should only:

1. translate host events into runtime calls
2. inject generated prompts and config in host-specific format
3. expose host capabilities to the shared runtime
4. normalize host outputs back into shared contracts

Adapters must not reimplement governance or supervisor logic.

## Recommended repository structure

```text
agent-council/
  package.json
  README.md
  docs/
    plans/
    architecture/
    compatibility/

  packages/
    core/
    runtime/
    prompt-spec/
    generator/
    adapter-opencode/
    adapter-claude-code/
    adapter-codex/
    cli/
    compatibility-opencode-council/

  generated/
    opencode/
    claude-code/
    codex/

  fixtures/
    golden/
      prompts/
      transcripts/
      supervisor/
      installers/
```

## Package responsibilities

| Package | Responsibility |
|---|---|
| `core` | Pure business/domain logic and stable shared contracts |
| `runtime` | Shared execution engine for governance, supervisor flows, state, recovery, observability |
| `prompt-spec` | Source-of-truth role, deliberation, and supervisor prompt definitions |
| `generator` | Render prompts, manifests, and generated artifacts per platform |
| `adapter-opencode` | OpenCode integration glue |
| `adapter-claude-code` | Claude Code integration glue |
| `adapter-codex` | Codex integration glue |
| `cli` | Install, detect, verify, refresh, uninstall, configure |
| `compatibility-opencode-council` | Deprecated wrapper package and CLI alias |

## Migration matrix

| Current area/module | Future home | Why |
|---|---|---|
| `types.ts`, role enums, session policy types | `packages/core` | shared contracts |
| `roles.ts` | `packages/core` and `packages/generator` | parsing logic in core, rendered prompts in generator |
| `intent.ts` | `packages/core` | platform-agnostic decision logic |
| `contracts.ts` | `packages/prompt-spec` and `packages/generator` | canonical instruction source |
| `budget.ts`, `budget-governance.ts`, `budget-profiles.ts` | `packages/core` | shared policy and parity |
| `compact.ts` | `packages/runtime` | execution-time compaction |
| `session.ts` | split between `packages/core` and `packages/runtime` | contracts vs live state |
| `mcp.ts` | `packages/runtime` plus adapter capability mapping | shared policy, host-specific enforcement |
| `output.ts` | `packages/runtime` plus adapter normalizers | shared output contract with host differences |
| `work-unit.ts` | `packages/core` | normalized work model |
| `lane-contract.ts`, `lane-plan.ts`, `lane-decomposition.ts` | `packages/core` | planning logic |
| `lane-lifecycle.ts` | `packages/runtime` | execution lifecycle |
| `lane-worktree-provisioner.ts` | `packages/runtime` with adapter hooks | shared orchestration, host-specific execution |
| `durable-state-store.ts` | `packages/runtime` | shared persistence |
| supervisor planning modules | mostly `packages/core` | planning and routing should be shared |
| supervisor execution modules | `packages/runtime` | dispatch, scheduling, run advancement |
| `approval-gates.ts`, `merge-policy.ts`, `review-ready-packet.ts`, `review-coordination.ts` | `packages/core` | shared governance rules |
| `recovery-repair-playbooks.ts` | `packages/runtime` | execution recovery behavior |
| `observability-dashboard.ts` | `packages/runtime` | audit and telemetry |
| OpenCode plugin integration | `packages/adapter-opencode` | host-specific |
| current generated agent markdown files | `packages/prompt-spec` source, rendered by `packages/generator` | no more manual copies |
| `bin/cli.mjs`, `install.sh` | `packages/cli` | unified installer |
| package root exports | root + `packages/compatibility-opencode-council` | controlled compatibility |

## Installer architecture

### Interactive mode

`agent-council init` must:

1. detect installed platforms
2. show them to the user
3. open a multi-select choice UI
4. preselect detected platforms
5. allow multiple selections
6. install all chosen targets in one run

### Non-interactive mode

Support explicit flags:

```bash
agent-council init --platform opencode --platform claude-code --platform codex
```

Also support:

- `verify`
- `refresh`
- `uninstall`

Potential command shape:

```bash
agent-council init
agent-council detect
agent-council verify
agent-council refresh
agent-council uninstall
```

## Cross-platform parity requirements

`1.0.0` is not complete unless all three platforms satisfy the same feature bar.

Non-negotiable acceptance criteria:

- full OpenCode runtime-governance parity
- heavy supervisor-runtime parity
- budget engine parity
- generated shared prompts and skills
- multi-platform installer
- backward compatibility wrapper
- cross-platform conformance testing

## Top technical risks

## 1. Claude Code parity risk

Claude Code may not expose identical extension points for:

- system prompt injection
- session interception
- child session control
- fine-grained tool gating
- transcript attachment and resumability

Mitigation:

- define a capability matrix early
- make runtime depend on capabilities, not platform assumptions
- treat unsupported capabilities as explicit gaps, not hidden branches

## 2. Codex parity risk

Codex is likely the highest adapter effort due to possible differences in:

- system prompt layering
- subagent orchestration boundaries
- worktree lifecycle
- permission model
- resumability and transcript visibility

Mitigation:

- define strict adapter interfaces for:
  - session launch and replacement
  - transcript access
  - tool capability declaration
  - worktree handling
  - budget telemetry inputs

## 3. Supervisor portability risk

The current supervisor foundation is shaped around OpenCode assumptions.

Mitigation:

- extract OpenCode-specific runtime assumptions before building Claude/Codex adapters
- do not let adapter code absorb scheduler or governance logic

## 4. Prompt drift risk

Without generation from shared source, the three platforms will drift.

Mitigation:

- canonical prompt source
- generated artifacts only
- golden snapshots for prompt outputs

## 5. Budget parity risk

Budget parity is more than token thresholds. It includes:

- telemetry collection
- enforcement timing
- compaction triggers
- escalation behavior
- reason codes

Mitigation:

- define a shared `BudgetTelemetry` contract
- document degraded modes when a host cannot provide exact signals

## 6. Installer complexity risk

Multi-target install plus backward compatibility can become brittle.

Mitigation:

- adapter-owned manifests
- shared installer framework
- integration tests for:
  - clean install
  - reinstall
  - partial install
  - multi-platform install
  - wrapper install
  - non-interactive mode

## Delivery sequence

## Milestone 0: architecture freeze

Deliver:

- package boundaries
- prompt source schema
- adapter capability model
- compatibility policy for `opencode-council`

Exit gate:

- no OpenCode-specific dependency remains in proposed `core`

## Milestone 1: extract shared `core` and `runtime`

Deliver:

- `packages/core`
- `packages/runtime`
- migrated OpenCode logic behind shared interfaces
- current tests still green

Exit gate:

- OpenCode behavior remains unchanged under new architecture

## Milestone 2: prompt source plus generator

Deliver:

- `packages/prompt-spec`
- `packages/generator`
- generated OpenCode artifacts
- golden prompt snapshots

Exit gate:

- generated OpenCode prompts are semantically equivalent to current behavior

## Milestone 3: OpenCode adapter parity

Deliver:

- `packages/adapter-opencode`
- full runtime-governance parity
- full supervisor-runtime parity
- budget parity

Exit gate:

- OpenCode is stable and production-ready under `agent-council`

## Milestone 4: unified CLI and installer

Deliver:

- interactive multi-select installer
- non-interactive platform flags
- detect, verify, refresh, uninstall flows

Exit gate:

- one CLI can manage one, two, or all three targets together

## Milestone 5: Claude Code adapter

Deliver:

- generated plugin assets
- runtime integration
- governance parity
- supervisor parity
- capability mapping documentation

Exit gate:

- passes shared conformance suite and parity scenarios

## Milestone 6: Codex adapter

Deliver:

- generated plugin assets
- runtime integration
- governance parity
- supervisor parity
- capability mapping documentation

Exit gate:

- passes shared conformance suite and parity scenarios

## Milestone 7: compatibility wrapper and migration polish

Deliver:

- deprecated `opencode-council` wrapper package
- migration docs
- deprecation warnings
- release and install docs

Exit gate:

- existing OpenCode users can upgrade cleanly

## Milestone 8: release hardening

Deliver:

- cross-platform smoke tests
- installer matrix validation
- changelog and migration notes
- rollback plan
- final parity checklist

Exit gate:

- all three platforms meet the same `1.0.0` capability bar

## Final recommendation

Treat `agent-council` as a multi-platform product, not a renamed OpenCode plugin.

The `1.0.0` architecture should be:

- shared prompt spec plus generator
- shared `core`
- shared embeddable `runtime`
- thin platform adapters
- one installer CLI
- one deprecated compatibility wrapper

OpenCode should be the extraction baseline, then Claude Code and Codex must be forced through the same runtime and prompt contracts. That is the safest path to true three-platform parity without product drift.

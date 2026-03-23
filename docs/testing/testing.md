# Testing Matrix

This project is primarily behavior-driven. The fastest way to validate changes is to run targeted prompts and confirm parser, policy, and output behavior.

## Automated tests

```bash
npm install
npm test
```

The GitHub Actions workflow in `.github/workflows/ci.yml` runs these tests on Node 22 and 24 for every push and pull request.

### Supervisor orchestration regression release gate

For supervisor-heavy releases, run this focused gate before opening/merging:

```bash
npm test -- tests/supervisor-golden-traces.test.ts tests/supervisor-execution-workflow.test.ts tests/supervisor-delegation.test.ts
npm run typecheck
```

What this gate covers:

- deterministic end-to-end orchestration traces (happy path, retry/resume, partial failure, cancellation/recovery)
- execution workflow checkpoint behavior (dispatch, recovery, approval, review, completion)
- role-boundary guardrails across the expanded non-execution roster (`CEO`, `CTO`, `PM`, `PO`, `RESEARCH`, `MARKETING`, `DESIGN`, `QA`, `REVIEWER`)

## Supervisor recovery validation

For fault-injection, recovery completion semantics, and GA-blocking invariants (silent data loss, duplicate side effects, orphaned lane/session bindings), use the dedicated runbook:

- [`supervisor-recovery-runbook.md`](./supervisor-recovery-runbook.md)

## Role Parsing

- `@cto @dev` should detect both roles and produce thread mode.
- `@fe @ux` should detect frontend build plus UX review roles.
- Mentions inside code (inline or fenced) should be ignored.
- File references like `@INSTALL.md` should be ignored.
- Marker payload (`<<ORCHESTRATION_WORKFLOWS:CTO,DEV>>`) should restore roles.
- Delegation marker (`<<DELEGATE:PM,RESEARCH>>`) should be removed from final text while promoting to threaded mode when role lines are present.

## Intent and Turn Planning

- Full-stack implementation prompts should favor `DEV` when no specialist role is explicitly requested.
- Backend prompts should favor `CTO` and `BE` airtime.
- Frontend prompts should favor `FE` with meaningful `UX` participation.
- Marketing prompts should favor `MARKETING` and `CEO` airtime.
- Single-role prompts should remain direct prose.
- Multi-role prompts should start and end with the lead role.
- Heartbeat mode should auto-enable for 3 or more roles and include Frame/Challenge/Synthesize guidance.

## MCP Policy

- No provider mention -> MCP blocked with a clear warning.
- Mentioned provider allowed if installed.
- Unmentioned provider blocked.
- Multi-provider fairness enforced (all named providers touched).
- Call cap blocks extra MCP calls unless deep mode phrase is present.

## Output Normalization

- Thread lines normalized to `[n] ROLE: message`.
- Non-role lines are ignored for thread reconstruction.
- Over-quota role lines are trimmed to target count.
- Missing-provider notice appears only when fairness still unmet.

## Manual Prompt Set

Use these prompts after restarting OpenCode:

```text
@cto @dev @pm Investigate API latency regressions from this week and produce a fix plan.
```

```text
@cto @be @pm Investigate API latency regressions from this week and produce a fix plan.
```

```text
@fe @ux Review the onboarding UI, tighten spacing, and call out usability issues before implementation.
```

```text
@dev This week we saw fresh production incidents; investigate with sentry and github and propose a mitigation.
```

```text
@ceo @marketing @pm Plan a launch narrative and timeline for a six-week release.
```

```text
@research Compare approaches and list evidence with confidence and open questions.
```

## Local shell sanity (non-mutating)

When running quick `opencode run` sanity checks, prefer ownership/routing prompts that do not request implementation. This avoids accidental workspace edits during smoke tests.

```text
@be A customer asks for button spacing and header nav visual polish. Do not edit code; decide ownership and delegation only.
```

```text
@fe Build a new PostgreSQL migration and API endpoint for invoice exports. ownership only.
```

```text
@design Implement this React component and fix TypeScript errors. Decide ownership only.
```

## Specialist boundary regression

Run the dedicated specialist sanity script whenever role routing, aliases, or agent prompts change:

- [`role-sanity-script.md`](./role-sanity-script.md)

This script verifies refusal quality, reroute accuracy, ownership clarity, and supervisor purity across `DEV`, `FE`, `BE`, and `UX`.

When role-boundary heuristics change, pair this manual script with the automated non-execution roster regression in `tests/supervisor-delegation.test.ts`.

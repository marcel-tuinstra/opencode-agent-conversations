# Supervisor Recovery Runbook (SC-522)

This runbook defines the operator-facing recovery path for supervisor failures and the GA-blocking checks that must pass before a run is considered healthy again.

## Fault classes and expected operator action

| Fault class | Typical signal | Expected action | Run expectation after action |
| --- | --- | --- | --- |
| `stuck-heartbeat` | Session heartbeat exceeds stall timeout | Replace session on same lane worktree | Exactly one active session for lane; prior session marked `replaced` |
| `failed-session` | Session marked `failed` | Supervised replace-session retry | Lane points at new active session; no dangling lane/session refs |
| `worktree-drift` / collision / orphan | Reconciliation report includes drift/collision/orphan | Quarantine + destructive approval + rebuild worktree | Lane/worktree mapping restored; no released-or-active mismatch |
| `merge-conflict` | Merge/rebase conflict in lane branch | Pause, resolve conflict in supervised repair session, rebuild artifacts | Lane returns to active/review prep with refreshed evidence |
| `tool-outage` | External system outage | Retry if retryable; escalate otherwise | Retry path preserves durable state, no duplicate replacement mutations |
| `partial-completion` | Missing review artifacts or pending approval | Rebuild artifacts (no pending approval) or escalate pending approval | Lane not marked done until artifacts + approvals are explicitly ready |

## GA-blocking invariants

Treat any of these as blockers (do **not** continue autonomous progression):

1. **Silent data loss:** required review artifacts disappear during recovery (branch/PR/review-packet no longer present after a previously-ready state).
2. **Duplicate side effects:** retry/replacement mutations are replayed more than once for the same mutation ID/timestamp intent.
3. **Orphaned bindings:** lane points to missing session/worktree IDs.
4. **Stuck replacement state:** lane points to a `replaced`/`failed` session after recovery completed.

## Verification checklist after recovery

Use targeted tests and assertions to verify:

- One lane → one active session binding after recovery.
- Replaced session lineage is explicit (`replacementOfSessionId` / `replacedBySessionId`).
- Durable worktree binding remains active and attached to the same lane.
- Recovery mutation IDs are idempotent (no duplicate replacement audit entries).

## Suggested test commands

```bash
npm test -- tests/recovery-repair-playbooks.test.ts tests/supervisor-scheduler.test.ts tests/supervisor-execution-workflow.test.ts
npm run typecheck
```

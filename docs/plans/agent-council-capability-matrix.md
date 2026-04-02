# agent-council Capability Matrix (alpha baseline)

This matrix tracks the platform capability surface that adapters must satisfy for `1.0.0` parity.

Status meanings:

- `native`: directly supported by the host platform
- `adapter`: supported via adapter logic
- `bridge`: supported via shared runtime bridge
- `gap`: not yet implemented for parity

| Capability | OpenCode | Claude Code | Codex |
| --- | --- | --- | --- |
| Role prompt injection | native | adapter | adapter |
| Mention role parsing (`@role`) | native | adapter | adapter |
| Deliberation protocol orchestration | native | bridge | bridge |
| Governance policy evaluation | bridge | bridge | bridge |
| Budget profile enforcement | bridge | bridge | bridge |
| Supervisor lane planning | bridge | bridge | bridge |
| Supervisor dispatch loop | bridge | bridge | bridge |
| Durable run/session state | bridge | bridge | bridge |
| Worktree provisioning | native | adapter | adapter |
| MCP provider gating | native | adapter | adapter |
| Approval gates | bridge | bridge | bridge |
| Review-ready packet assembly | bridge | bridge | bridge |
| Observability snapshots | bridge | bridge | bridge |
| Install/refresh/verify/uninstall | native | adapter | adapter |

## Notes

- This is intentionally an alpha baseline and should be updated per milestone.
- Any `gap` must be closed before `1.0.0` release sign-off.

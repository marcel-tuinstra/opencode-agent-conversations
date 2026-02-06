# Quick Install

```bash
mkdir -p ~/.opencode/plugins ~/.config/opencode/agents
cp plugins/agent-conversations.ts ~/.opencode/plugins/agent-conversations.ts
cp agents/*.md ~/.config/opencode/agents/
```

Restart OpenCode.

Quick test:

```text
@cto @dev @pm Investigate why API latency regressed this week and propose a fix plan.
```

Notes:

- Single mention (`@cto`) -> normal prose answer.
- Multi mention -> numbered thread (`[n] ROLE: message`).
- MCP calls are mention-gated (`sentry`, `github`, `shortcut`, `nuxt`).

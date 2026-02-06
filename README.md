# Agent Conversations Bundle

This bundle contains:

- `plugins/agent-conversations.ts`
- `agents/ceo.md`
- `agents/cto.md`
- `agents/dev.md`
- `agents/marketing.md`
- `agents/pm.md`
- `agents/po.md`
- `agents/research.md`

## What it does

- Multi-agent conversation formatting with `@` mentions.
- Single agent mention -> normal direct answer (no role prefix).
- Multi-agent mention -> numbered threaded output (`[n] ROLE: message`).
- Relevance-weighted airtime (not equal by default).
- Soft MCP behavior:
  - MCP calls are only allowed when provider is explicitly named in prompt.
  - Supported mention-gated providers: `sentry`, `github`, `shortcut`, `nuxt`.
  - If multiple providers are named, the plugin requires touching each provider at least once.
  - If no provider is named, MCP calls are blocked.

## Install

Copy files into your OpenCode config:

```bash
mkdir -p ~/.opencode/plugins ~/.config/opencode/agents
cp plugins/agent-conversations.ts ~/.opencode/plugins/agent-conversations.ts
cp agents/*.md ~/.config/opencode/agents/
```

Restart OpenCode after copying.

## Where agents live

- Global agents: `~/.config/opencode/agents/`
- Project-local agents: `.opencode/agents/`

File name becomes mention name:

- `cto.md` -> `@cto`
- `security-auditor.md` -> `@security-auditor`

Project-local agents let teams keep repo-specific personas without changing global setup.

## Usage examples

- Single role:
  - `@cto We need a 30-day API performance plan with tradeoffs.`
- Duo:
  - `@cto @dev We need to reduce API latency by 40% this quarter; debate options and agree on one plan.`
- Group:
  - `@ceo @cto @dev @po @pm @marketing @research Launch analytics in 6 weeks; debate tradeoffs and produce a phased plan.`

## MCP behavior notes

- No provider named -> no MCP tool calls.
- Provider named -> only that provider can be called.
- Multiple providers named -> each must be checked at least once before final recommendation.
- Default MCP call cap is low (soft mode); ask for deeper investigation to raise it.

## MCP preference customization

This plugin is mention-gated by default. To change provider behavior:

1. Edit provider detection in `plugins/agent-conversations.ts` -> `MCP_PROVIDER_PATTERNS`
2. Edit tool-prefix mapping in `plugins/agent-conversations.ts` -> `providerFromToolName`
3. Adjust call cap in `tool.execute.before` (`cap` value)
4. Adjust `/mcp` suggestion behavior in `experimental.text.complete`

Shortcut-first teams can keep defaults. Jira-first teams should add Jira provider regex + Jira tool prefix mapping.

## If your team uses Jira instead of Shortcut

This plugin currently gates MCP calls by provider names in `MCP_PROVIDER_PATTERNS`.

To support Jira MCP (or any custom MCP), edit `plugins/agent-conversations.ts`:

1. Add provider pattern in `MCP_PROVIDER_PATTERNS`.
2. Add tool-prefix mapping in `providerFromToolName`.
3. Update prompt wording if you want the provider listed in instructions.

Example provider pattern shape:

```ts
{
  key: "jira",
  regex: /\b(jira|atlassian)\b/i,
  hint: "Jira MCP (issues, boards, sprints)"
}
```

Example tool-prefix mapping shape:

```ts
if (tool.startsWith("jira_")) {
  return "jira";
}
```

Also update the `MentionedProvider` union type to include `"jira"`.

## Customize agents

Each agent file supports frontmatter and prompt body.

Common frontmatter fields:

- `description`: when to use this agent
- `mode`: `subagent`, `primary`, or `all`
- `color`: UI color label or hex
- `tools`: enable/disable tools per agent
- `permission`: command-level or tool-level guardrails

Example:

```md
---
description: Jira delivery specialist
mode: subagent
tools:
  write: false
  edit: false
  bash: false
---
You focus on Jira tickets, dependencies, and delivery risks.
Prefer concise status summaries and clear next actions.
```

Tips:

- Keep persona boundaries explicit in the prompt body.
- Keep MCP/provider assumptions out of agent prompts when possible; handle provider rules in plugin logic.
- Use project-local agents for team-specific workflows and terminology.

## If you have no MCP configured

The plugin still works for multi-agent formatting and role weighting.
Mention-gated MCP logic will simply never run if no MCP tools are available.

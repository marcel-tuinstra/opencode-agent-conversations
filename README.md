# OpenCode Agent Conversations Plugin

Community plugin for OpenCode to run and orchestrate multi-agent conversations.

Note: This is an independent community plugin for OpenCode and is not affiliated with or endorsed by OpenCode.

## Why this plugin

This plugin adds structured multi-agent output to OpenCode using `@` mentions. It is aimed at teams that want role-based discussion, clearer debate format, and controlled MCP tool usage in one workflow.

## What you get

- Single mention (`@cto`) returns a normal direct answer.
- Multi-mention prompts produce threaded output like `[n] ROLE: message`.
- Relevance-weighted airtime for better role balance.
- Mention-gated MCP behavior for `sentry`, `github`, `shortcut`, and `nuxt`.

## Quick example

```text
@ceo @cto @dev @po @pm @marketing @research Launch analytics in 6 weeks; debate tradeoffs and produce a phased plan.
```

## Installation

For setup steps, copy commands, and a quick verification prompt, see [`INSTALL.md`](./INSTALL.md).

## Repository layout

- Plugin: `plugins/agent-conversations.ts`
- Agent personas: `agents/*.md`

## Configuration notes

- Default MCP policy is mention-gated by provider name.
- If no provider is named, MCP calls are blocked.
- If multiple providers are named, each must be touched at least once.
- To add Jira (or another provider), update `MCP_PROVIDER_PATTERNS`, `providerFromToolName`, and the `MentionedProvider` union in `plugins/agent-conversations.ts`.
- For full customization (custom MCP checks, adding roles, and authoring agents), see [`CUSTOMIZATION.md`](./CUSTOMIZATION.md).

## Contact

- Website: [`https://marcel.tuinstra.dev`](https://marcel.tuinstra.dev)
- Email: `marcel@tuinstra.dev`

## License

This project is licensed under the MIT License. See `LICENSE` for details.

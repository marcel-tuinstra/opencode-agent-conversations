import { join } from "node:path";
import type { AdapterDescriptor } from "../../runtime/src/adapter-contract.ts";

export const CLAUDE_CODE_ADAPTER_ID = "claude-code" as const;

export const CLAUDE_CODE_ADAPTER: AdapterDescriptor = {
  id: CLAUDE_CODE_ADAPTER_ID,
  install: {
    type: "copy",
    entries: [
      {
        source: "generated/claude-code/agents/be.md",
        destination: "~/.claude/agents/be.md"
      },
      {
        source: "generated/claude-code/agents/ceo.md",
        destination: "~/.claude/agents/ceo.md"
      },
      {
        source: "generated/claude-code/agents/cto.md",
        destination: "~/.claude/agents/cto.md"
      },
      {
        source: "generated/claude-code/agents/dev.md",
        destination: "~/.claude/agents/dev.md"
      },
      {
        source: "generated/claude-code/agents/fe.md",
        destination: "~/.claude/agents/fe.md"
      },
      {
        source: "generated/claude-code/agents/marketing.md",
        destination: "~/.claude/agents/marketing.md"
      },
      {
        source: "generated/claude-code/agents/pm.md",
        destination: "~/.claude/agents/pm.md"
      },
      {
        source: "generated/claude-code/agents/po.md",
        destination: "~/.claude/agents/po.md"
      },
      {
        source: "generated/claude-code/agents/research.md",
        destination: "~/.claude/agents/research.md"
      },
      {
        source: "generated/claude-code/agents/ux.md",
        destination: "~/.claude/agents/ux.md"
      },
      {
        source: "generated/claude-code/skills",
        destination: "~/.claude/skills/agent-council"
      },
      {
        source: "generated/claude-code/.claude-plugin",
        destination: "~/.claude/plugins/agent-council"
      }
    ]
  },
  runtime: {
    promptInjection: "adapter",
    toolGating: "adapter",
    worktrees: "adapter"
  },
  detect(input) {
    return input.pathExists(join(input.homeDir, ".claude")) || input.hasBinary("claude");
  }
};

export const detectClaudeCode = (input: Parameters<typeof CLAUDE_CODE_ADAPTER.detect>[0]): boolean => {
  return CLAUDE_CODE_ADAPTER.detect(input);
};

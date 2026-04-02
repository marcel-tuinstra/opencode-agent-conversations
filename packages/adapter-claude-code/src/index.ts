import { join } from "node:path";
import type { AdapterDescriptor } from "../../runtime/src/adapter-contract.ts";

export const CLAUDE_CODE_ADAPTER_ID = "claude-code" as const;

export const CLAUDE_CODE_ADAPTER: AdapterDescriptor = {
  id: CLAUDE_CODE_ADAPTER_ID,
  install: {
    type: "copy",
    sources: ["generated/claude-code/agents"],
    destination: "~/.claude/agents/agent-council"
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

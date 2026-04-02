import { join } from "node:path";
import type { AdapterDescriptor } from "../../runtime/src/adapter-contract.ts";

export const CODEX_ADAPTER_ID = "codex" as const;

export const CODEX_ADAPTER: AdapterDescriptor = {
  id: CODEX_ADAPTER_ID,
  install: {
    type: "copy",
    sources: ["generated/codex/agents"],
    destination: "~/.codex/agents/agent-council"
  },
  runtime: {
    promptInjection: "adapter",
    toolGating: "adapter",
    worktrees: "adapter"
  },
  detect(input) {
    return input.pathExists(join(input.homeDir, ".codex")) || input.hasBinary("codex");
  }
};

export const detectCodex = (input: Parameters<typeof CODEX_ADAPTER.detect>[0]): boolean => {
  return CODEX_ADAPTER.detect(input);
};

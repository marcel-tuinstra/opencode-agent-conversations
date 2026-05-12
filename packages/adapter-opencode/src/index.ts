import { join } from "node:path";
import type { AdapterDescriptor } from "../../runtime/src/adapter-contract.ts";

export const OPENCODE_ADAPTER_ID = "opencode" as const;

export const OPENCODE_ADAPTER: AdapterDescriptor = {
  id: OPENCODE_ADAPTER_ID,
  install: {
    type: "copy",
    entries: [
      {
        source: "plugins/agent-council.ts",
        destination: "~/.opencode/plugins/agent-council.ts"
      },
      {
        source: "plugins/agent-council",
        destination: "~/.opencode/plugins/agent-council"
      },
      {
        source: "generated/opencode/agents",
        destination: "~/.opencode/agents"
      },
      {
        source: "generated/opencode/skills",
        destination: "~/.opencode/skills/agent-council"
      }
    ]
  },
  runtime: {
    promptInjection: "native",
    toolGating: "native",
    worktrees: "native"
  },
  detect(input) {
    return input.pathExists(join(input.homeDir, ".opencode")) || input.hasBinary("opencode");
  }
};

export const detectOpenCode = (input: Parameters<typeof OPENCODE_ADAPTER.detect>[0]): boolean => {
  return OPENCODE_ADAPTER.detect(input);
};

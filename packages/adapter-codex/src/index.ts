import { join } from "node:path";
import type { AdapterDescriptor } from "../../runtime/src/adapter-contract.ts";

export const CODEX_ADAPTER_ID = "codex" as const;

export const CODEX_ADAPTER: AdapterDescriptor = {
  id: CODEX_ADAPTER_ID,
  install: {
    type: "copy",
    entries: [
      {
        source: "generated/codex/agents/be.toml",
        destination: "~/.codex/agents/be.toml"
      },
      {
        source: "generated/codex/agents/ceo.toml",
        destination: "~/.codex/agents/ceo.toml"
      },
      {
        source: "generated/codex/agents/cto.toml",
        destination: "~/.codex/agents/cto.toml"
      },
      {
        source: "generated/codex/agents/dev.toml",
        destination: "~/.codex/agents/dev.toml"
      },
      {
        source: "generated/codex/agents/fe.toml",
        destination: "~/.codex/agents/fe.toml"
      },
      {
        source: "generated/codex/agents/marketing.toml",
        destination: "~/.codex/agents/marketing.toml"
      },
      {
        source: "generated/codex/agents/pm.toml",
        destination: "~/.codex/agents/pm.toml"
      },
      {
        source: "generated/codex/agents/po.toml",
        destination: "~/.codex/agents/po.toml"
      },
      {
        source: "generated/codex/agents/research.toml",
        destination: "~/.codex/agents/research.toml"
      },
      {
        source: "generated/codex/agents/ux.toml",
        destination: "~/.codex/agents/ux.toml"
      },
      {
        source: "generated/codex/skills",
        destination: "~/.codex/skills/agent-council"
      },
      {
        source: "generated/codex/.codex-plugin",
        destination: "~/.codex/plugins/agent-council"
      }
    ]
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

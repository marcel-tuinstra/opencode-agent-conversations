import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const claudeCtoPath = fileURLToPath(new URL("../generated/claude-code/agents/cto.md", import.meta.url));
const codexCtoPath = fileURLToPath(new URL("../generated/codex/agents/cto.toml", import.meta.url));
const opencodeCtoPath = fileURLToPath(new URL("../generated/opencode/agents/cto.md", import.meta.url));

describe("cross-platform mention orchestration guidance", () => {
  it("embeds mention orchestration protocol in generated Claude and Codex agents", () => {
    const claudeCto = readFileSync(claudeCtoPath, "utf8");
    const codexCto = readFileSync(codexCtoPath, "utf8");

    const opencodeCto = readFileSync(opencodeCtoPath, "utf8");

    for (const body of [claudeCto, codexCto, opencodeCto]) {
      expect(body).toContain("## Cross-Platform Mention Orchestration");
      expect(body).toContain("@cto");
      expect(body).toContain("single parallel batch");
      expect(body).toContain("challenge pass");
      expect(body).toContain("Synthesize the final response with clear per-role sections");
      expect(body).toContain("project name `agent-council`");
    }
  });
});

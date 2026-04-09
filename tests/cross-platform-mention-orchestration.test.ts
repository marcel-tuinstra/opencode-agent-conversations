import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const claudeCtoPath = fileURLToPath(new URL("../generated/claude-code/agents/cto.md", import.meta.url));
const codexCtoPath = fileURLToPath(new URL("../generated/codex/agents/cto.toml", import.meta.url));

describe("cross-platform mention orchestration guidance", () => {
  it("embeds mention orchestration protocol in generated Claude and Codex agents", () => {
    const claudeCto = readFileSync(claudeCtoPath, "utf8");
    const codexCto = readFileSync(codexCtoPath, "utf8");

    for (const body of [claudeCto, codexCto]) {
      expect(body).toContain("## Cross-Platform Mention Orchestration");
      expect(body).toContain("@cto");
      expect(body).toContain("invoke that role as a sub-agent using the host platform's native sub-agent mechanism");
      expect(body).toContain("Synthesize the final response with clear per-role sections");
    }
  });
});

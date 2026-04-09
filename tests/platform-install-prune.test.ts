import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repoRoot = fileURLToPath(new URL("../", import.meta.url));
const cliPath = fileURLToPath(new URL("../bin/cli.mjs", import.meta.url));

const runCli = (homeDir: string, args: string[]) => {
  execFileSync(process.execPath, [cliPath, ...args], {
    cwd: repoRoot,
    env: {
      ...process.env,
      HOME: homeDir
    },
    stdio: "pipe"
  });
};

const seedFile = (path: string, body = "stale") => {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, body, "utf8");
};

describe("manifest platform install prune", () => {
  it("prunes stale claude-code files before install", () => {
    const homeDir = mkdtempSync(join(tmpdir(), "agent-council-claude-"));
    try {
      const staleAgent = join(homeDir, ".claude/agents/agent-council/stale.md");
      const staleSkill = join(homeDir, ".claude/skills/agent-council/stale.txt");
      const stalePlugin = join(homeDir, ".claude/plugins/agent-council/stale.txt");
      seedFile(staleAgent);
      seedFile(staleSkill);
      seedFile(stalePlugin);

      runCli(homeDir, ["init", "--platform", "claude-code", "--force"]);

      expect(existsSync(staleAgent)).toBe(false);
      expect(existsSync(staleSkill)).toBe(false);
      expect(existsSync(stalePlugin)).toBe(false);
      expect(existsSync(join(homeDir, ".claude/agents/agent-council/dev.md"))).toBe(true);
      expect(existsSync(join(homeDir, ".claude/plugins/agent-council/plugin.json"))).toBe(true);
    } finally {
      rmSync(homeDir, { recursive: true, force: true });
    }
  });

  it("prunes stale codex files before install", () => {
    const homeDir = mkdtempSync(join(tmpdir(), "agent-council-codex-"));
    try {
      const staleAgent = join(homeDir, ".codex/agents/agent-council/stale.toml");
      const staleSkill = join(homeDir, ".codex/skills/agent-council/stale.txt");
      const stalePlugin = join(homeDir, ".codex/plugins/agent-council/stale.txt");
      seedFile(staleAgent);
      seedFile(staleSkill);
      seedFile(stalePlugin);

      runCli(homeDir, ["init", "--platform", "codex", "--force"]);

      expect(existsSync(staleAgent)).toBe(false);
      expect(existsSync(staleSkill)).toBe(false);
      expect(existsSync(stalePlugin)).toBe(false);
      expect(existsSync(join(homeDir, ".codex/agents/agent-council/dev.toml"))).toBe(true);
      expect(existsSync(join(homeDir, ".codex/plugins/agent-council/plugin.json"))).toBe(true);
    } finally {
      rmSync(homeDir, { recursive: true, force: true });
    }
  });
});

import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repoRoot = fileURLToPath(new URL("../", import.meta.url));
const cliPath = fileURLToPath(new URL("../bin/cli.mjs", import.meta.url));

const countFilesRecursive = (dir: string): number => {
  let count = 0;

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      count += countFilesRecursive(fullPath);
    } else {
      count += 1;
    }
  }

  return count;
};

const runCli = (args: string[], cwd: string, home: string): string => {
  return execFileSync(process.execPath, [cliPath, ...args], {
    cwd,
    encoding: "utf8",
    env: {
      ...process.env,
      HOME: home
    }
  });
};

describe("cli bundled agents install and verify", () => {
  it("installs all 13 bundled agent profiles on init", () => {
    const tempCwd = mkdtempSync(join(tmpdir(), "opencode-cli-cwd-"));
    const tempHome = mkdtempSync(join(tmpdir(), "opencode-cli-home-"));

    try {
      const output = runCli(["init", "--force", "--budget-profile", "standard"], tempCwd, tempHome);

      expect(output).toContain("agents/  (13 profiles)");
      expect(existsSync(join(tempHome, ".opencode", "agents", "design.md"))).toBe(true);
      expect(existsSync(join(tempHome, ".opencode", "agents", "qa.md"))).toBe(true);
      expect(existsSync(join(tempHome, ".opencode", "agents", "reviewer.md"))).toBe(true);
    } finally {
      rmSync(tempCwd, { recursive: true, force: true });
      rmSync(tempHome, { recursive: true, force: true });
    }
  });

  it("refresh updates bundled agents without deleting local custom agent files", () => {
    const tempCwd = mkdtempSync(join(tmpdir(), "opencode-cli-cwd-"));
    const tempHome = mkdtempSync(join(tmpdir(), "opencode-cli-home-"));

    try {
      runCli(["init", "--force", "--budget-profile", "standard"], tempCwd, tempHome);

      const localCustomAgentPath = join(tempHome, ".opencode", "agents", "my-local-custom-agent.md");
      writeFileSync(localCustomAgentPath, "# local custom agent\n", "utf8");

      const output = runCli(["refresh", "--force", "--budget-profile", "standard"], tempCwd, tempHome);

      expect(output).toContain("agents/  (13 profiles)");
      expect(existsSync(localCustomAgentPath)).toBe(true);
      expect(readFileSync(localCustomAgentPath, "utf8")).toContain("local custom agent");
      expect(existsSync(join(tempHome, ".opencode", "agents", "reviewer.md"))).toBe(true);
    } finally {
      rmSync(tempCwd, { recursive: true, force: true });
      rmSync(tempHome, { recursive: true, force: true });
    }
  });

  it("verify health output reflects the full bundled asset count", () => {
    const tempCwd = mkdtempSync(join(tmpdir(), "opencode-cli-cwd-"));
    const tempHome = mkdtempSync(join(tmpdir(), "opencode-cli-home-"));

    try {
      runCli(["init", "--force", "--budget-profile", "standard"], tempCwd, tempHome);
      const verifyOutput = runCli(["verify"], tempCwd, tempHome);

      const pluginModuleCount = countFilesRecursive(join(repoRoot, "plugins", "orchestration-workflows"));
      const bundledAgentCount = readdirSync(join(repoRoot, "agents")).filter((file) => file.endsWith(".md")).length;
      const expectedTotal = 1 + pluginModuleCount + bundledAgentCount;

      expect(expectedTotal).toBeGreaterThan(60);
      expect(verifyOutput).toContain(`Verifying ${expectedTotal} files`);
      expect(verifyOutput).toContain(`Total: ${expectedTotal}`);
      expect(verifyOutput).toContain("All files match. Installation is healthy.");
    } finally {
      rmSync(tempCwd, { recursive: true, force: true });
      rmSync(tempHome, { recursive: true, force: true });
    }
  });
});

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import * as pluginEntry from "../plugins/agent-council.js";
import * as packageRoot from "../index.js";

const repoRoot = fileURLToPath(new URL("../", import.meta.url));
const packageJsonPath = fileURLToPath(new URL("../package.json", import.meta.url));
const cliPath = fileURLToPath(new URL("../bin/cli.mjs", import.meta.url));

describe("public contract guardrails", () => {
  it("keeps the package entry points stable for 1.0.0", () => {
    const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8")) as {
      name: string;
      exports: Record<string, string>;
      bin: Record<string, string>;
    };

    expect(packageJson.name).toBe("agent-council");
    expect(packageJson.exports).toEqual({
      ".": "./index.ts",
      "./supervisor": "./plugins/agent-council-supervisor.ts",
      "./core": "./packages/core/src/index.ts",
      "./runtime": "./packages/runtime/src/index.ts"
    });
    expect(packageJson.bin).toEqual({
      "agent-council": "bin/cli.mjs"
    });
  });

  it("plugin entry exports only the plugin factory function", () => {
    const exports = Object.keys(pluginEntry);
    expect(exports).toEqual(["AgentConversations"]);
    expect(typeof pluginEntry.AgentConversations).toBe("function");
  });

  it("package root exports the stable barrel and supervisor-only symbols stay off it", () => {
    expect(Object.keys(packageRoot).sort()).toEqual([
      "AgentConversations",
      "SUPPORTED_ROLES"
    ]);

    expect("createSupervisorDispatchPlan" in packageRoot).toBe(false);
    expect("createSupervisorExecutionWorkflow" in packageRoot).toBe(false);
    expect("DEFAULT_SUPERVISOR_POLICY_PATH" in packageRoot).toBe(false);
  });

  it("keeps stable CLI command names and intents discoverable in help output", () => {
    const helpOutput = execFileSync(process.execPath, [cliPath, "--help"], {
      cwd: repoRoot,
      encoding: "utf8"
    });

    expect(helpOutput).toContain("agent-council <command> [options]");
    expect(helpOutput).toContain("init        Install agent-council into selected platforms");
    expect(helpOutput).toContain("refresh     Reinstall from source for selected platforms");
    expect(helpOutput).toContain("verify      Health-check selected platform installs");
    expect(helpOutput).toContain("uninstall   Remove agent-council from selected platforms");
    expect(helpOutput).toContain("help        Show this help message");
  });
});

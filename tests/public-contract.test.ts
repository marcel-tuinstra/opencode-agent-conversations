import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, expectTypeOf, it } from "vitest";
import * as pluginEntry from "../plugins/orchestration-workflows.js";
import * as packageRoot from "../index.js";
import * as supervisorRoot from "../plugins/orchestration-workflows-supervisor.js";
import type {
  DelegationMode,
  DelegationPlan,
  DelegationRequest,
  DelegationWave,
  Intent,
  Role,
  SessionPolicy
} from "../index.js";
import {
  createFileBackedSupervisorStateStore,
  createSupervisorDispatchPlan,
  DEFAULT_SUPERVISOR_PROFILE,
  CHILD_SESSION_TRANSITIONS,
  createSupervisorEvent,
  bridgeDelegationPlan,
  evaluateRetryDecision
} from "../plugins/orchestration-workflows-supervisor.js";
import type {
  DelegationMode as SourceDelegationMode,
  DelegationPlan as SourceDelegationPlan,
  DelegationRequest as SourceDelegationRequest,
  DelegationWave as SourceDelegationWave,
  Intent as SourceIntent,
  Role as SourceRole,
  SessionPolicy as SourceSessionPolicy
} from "../plugins/orchestration-workflows/types.js";

const repoRoot = fileURLToPath(new URL("../", import.meta.url));
const packageJsonPath = fileURLToPath(new URL("../package.json", import.meta.url));
const cliPath = fileURLToPath(new URL("../bin/cli.mjs", import.meta.url));

describe("public contract guardrails", () => {
  it("keeps the package entry points stable for 0.7.x", () => {
    const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8")) as {
      name: string;
      exports: Record<string, string>;
      bin: Record<string, string>;
    };

    expect(packageJson.name).toBe("opencode-council");
    expect(packageJson.exports).toEqual({
      ".": "./index.ts",
      "./supervisor": "./plugins/orchestration-workflows-supervisor.ts"
    });
    expect(packageJson.bin).toEqual({
      "opencode-council": "bin/cli.mjs"
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

  it("plugin entry contains no non-function exports", () => {
    for (const [, value] of Object.entries(pluginEntry)) {
      expect(typeof value).toBe("function");
    }
  });

  it("keeps supervisor exports out of the plugin entry and package root", () => {
    expect("createSupervisorDispatchPlan" in pluginEntry).toBe(false);
    expect("createFileBackedSupervisorStateStore" in packageRoot).toBe(false);
    expect("DEFAULT_SUPERVISOR_PROFILE" in packageRoot).toBe(false);
    // MCP helper types are intentionally internal-only
    expect("McpProviderConfig" in packageRoot).toBe(false);
    expect("McpBlockResult" in packageRoot).toBe(false);
  });

  it("package root re-exports match their source type definitions", () => {
    expectTypeOf<Role>().toEqualTypeOf<SourceRole>();
    expectTypeOf<Intent>().toEqualTypeOf<SourceIntent>();
    expectTypeOf<DelegationMode>().toEqualTypeOf<SourceDelegationMode>();
    expectTypeOf<DelegationRequest>().toEqualTypeOf<SourceDelegationRequest>();
    expectTypeOf<DelegationWave>().toEqualTypeOf<SourceDelegationWave>();
    expectTypeOf<DelegationPlan>().toEqualTypeOf<SourceDelegationPlan>();
    expectTypeOf<SessionPolicy>().toEqualTypeOf<SourceSessionPolicy>();
  });

  it("exports supervisor symbols from the experimental supervisor barrel", () => {
    expect(supervisorRoot.createSupervisorDispatchPlan).toBe(createSupervisorDispatchPlan);
    expect(supervisorRoot.createFileBackedSupervisorStateStore).toBe(createFileBackedSupervisorStateStore);
    expect(supervisorRoot.DEFAULT_SUPERVISOR_PROFILE).toBe(DEFAULT_SUPERVISOR_PROFILE);
  });

  it("exports child-session lifecycle structures from the supervisor barrel", () => {
    expect(CHILD_SESSION_TRANSITIONS).toHaveProperty("pending");
    expect(CHILD_SESSION_TRANSITIONS).toHaveProperty("failed");
  });

  it("exports supervisor event, delegation bridge, and retry symbols from the supervisor barrel", () => {
    expect(supervisorRoot.createSupervisorEvent).toBe(createSupervisorEvent);
    expect(supervisorRoot.bridgeDelegationPlan).toBe(bridgeDelegationPlan);
    expect(supervisorRoot.evaluateRetryDecision).toBe(evaluateRetryDecision);
  });

  it("keeps stable CLI command names and intents discoverable in help output", () => {
    const helpOutput = execFileSync(process.execPath, [cliPath, "--help"], {
      cwd: repoRoot,
      encoding: "utf8"
    });

    expect(helpOutput).toContain("opencode-council <command> [options]");
    expect(helpOutput).toContain("init        Install plugin + agent files into ~/.opencode");
    expect(helpOutput).toContain("refresh     Reinstall from source");
    expect(helpOutput).toContain("verify      Health-check: compare installed files against source by SHA-256");
    expect(helpOutput).toContain("uninstall   Remove installed plugin + agent files from ~/.opencode");
    expect(helpOutput).toContain("help        Show this help message");
  });
});

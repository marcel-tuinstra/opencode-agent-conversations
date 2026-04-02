import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { OPENCODE_ADAPTER } from "../packages/adapter-opencode/src/index.ts";
import { CLAUDE_CODE_ADAPTER } from "../packages/adapter-claude-code/src/index.ts";
import { CODEX_ADAPTER } from "../packages/adapter-codex/src/index.ts";

type AdapterManifest = {
  platform: string;
  install: {
    type: "copy";
    sources: string[];
    destination: string;
  };
  runtime: {
    promptInjection: string;
    toolGating: string;
    worktrees: string;
  };
};

const opencodeManifestPath = fileURLToPath(new URL("../packages/adapter-opencode/manifest.json", import.meta.url));
const claudeManifestPath = fileURLToPath(new URL("../packages/adapter-claude-code/manifest.json", import.meta.url));
const codexManifestPath = fileURLToPath(new URL("../packages/adapter-codex/manifest.json", import.meta.url));

const loadManifest = (path: string): AdapterManifest => {
  return JSON.parse(readFileSync(path, "utf8")) as AdapterManifest;
};

describe("adapter contracts", () => {
  it("keeps adapter descriptors aligned with manifest metadata", () => {
    const manifests = {
      opencode: loadManifest(opencodeManifestPath),
      "claude-code": loadManifest(claudeManifestPath),
      codex: loadManifest(codexManifestPath)
    } as const;

    expect(OPENCODE_ADAPTER.id).toBe(manifests.opencode.platform);
    expect(OPENCODE_ADAPTER.install).toEqual(manifests.opencode.install);
    expect(OPENCODE_ADAPTER.runtime).toEqual(manifests.opencode.runtime);

    expect(CLAUDE_CODE_ADAPTER.id).toBe(manifests["claude-code"].platform);
    expect(CLAUDE_CODE_ADAPTER.install).toEqual(manifests["claude-code"].install);
    expect(CLAUDE_CODE_ADAPTER.runtime).toEqual(manifests["claude-code"].runtime);

    expect(CODEX_ADAPTER.id).toBe(manifests.codex.platform);
    expect(CODEX_ADAPTER.install).toEqual(manifests.codex.install);
    expect(CODEX_ADAPTER.runtime).toEqual(manifests.codex.runtime);
  });

  it("detects platforms from binary or home directory hints", () => {
    const detectFromBinary = {
      hasBinary(name: string) {
        return name === "opencode" || name === "claude" || name === "codex";
      },
      pathExists() {
        return false;
      },
      homeDir: "/tmp/home"
    };

    expect(OPENCODE_ADAPTER.detect(detectFromBinary)).toBe(true);
    expect(CLAUDE_CODE_ADAPTER.detect(detectFromBinary)).toBe(true);
    expect(CODEX_ADAPTER.detect(detectFromBinary)).toBe(true);

    const detectFromPaths = {
      hasBinary() {
        return false;
      },
      pathExists(path: string) {
        return path.endsWith(".opencode") || path.endsWith(".claude") || path.endsWith(".codex");
      },
      homeDir: "/tmp/home"
    };

    expect(OPENCODE_ADAPTER.detect(detectFromPaths)).toBe(true);
    expect(CLAUDE_CODE_ADAPTER.detect(detectFromPaths)).toBe(true);
    expect(CODEX_ADAPTER.detect(detectFromPaths)).toBe(true);
  });
});

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

type AdapterManifest = {
  platform: "opencode" | "claude-code" | "codex";
  install: {
    type: "copy";
    entries: Array<{
      source: string;
      destination: string;
    }>;
  };
  runtime: {
    promptInjection: "native" | "adapter" | "bridge" | "gap";
    toolGating: "native" | "adapter" | "bridge" | "gap";
    worktrees: "native" | "adapter" | "bridge" | "gap";
  };
  detect: {
    binaries: string[];
    homeMarkers: string[];
  };
};

const repoRoot = fileURLToPath(new URL("../", import.meta.url));
const manifestPaths = [
  fileURLToPath(new URL("../packages/adapter-opencode/manifest.json", import.meta.url)),
  fileURLToPath(new URL("../packages/adapter-claude-code/manifest.json", import.meta.url)),
  fileURLToPath(new URL("../packages/adapter-codex/manifest.json", import.meta.url))
];

const loadManifest = (path: string): AdapterManifest => {
  return JSON.parse(readFileSync(path, "utf8")) as AdapterManifest;
};

describe("adapter manifest shape", () => {
  it("defines detect metadata and copy entries for each platform", () => {
    const manifests = manifestPaths.map(loadManifest);

    for (const manifest of manifests) {
      expect(manifest.detect.binaries.length).toBeGreaterThan(0);
      expect(manifest.detect.homeMarkers.length).toBeGreaterThan(0);
      expect(manifest.install.type).toBe("copy");
      expect(manifest.install.entries.length).toBeGreaterThan(0);

      for (const entry of manifest.install.entries) {
        expect(entry.source.length).toBeGreaterThan(0);
        expect(entry.destination.startsWith("~/")).toBe(true);
        expect(existsSync(join(repoRoot, entry.source))).toBe(true);
      }
    }
  });
});

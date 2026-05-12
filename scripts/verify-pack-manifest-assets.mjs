import { execFileSync } from "node:child_process";
import { readFileSync, statSync } from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();

const manifestPaths = [
  "packages/adapter-opencode/manifest.json",
  "packages/adapter-claude-code/manifest.json",
  "packages/adapter-codex/manifest.json"
];

const packOutput = execFileSync("npm", ["pack", "--dry-run", "--json"], {
  cwd: repoRoot,
  encoding: "utf8"
});

const packEntries = JSON.parse(packOutput);

if (!Array.isArray(packEntries) || packEntries.length === 0) {
  throw new Error("npm pack --dry-run --json returned no entries.");
}

const files = packEntries[0]?.files;
if (!Array.isArray(files)) {
  throw new Error("npm pack output missing files list.");
}

const packedPaths = new Set(
  files
    .map((entry) => (typeof entry?.path === "string" ? entry.path : ""))
    .filter(Boolean)
);

const missingSources = [];

for (const manifestPath of manifestPaths) {
  const absoluteManifestPath = path.join(repoRoot, manifestPath);
  const manifest = JSON.parse(readFileSync(absoluteManifestPath, "utf8"));
  const entries = manifest?.install?.entries;

  if (!Array.isArray(entries)) {
    throw new Error(`Manifest has no install entries: ${manifestPath}`);
  }

  for (const entry of entries) {
    const source = typeof entry?.source === "string" ? entry.source : "";
    if (!source) {
      throw new Error(`Manifest entry has invalid source in ${manifestPath}`);
    }

    const absoluteSourcePath = path.join(repoRoot, source);
    const sourceStats = statSync(absoluteSourcePath);

    if (sourceStats.isDirectory()) {
      const hasAnyPackedChild = Array.from(packedPaths).some((packedPath) =>
        packedPath.startsWith(`${source}/`)
      );
      if (!hasAnyPackedChild) {
        missingSources.push(`${source} (directory from ${manifestPath})`);
      }
      continue;
    }

    if (!packedPaths.has(source)) {
      missingSources.push(`${source} (file from ${manifestPath})`);
    }
  }
}

if (missingSources.length > 0) {
  const details = missingSources.map((source) => `- ${source}`).join("\n");
  throw new Error(
    `Packed artifact is missing required install sources:\n${details}`
  );
}

console.log("verify:pack passed - all manifest install sources are included in npm pack output.");

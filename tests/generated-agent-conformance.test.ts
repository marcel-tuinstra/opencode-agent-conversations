import { existsSync, readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { load as loadYaml } from "js-yaml";
import { describe, expect, it } from "vitest";

type SharedAgent = {
  name: string;
  display_name: string;
  description: string;
  instructions: string;
};

const repoRoot = fileURLToPath(new URL("../", import.meta.url));
const sharedAgentsDir = fileURLToPath(new URL("../shared/agents", import.meta.url));
const generatedOpenCodeDir = fileURLToPath(new URL("../generated/opencode/agents", import.meta.url));
const generatedClaudeDir = fileURLToPath(new URL("../generated/claude-code/agents", import.meta.url));
const generatedCodexDir = fileURLToPath(new URL("../generated/codex/agents", import.meta.url));
const sharedSkillsDir = fileURLToPath(new URL("../shared/skills", import.meta.url));
const generatedOpenCodeSkillsDir = fileURLToPath(new URL("../generated/opencode/skills", import.meta.url));
const generatedClaudeSkillsDir = fileURLToPath(new URL("../generated/claude-code/skills", import.meta.url));
const generatedCodexSkillsDir = fileURLToPath(new URL("../generated/codex/skills", import.meta.url));
const generatedClaudePluginPath = fileURLToPath(new URL("../generated/claude-code/.claude-plugin/plugin.json", import.meta.url));
const generatedCodexPluginPath = fileURLToPath(new URL("../generated/codex/.codex-plugin/plugin.json", import.meta.url));

const firstNonEmptyLine = (value: string): string => {
  for (const line of value.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed.length > 0) {
      return trimmed;
    }
  }
  return "";
};

const loadSharedAgents = (): SharedAgent[] => {
  const files = readdirSync(sharedAgentsDir).filter((file) => file.endsWith(".yaml"));
  return files.map((file) => {
    const absolute = `${sharedAgentsDir}/${file}`;
    const parsed = loadYaml(readFileSync(absolute, "utf8")) as SharedAgent;
    return parsed;
  });
};

describe("generated agent conformance", () => {
  it("keeps generated agent files in sync with shared sources", () => {
    const sharedAgents = loadSharedAgents();
    expect(sharedAgents.length).toBeGreaterThan(0);

    for (const agent of sharedAgents) {
      const openCodePath = `${generatedOpenCodeDir}/${agent.name}.md`;
      const claudePath = `${generatedClaudeDir}/${agent.name}.md`;
      const codexPath = `${generatedCodexDir}/${agent.name}.toml`;

      expect(existsSync(openCodePath), `missing ${openCodePath.replace(repoRoot + "/", "")}`).toBe(true);
      expect(existsSync(claudePath), `missing ${claudePath.replace(repoRoot + "/", "")}`).toBe(true);
      expect(existsSync(codexPath), `missing ${codexPath.replace(repoRoot + "/", "")}`).toBe(true);

      const openCodeBody = readFileSync(openCodePath, "utf8");
      const claudeBody = readFileSync(claudePath, "utf8");
      const codexBody = readFileSync(codexPath, "utf8");

      const instructionLead = firstNonEmptyLine(agent.instructions);

      expect(openCodeBody).toContain(agent.description);
      expect(openCodeBody).toContain(instructionLead);

      expect(claudeBody).toContain(`name: ${agent.name}`);
      expect(claudeBody).toContain(`description: ${agent.description}`);
      expect(claudeBody).toContain(instructionLead);

      expect(codexBody).toContain(`name = "${agent.name}"`);
      expect(codexBody).toContain(`description = "${agent.description}"`);
      expect(codexBody).toContain(instructionLead);
    }
  });

  it("keeps generated skill artifacts and plugin manifests in sync", () => {
    const skillFiles = readdirSync(sharedSkillsDir).filter((file) => file.endsWith(".yaml"));
    expect(skillFiles.length).toBeGreaterThan(0);

    for (const file of skillFiles) {
      const absolute = `${sharedSkillsDir}/${file}`;
      const parsed = loadYaml(readFileSync(absolute, "utf8")) as { name: string; description: string };

      const opencodePath = `${generatedOpenCodeSkillsDir}/${parsed.name}/SKILL.md`;
      const claudePath = `${generatedClaudeSkillsDir}/${parsed.name}/SKILL.md`;
      const codexPath = `${generatedCodexSkillsDir}/${parsed.name}/SKILL.md`;

      expect(existsSync(opencodePath), `missing ${opencodePath.replace(repoRoot + "/", "")}`).toBe(true);
      expect(existsSync(claudePath), `missing ${claudePath.replace(repoRoot + "/", "")}`).toBe(true);
      expect(existsSync(codexPath), `missing ${codexPath.replace(repoRoot + "/", "")}`).toBe(true);

      expect(readFileSync(opencodePath, "utf8")).toContain(parsed.description);
      expect(readFileSync(claudePath, "utf8")).toContain(parsed.description);
      expect(readFileSync(codexPath, "utf8")).toContain(parsed.description);
    }

    expect(existsSync(generatedClaudePluginPath)).toBe(true);
    expect(existsSync(generatedCodexPluginPath)).toBe(true);

    const claudePlugin = JSON.parse(readFileSync(generatedClaudePluginPath, "utf8")) as { name: string; runtime: string };
    const codexPlugin = JSON.parse(readFileSync(generatedCodexPluginPath, "utf8")) as { name: string; runtime: string };

    expect(claudePlugin.name).toBe("agent-council");
    expect(claudePlugin.runtime).toBe("claude-code");
    expect(codexPlugin.name).toBe("agent-council");
    expect(codexPlugin.runtime).toBe("codex");
  });
});

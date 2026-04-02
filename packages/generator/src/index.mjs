#!/usr/bin/env node

import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = resolve(__filename, "..");
const repoRoot = resolve(__dirname, "../../..");

const sharedAgentsDir = join(repoRoot, "shared", "agents");
const generatedRoot = join(repoRoot, "generated");

const parseSimpleYaml = (content) => {
  const result = {};
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const separator = line.indexOf(":");
    if (separator < 0) {
      continue;
    }

    const key = line.slice(0, separator).trim();
    const rawValue = line.slice(separator + 1).trim();
    result[key] = rawValue.replace(/^"|"$/g, "");
  }
  return result;
};

const renderClaudeAgent = (agent) => {
  return [
    "---",
    `name: ${agent.name}`,
    `description: ${agent.description}`,
    "model: inherit",
    "effort: medium",
    "---",
    "",
    `You are ${agent.display_name}.`,
    `Primary mission: ${agent.description}.`,
    "Operate within the agent-council deliberation protocol.",
    ""
  ].join("\n");
};

const renderCodexAgent = (agent) => {
  return [
    `name = \"${agent.name}\"`,
    `description = \"${agent.description}\"`,
    "model = \"gpt-5.4\"",
    "model_reasoning_effort = \"medium\"",
    "sandbox_mode = \"read-only\"",
    "developer_instructions = \"\"\"",
    `You are ${agent.display_name}.`,
    `Primary mission: ${agent.description}.`,
    "Operate within the agent-council deliberation protocol.",
    "\"\"\"",
    ""
  ].join("\n");
};

const renderOpenCodeAgent = (agent) => {
  return [
    "---",
    `description: ${agent.description}`,
    "mode: subagent",
    "color: info",
    "---",
    `# AGENTS.${agent.name.toUpperCase()}.md`,
    "",
    `- Role: ${agent.description}.`,
    "- Follow the Frame, Challenge, Synthesize protocol.",
    ""
  ].join("\n");
};

const ensureDir = (path) => {
  mkdirSync(path, { recursive: true });
};

const build = () => {
  const files = readdirSync(sharedAgentsDir).filter((entry) => entry.endsWith(".yaml"));
  const agents = files.map((file) => {
    const absolutePath = join(sharedAgentsDir, file);
    const parsed = parseSimpleYaml(readFileSync(absolutePath, "utf8"));
    return parsed;
  });

  const targets = {
    opencode: join(generatedRoot, "opencode", "agents"),
    "claude-code": join(generatedRoot, "claude-code", "agents"),
    codex: join(generatedRoot, "codex", "agents")
  };

  ensureDir(targets.opencode);
  ensureDir(targets["claude-code"]);
  ensureDir(targets.codex);

  for (const agent of agents) {
    writeFileSync(join(targets.opencode, `${agent.name}.md`), renderOpenCodeAgent(agent), "utf8");
    writeFileSync(join(targets["claude-code"], `${agent.name}.md`), renderClaudeAgent(agent), "utf8");
    writeFileSync(join(targets.codex, `${agent.name}.toml`), renderCodexAgent(agent), "utf8");
  }

  const manifest = {
    generatedAt: new Date().toISOString(),
    count: agents.length,
    agents: agents.map((agent) => ({ name: agent.name, description: agent.description }))
  };

  writeFileSync(join(generatedRoot, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n", "utf8");
  process.stdout.write(`Generated ${agents.length} agents for OpenCode, Claude Code, and Codex.\n`);
};

build();

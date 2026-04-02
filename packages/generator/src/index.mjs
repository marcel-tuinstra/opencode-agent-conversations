#!/usr/bin/env node

import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { load as loadYaml } from "js-yaml";

const __filename = fileURLToPath(import.meta.url);
const __dirname = resolve(__filename, "..");
const repoRoot = resolve(__dirname, "../../..");

const sharedAgentsDir = join(repoRoot, "shared", "agents");
const generatedRoot = join(repoRoot, "generated");

const validateAgent = (agent, sourceFile) => {
  const required = ["name", "display_name", "description", "role_type", "instructions"];
  for (const key of required) {
    if (!agent[key] || String(agent[key]).trim().length === 0) {
      throw new Error(`Missing required key '${key}' in ${sourceFile}`);
    }
  }
};

const normalizeAgent = (sourceFile, content) => {
  const parsed = loadYaml(content);
  if (!parsed || typeof parsed !== "object") {
    throw new Error(`Invalid YAML object in ${sourceFile}`);
  }

  const agent = {
    name: String(parsed.name ?? "").trim(),
    display_name: String(parsed.display_name ?? "").trim(),
    description: String(parsed.description ?? "").trim(),
    role_type: String(parsed.role_type ?? "").trim(),
    color: String(parsed.color ?? "info").trim(),
    model: String(parsed.model ?? "inherit").trim(),
    effort: String(parsed.effort ?? "medium").trim(),
    codex_model: String(parsed.codex_model ?? "gpt-5.4").trim(),
    codex_reasoning_effort: String(parsed.codex_reasoning_effort ?? "medium").trim(),
    codex_sandbox_mode: String(parsed.codex_sandbox_mode ?? "read-only").trim(),
    instructions: String(parsed.instructions ?? "").trim()
  };

  validateAgent(agent, sourceFile);
  return agent;
};

const renderClaudeAgent = (agent) => {
  return [
    "---",
    `name: ${agent.name}`,
    `description: ${agent.description}`,
    `model: ${agent.model}`,
    `effort: ${agent.effort}`,
    "---",
    "",
    agent.instructions,
    ""
  ].join("\n");
};

const renderCodexAgent = (agent) => {
  return [
    `name = \"${agent.name}\"`,
    `description = \"${agent.description}\"`,
    `model = \"${agent.codex_model}\"`,
    `model_reasoning_effort = \"${agent.codex_reasoning_effort}\"`,
    `sandbox_mode = \"${agent.codex_sandbox_mode}\"`,
    "developer_instructions = \"\"\"",
    agent.instructions,
    "\"\"\"",
    ""
  ].join("\n");
};

const renderOpenCodeAgent = (agent) => {
  return [
    "---",
    `description: ${agent.description}`,
    "mode: subagent",
    `color: ${agent.color}`,
    "---",
    `# AGENTS.${agent.name.toUpperCase()}.md`,
    "",
    agent.instructions,
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
    return normalizeAgent(file, readFileSync(absolutePath, "utf8"));
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

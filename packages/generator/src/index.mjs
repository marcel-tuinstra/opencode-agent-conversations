#!/usr/bin/env node

import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { load as loadYaml } from "js-yaml";

const __filename = fileURLToPath(import.meta.url);
const __dirname = resolve(__filename, "..");
const repoRoot = resolve(__dirname, "../../..");

const sharedAgentsDir = join(repoRoot, "shared", "agents");
const sharedSkillsDir = join(repoRoot, "shared", "skills");
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
    "",
    renderMentionOrchestrationProtocol(agent.name),
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
    "",
    renderMentionOrchestrationProtocol(agent.name),
    "\"\"\"",
    ""
  ].join("\n");
};

const renderMentionOrchestrationProtocol = (agentName) => {
  const activeHandle = `@${agentName}`;
  return [
    "## Cross-Platform Mention Orchestration",
    `- If the user prompt includes ${activeHandle} plus additional @role handles (for example: @cto @dev ...), act as the lead orchestrator for this turn.`,
    "- Extract mentioned role handles in order, keep only supported roles, and dedupe while preserving order.",
    "- Launch all additional mentioned roles (excluding your own role) in a single parallel batch using the host platform's native sub-agent mechanism whenever available.",
    "- If true parallel launch is unavailable in the host runtime, launch sequentially and explicitly note that fallback once in the response.",
    "- Ask each invoked role for: (1) viewpoint, (2) key risk, (3) concrete recommendation, and (4) assumptions.",
    "- After collecting first-pass outputs, run a short challenge pass where each role addresses one disagreement or risk raised by another role.",
    "- Synthesize the final response with clear per-role sections, explicit agreement/disagreement points, and a concise combined recommendation.",
    "- If only one role is mentioned, respond only from that role without orchestration.",
    "- If an unknown @role is mentioned, ignore it and continue with known roles; do not fail the turn.",
    "- Use the project name `agent-council` in summaries and avoid legacy naming."
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

const normalizeSkill = (sourceFile, content) => {
  const parsed = loadYaml(content);
  if (!parsed || typeof parsed !== "object") {
    throw new Error(`Invalid YAML object in ${sourceFile}`);
  }

  const protocol = Array.isArray(parsed.protocol)
    ? parsed.protocol.map((line) => String(line).trim()).filter((line) => line.length > 0)
    : [];

  const skill = {
    name: String(parsed.name ?? "").trim(),
    description: String(parsed.description ?? "").trim(),
    protocol
  };

  if (!skill.name || !skill.description || skill.protocol.length === 0) {
    throw new Error(`Skill ${sourceFile} requires name, description, and protocol[]`);
  }

  return skill;
};

const renderSkillMarkdown = (skill) => {
  const protocolLines = skill.protocol.map((line) => `- ${line}`);
  return [
    "---",
    `name: ${skill.name}`,
    `description: ${skill.description}`,
    "---",
    "",
    "## Deliberation Protocol",
    ...protocolLines,
    ""
  ].join("\n");
};

const writeSkills = (skills, targetRoot) => {
  for (const skill of skills) {
    const skillDir = join(targetRoot, "skills", skill.name);
    ensureDir(skillDir);
    writeFileSync(join(skillDir, "SKILL.md"), renderSkillMarkdown(skill), "utf8");
  }
};

const writePluginManifest = (targetRoot, fileName, runtime) => {
  const manifestDir = join(targetRoot, fileName.startsWith(".") ? fileName : `.${fileName}`);
  ensureDir(manifestDir);
  const pluginJson = {
    name: "agent-council",
    version: "1.0.0",
    runtime,
    generatedAt: new Date().toISOString()
  };
  writeFileSync(join(manifestDir, "plugin.json"), JSON.stringify(pluginJson, null, 2) + "\n", "utf8");
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

  const skillFiles = readdirSync(sharedSkillsDir).filter((entry) => entry.endsWith(".yaml"));
  const skills = skillFiles.map((file) => {
    const absolutePath = join(sharedSkillsDir, file);
    return normalizeSkill(file, readFileSync(absolutePath, "utf8"));
  });

  const targets = {
    opencode: join(generatedRoot, "opencode", "agents"),
    "claude-code": join(generatedRoot, "claude-code", "agents"),
    codex: join(generatedRoot, "codex", "agents")
  };

  const roots = {
    opencode: join(generatedRoot, "opencode"),
    "claude-code": join(generatedRoot, "claude-code"),
    codex: join(generatedRoot, "codex")
  };

  ensureDir(targets.opencode);
  ensureDir(targets["claude-code"]);
  ensureDir(targets.codex);

  for (const agent of agents) {
    writeFileSync(join(targets.opencode, `${agent.name}.md`), renderOpenCodeAgent(agent), "utf8");
    writeFileSync(join(targets["claude-code"], `${agent.name}.md`), renderClaudeAgent(agent), "utf8");
    writeFileSync(join(targets.codex, `${agent.name}.toml`), renderCodexAgent(agent), "utf8");
  }

  writeSkills(skills, roots.opencode);
  writeSkills(skills, roots["claude-code"]);
  writeSkills(skills, roots.codex);

  writePluginManifest(roots["claude-code"], ".claude-plugin", "claude-code");
  writePluginManifest(roots.codex, ".codex-plugin", "codex");

  const manifest = {
    generatedAt: new Date().toISOString(),
    count: agents.length,
    skills: skills.map((skill) => ({ name: skill.name, description: skill.description })),
    agents: agents.map((agent) => ({ name: agent.name, description: agent.description }))
  };

  writeFileSync(join(generatedRoot, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n", "utf8");
  process.stdout.write(`Generated ${agents.length} agents for OpenCode, Claude Code, and Codex.\n`);
};

build();

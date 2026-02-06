import type { Plugin } from "@opencode-ai/plugin";

const SUPPORTED_ROLES = [
  "CTO",
  "DEV",
  "PO",
  "PM",
  "CEO",
  "MARKETING",
  "RESEARCH"
] as const;

type Role = (typeof SUPPORTED_ROLES)[number];
type Intent = "backend" | "design" | "marketing" | "roadmap" | "research" | "mixed";
type MentionedProvider = "sentry" | "github" | "shortcut" | "nuxt";
type SessionPolicy = {
  roles: Role[];
  targets: Record<Role, number>;
  intent: Intent;
  mcpProviders: MentionedProvider[];
  mcpHints: string[];
  staleSensitive: boolean;
  allowDeepMcp: boolean;
  mcpCallCount: number;
  mcpTouched: Partial<Record<MentionedProvider, number>>;
};

const ROLE_ALIASES: Record<string, Role> = {
  cto: "CTO",
  dev: "DEV",
  developer: "DEV",
  po: "PO",
  pm: "PM",
  ceo: "CEO",
  marketing: "MARKETING",
  research: "RESEARCH"
};

const MENTION_REGEX = /@(?:\[|<)?([A-Za-z]+)(?:\]|>)?/g;
const MARKER_REGEX = /<<AGENT_CONVERSATIONS:([^>]+)>>/;
const MARKER_REMOVAL_REGEX = /\n*<<AGENT_CONVERSATIONS:[^>]+>>/g;
const MARKER_PREFIX = "<<AGENT_CONVERSATIONS:";
const MARKER_SUFFIX = ">>";

const STALE_SENSITIVE_REGEX =
  /\b(current|latest|today|this week|this month|recent|live|regression|incident|status|right now|fresh|up-to-date)\b/i;

const MCP_PROVIDER_PATTERNS: Array<{ key: MentionedProvider; regex: RegExp; hint: string }> = [
  {
    key: "sentry",
    regex: /\b(sentry|sentry\.io)\b/i,
    hint: "Sentry MCP (issues, traces, releases)"
  },
  {
    key: "github",
    regex: /\b(github|github\.com)\b/i,
    hint: "GitHub MCP (PRs, commits, code context)"
  },
  {
    key: "shortcut",
    regex: /\b(shortcut)\b/i,
    hint: "Shortcut MCP (stories, epics, milestones)"
  },
  {
    key: "nuxt",
    regex: /\b(nuxt|nuxt\s*ui|ui\.nuxt\.com)\b/i,
    hint: "Nuxt UI MCP (components, docs, examples)"
  }
];

const sessionRoles = new Map<string, Role[]>();
const sessionPolicy = new Map<string, SessionPolicy>();
const systemInjectedForSession = new Set<string>();

const DEEP_MCP_REGEX =
  /\b(deeper|deep dive|thorough|comprehensive|full investigation|as needed|as much as needed|exhaustive)\b/i;

const INTENT_KEYWORDS: Record<Intent, RegExp[]> = {
  backend: [
    /api|latency|database|db|cache|query|service|backend|throughput|p95|p99|infra|performance/i,
    /timeout|retry|index|n\+1|scaling|server|endpoint|queue/i
  ],
  design: [
    /design|ux|ui|prototype|wireframe|usability|interaction|layout|visual|figma/i,
    /experience|journey|information architecture|a11y|accessibility/i
  ],
  marketing: [
    /marketing|positioning|messaging|campaign|launch|brand|audience|copy|narrative/i,
    /go-to-market|gtm|webinar|case study|ad|funnel|conversion/i
  ],
  roadmap: [
    /roadmap|milestone|quarter|timeline|deadline|planning|refinement|delivery|scope/i,
    /prioritization|dependency|release|backlog|estimate|resourcing/i
  ],
  research: [
    /research|interview|evidence|hypothesis|experiment|validate|confidence|survey/i,
    /competitive|benchmark|discovery|analysis|findings|insight/i
  ],
  mixed: []
};

const INTENT_ROLE_WEIGHTS: Record<Intent, Record<Role, number>> = {
  backend: {
    CTO: 5,
    DEV: 5,
    PM: 2,
    PO: 2,
    CEO: 1,
    MARKETING: 0,
    RESEARCH: 1
  },
  design: {
    CTO: 2,
    DEV: 2,
    PM: 4,
    PO: 4,
    CEO: 1,
    MARKETING: 3,
    RESEARCH: 3
  },
  marketing: {
    CTO: 1,
    DEV: 1,
    PM: 2,
    PO: 2,
    CEO: 4,
    MARKETING: 5,
    RESEARCH: 2
  },
  roadmap: {
    CTO: 3,
    DEV: 2,
    PM: 5,
    PO: 5,
    CEO: 4,
    MARKETING: 2,
    RESEARCH: 2
  },
  research: {
    CTO: 3,
    DEV: 3,
    PM: 2,
    PO: 2,
    CEO: 1,
    MARKETING: 1,
    RESEARCH: 5
  },
  mixed: {
    CTO: 2,
    DEV: 2,
    PM: 2,
    PO: 2,
    CEO: 2,
    MARKETING: 2,
    RESEARCH: 2
  }
};

const isSupportedRole = (role: string): role is Role => {
  return SUPPORTED_ROLES.includes(role as Role);
};

const normalizeRole = (raw: string): Role | null => {
  const lowered = raw.toLowerCase();
  if (ROLE_ALIASES[lowered]) {
    return ROLE_ALIASES[lowered];
  }

  const upper = raw.toUpperCase();
  return isSupportedRole(upper) ? upper : null;
};

const detectRolesFromMentions = (text: string): Role[] => {
  const detected = new Set<Role>();

  for (const match of text.matchAll(MENTION_REGEX)) {
    const role = normalizeRole(match[1]);
    if (role) {
      detected.add(role);
    }
  }

  return Array.from(detected);
};

const parseRolesFromMarker = (text: string): Role[] | null => {
  const match = text.match(MARKER_REGEX);
  if (!match) {
    return null;
  }

  const roles = match[1]
    .split(",")
    .map((role) => role.trim())
    .map((role) => normalizeRole(role))
    .filter((role): role is Role => role !== null);

  return roles.length > 0 ? roles : null;
};

const detectRolesFromText = (text: string): Role[] | null => {
  const markerRoles = parseRolesFromMarker(text);
  if (markerRoles && markerRoles.length > 0) {
    return markerRoles;
  }

  const mentionRoles = detectRolesFromMentions(text);
  return mentionRoles.length > 0 ? mentionRoles : null;
};

const getTotalTurns = (roles: Role[], intent: Intent) => {
  if (roles.length <= 1) {
    return 0;
  }

  if (intent === "backend") {
    if (roles.length === 2) {
      return 8;
    }
    if (roles.length <= 4) {
      return 10;
    }
    return 12;
  }

  if (intent === "marketing") {
    if (roles.length <= 3) {
      return 10;
    }
    return 12;
  }

  if (roles.length === 2) {
    return 8;
  }
  if (roles.length === 3) {
    return 10;
  }
  if (roles.length <= 5) {
    return 12;
  }
  return 14;
};

const detectIntent = (text: string): Intent => {
  const scores: Record<Intent, number> = {
    backend: 0,
    design: 0,
    marketing: 0,
    roadmap: 0,
    research: 0,
    mixed: 0
  };

  for (const intent of Object.keys(INTENT_KEYWORDS) as Intent[]) {
    if (intent === "mixed") {
      continue;
    }
    for (const regex of INTENT_KEYWORDS[intent]) {
      if (regex.test(text)) {
        scores[intent] += 1;
      }
    }
  }

  let best: Intent = "mixed";
  let bestScore = 0;
  for (const intent of ["backend", "design", "marketing", "roadmap", "research"] as Intent[]) {
    if (scores[intent] > bestScore) {
      best = intent;
      bestScore = scores[intent];
    }
  }

  return bestScore > 0 ? best : "mixed";
};

const detectMcpProviders = (text: string): MentionedProvider[] => {
  const providers: MentionedProvider[] = [];
  const seen = new Set<MentionedProvider>();

  for (const provider of MCP_PROVIDER_PATTERNS) {
    if (provider.regex.test(text) && !seen.has(provider.key)) {
      providers.push(provider.key);
      seen.add(provider.key);
    }
  }

  return providers;
};

const buildMcpHints = (providers: MentionedProvider[]) => {
  return MCP_PROVIDER_PATTERNS.filter((provider) => providers.includes(provider.key)).map((provider) => provider.hint);
};

const buildTurnTargets = (roles: Role[], sourceText: string): Record<Role, number> => {
  const targets = {
    CTO: 0,
    DEV: 0,
    PO: 0,
    PM: 0,
    CEO: 0,
    MARKETING: 0,
    RESEARCH: 0
  } satisfies Record<Role, number>;

  if (roles.length <= 1) {
    return targets;
  }

  const intent = detectIntent(sourceText);
  const totalTurns = getTotalTurns(roles, intent);
  const weights = INTENT_ROLE_WEIGHTS[intent];
  const lead = roles[0];

  const mins = new Map<Role, number>();
  for (const role of roles) {
    const weight = weights[role];
    if (role === lead) {
      mins.set(role, 2);
      continue;
    }
    mins.set(role, weight > 0 ? 1 : 0);
  }

  let minSum = 0;
  for (const role of roles) {
    minSum += mins.get(role) ?? 0;
  }

  if (minSum > totalTurns) {
    for (let i = roles.length - 1; i >= 0 && minSum > totalTurns; i -= 1) {
      const role = roles[i];
      if (role === lead) {
        continue;
      }
      const current = mins.get(role) ?? 0;
      if (current > 0) {
        mins.set(role, current - 1);
        minSum -= 1;
      }
    }
  }

  for (const role of roles) {
    targets[role] = mins.get(role) ?? 0;
  }

  const remaining = totalTurns - minSum;
  if (remaining <= 0) {
    return targets;
  }

  const effectiveWeights = new Map<Role, number>();
  let weightSum = 0;
  for (const role of roles) {
    const weight = Math.max(0, weights[role] + (role === lead ? 1 : 0));
    effectiveWeights.set(role, weight);
    weightSum += weight;
  }

  if (weightSum <= 0) {
    targets[lead] += remaining;
    return targets;
  }

  const fractions: Array<{ role: Role; fraction: number }> = [];
  let assigned = 0;
  for (const role of roles) {
    const exact = (remaining * (effectiveWeights.get(role) ?? 0)) / weightSum;
    const whole = Math.floor(exact);
    targets[role] += whole;
    assigned += whole;
    fractions.push({ role, fraction: exact - whole });
  }

  fractions.sort((a, b) => b.fraction - a.fraction);
  let extra = remaining - assigned;
  let index = 0;
  while (extra > 0 && fractions.length > 0) {
    const role = fractions[index % fractions.length].role;
    targets[role] += 1;
    extra -= 1;
    index += 1;
  }

  return targets;
};

const buildSystemInstruction = (
  roles: Role[],
  targets: Record<Role, number>,
  mcpProviders: MentionedProvider[],
  mcpHints: string[],
  staleSensitive: boolean
) => {
  if (roles.length === 1) {
    const role = roles[0];
    return [
      `You are the ${role} persona in this turn.`,
      "Provide a complete, context-rich response, not a greeting-only reply.",
      "Go deeper when useful: include tradeoffs, concrete actions, and rationale.",
      mcpHints.length > 0
        ? `- Soft MCP mode: MCP is allowed only for explicitly mentioned providers (${mcpHints.join(", ")}).`
        : "- Soft MCP mode: do not call MCP tools unless a provider is explicitly mentioned.",
      mcpProviders.length > 1
        ? `- Multiple providers were explicitly named (${mcpProviders.join(", ")}); use at least one targeted MCP check per named provider before final recommendations, unless a provider has no accessible data.`
        : "- Use MCP only when it materially improves confidence.",
      mcpHints.length > 0
        ? "- Keep MCP usage minimal: max 2 MCP calls total unless explicitly asked for deeper investigation."
        : staleSensitive
          ? "- If confidence is low or information may be stale, suggest using `/mcp` for live context."
          : "- Do not suggest `/mcp` unless the user asks for live/current data.",
      "- If external context is used, cite it briefly.",
      "Do not prefix the response with the role label.",
      "Return a normal direct answer."
    ].join("\n");
  }

  const rolesWithAt = roles.map((role) => `@${role}`).join(", ");
  const requiredPrefixList = roles.map((role) => `${role}:`).join(", ");
  const leadRole = roles[0];
  const turnPlan = roles
    .filter((role) => targets[role] > 0)
    .map((role) => `${role} ${targets[role]}`)
    .join(", ");
  const omittedRoles = roles.filter((role) => targets[role] === 0);
  const totalTurns = roles.reduce((sum, role) => sum + (targets[role] ?? 0), 0);

  return [
    "You are facilitating a natural multi-agent discussion.",
    `Active agents: ${rolesWithAt}.`,
    "The roles are functional personas, not specific real people.",
    "You must follow these rules exactly:",
    "- Use short back-and-forth turns as a chat thread.",
    `- Produce around ${totalTurns} turns using this weighted turn plan: ${turnPlan}.`,
    `- The first mentioned role (${leadRole}) is the lead: open the thread and close with the final recommendation.`,
    "- Weight contributions by relevance to the user question; do not force equal airtime.",
    "- Treat the weighted turn plan as strict caps, not suggestions.",
    omittedRoles.length > 0
      ? `- These tagged roles are out-of-scope for this prompt and should be omitted unless absolutely needed: ${omittedRoles.join(", ")}.`
      : "- Tagged roles that are not relevant may be omitted, or add one brief defer line.",
    "- Keep each turn concise but substantial (1-3 sentences).",
    `- Every line must start with one of: ${requiredPrefixList}`,
    "- Prefix each line with a turn number like [1], [2], [3].",
    mcpHints.length > 0
      ? `- Soft MCP mode: MCP is allowed only for these explicitly mentioned providers: ${mcpHints.join(", ")}.`
      : "- Soft MCP mode: do not call MCP tools unless a provider is explicitly mentioned.",
    mcpProviders.length > 1
      ? `- Because multiple providers were explicitly named (${mcpProviders.join(", ")}), include at least one MCP check per named provider before the final recommendation, unless data is unavailable.`
      : "- Use MCP only when it materially improves confidence.",
    mcpHints.length > 0
      ? "- Keep MCP usage minimal: max 2 MCP calls total unless explicitly asked for deeper investigation."
      : staleSensitive
        ? "- If confidence is low or information may be stale, add one brief suggestion to use `/mcp`."
        : "- Do not suggest `/mcp` unless the user asks for live/current data.",
    "- If MCP context is used, add a brief source note in-line.",
    "- Do not output headings, bullets, or narrator text.",
    "- Add one empty line between turns to feel like message bubbles.",
    "- Format every line as [n] ROLE: message"
  ].join("\n");
};

const buildUserEnforcement = (
  roles: Role[],
  targets: Record<Role, number>,
  mcpProviders: MentionedProvider[],
  mcpHints: string[],
  staleSensitive: boolean
) => {
  if (roles.length === 1) {
    return [
      "",
      "",
      "Assistant format contract:",
      "- Provide a full, context-rich answer; avoid greeting-only replies.",
      "- Include concrete recommendations and rationale.",
      mcpHints.length > 0
        ? `- Soft MCP mode: MCP is allowed only for explicitly mentioned providers (${mcpHints.join(", ")}).`
        : "- Soft MCP mode: do not call MCP tools unless a provider is explicitly mentioned.",
      mcpProviders.length > 1
        ? `- Multiple providers were explicitly named (${mcpProviders.join(", ")}); use at least one MCP check per named provider when gathering evidence.`
        : "- Use MCP only when it materially improves confidence.",
      mcpHints.length > 0
        ? "- Keep MCP usage minimal: max 2 MCP calls total unless explicitly asked for deeper investigation."
        : staleSensitive
          ? "- If confidence is low or data may be stale, briefly suggest using `/mcp`."
          : "- Do not suggest `/mcp` unless the user asks for live/current data.",
      "- If external context is used, cite the source briefly.",
      "- Do not prefix the response with a role label.",
      "- Do not use markdown or bullet points.",
      "- Use plain natural prose."
    ].join("\n");
  }

  const firstRole = roles[0];
  const requiredPrefixList = roles.map((role) => `${role}:`).join(", ");
  const turnPlan = roles
    .filter((role) => targets[role] > 0)
    .map((role) => `${role} ${targets[role]}`)
    .join(", ");
  const omittedRoles = roles.filter((role) => targets[role] === 0);

  return [
    "",
    "",
    "Assistant format contract:",
    `- Start the response immediately with ${firstRole}:`,
    `- Every line must start with one of: ${requiredPrefixList}`,
    "- Prefix each line with sequential numbering: [1], [2], [3], ...",
    `- Follow weighted speaking plan: ${turnPlan}.`,
    `- The first role (${firstRole}) leads: it opens and closes with the final recommendation.`,
    "- Weighted by relevance; do not split airtime evenly.",
    "- Treat speaking plan as hard caps per role.",
    omittedRoles.length > 0
      ? `- Omit these tagged roles unless absolutely necessary: ${omittedRoles.join(", ")}.`
      : "- Tagged roles that are irrelevant may be skipped or add one brief defer line.",
    "- Keep each turn concise but substantial (1-3 sentences).",
    mcpHints.length > 0
      ? `- Soft MCP mode: MCP is allowed only for these explicitly mentioned providers: ${mcpHints.join(", ")}.`
      : "- Soft MCP mode: do not call MCP tools unless a provider is explicitly mentioned.",
    mcpProviders.length > 1
      ? `- Multiple providers were explicitly named (${mcpProviders.join(", ")}); gather at least one MCP evidence point per named provider unless unavailable.`
      : "- Use MCP only when it materially improves confidence.",
    mcpHints.length > 0
      ? "- Keep MCP usage minimal: max 2 MCP calls total unless explicitly asked for deeper investigation."
      : staleSensitive
        ? "- If confidence is low or data may be stale, include one brief suggestion to use `/mcp`."
        : "- Do not suggest `/mcp` unless the user asks for live/current data.",
    "- If MCP context is used, include a brief source note.",
    "- Add one empty line between lines for bubble-like spacing.",
    "- Do not use markdown or bullet points.",
    "- Use plain lines only: [n] ROLE: message"
  ].join("\n");
};

const enforceUserContract = (
  text: string,
  roles: Role[],
  targets: Record<Role, number>,
  mcpProviders: MentionedProvider[],
  mcpHints: string[],
  staleSensitive: boolean
) => {
  if (text.includes("Assistant format contract:")) {
    return text;
  }

  return `${text}${buildUserEnforcement(roles, targets, mcpProviders, mcpHints, staleSensitive)}`;
};

const normalizeThreadOutput = (text: string, roles: Role[], targets: Record<Role, number>) => {
  if (roles.length <= 1) {
    return text;
  }

  const active = new Set(roles);
  const matched: Array<{ role: Role; message: string }> = [];

  for (const rawLine of text.split("\n")) {
    const line = rawLine.trim();
    if (!line) {
      continue;
    }

    const match = line.match(/^(?:\[\d+\]\s*)?([A-Z]+):\s*(.+)$/);
    if (!match) {
      continue;
    }

    const normalized = normalizeRole(match[1]);
    if (!normalized || !active.has(normalized)) {
      continue;
    }

    const message = match[2].trim();
    if (!message) {
      continue;
    }

    matched.push({ role: normalized, message });
  }

  if (matched.length === 0) {
    return text;
  }

  const counts: Record<Role, number> = {
    CTO: 0,
    DEV: 0,
    PO: 0,
    PM: 0,
    CEO: 0,
    MARKETING: 0,
    RESEARCH: 0
  };

  const selected: Array<{ role: Role; message: string }> = [];
  for (const line of matched) {
    const quota = targets[line.role] ?? 0;
    if (quota <= 0) {
      continue;
    }
    if (counts[line.role] >= quota) {
      continue;
    }

    selected.push(line);
    counts[line.role] += 1;
  }

  if (selected.length === 0) {
    return text;
  }

  const lead = roles[0];
  const firstLeadIndex = selected.findIndex((line) => line.role === lead);
  if (firstLeadIndex > 0) {
    const [leadLine] = selected.splice(firstLeadIndex, 1);
    selected.unshift(leadLine);
  }

  const lastLeadIndex = (() => {
    for (let i = selected.length - 1; i >= 0; i -= 1) {
      if (selected[i].role === lead) {
        return i;
      }
    }
    return -1;
  })();

  if (lastLeadIndex >= 0 && lastLeadIndex < selected.length - 1) {
    const [leadLine] = selected.splice(lastLeadIndex, 1);
    selected.push(leadLine);
  }

  const numbered = selected.map((item, index) => `[${index + 1}] ${item.role}: ${item.message}`);
  return numbered.join("\n\n");
};

const appendMcpSuggestion = (text: string, leadRole: Role, numbered: boolean) => {
  if (/\/mcp\b/i.test(text)) {
    return text;
  }

  if (!numbered) {
    return `${text}\n\nIf confidence is low or the data may be stale, we can pull live context with \`/mcp\` before finalizing.`;
  }

  let maxTurn = 0;
  for (const match of text.matchAll(/\[(\d+)\]\s+[A-Z]+:/g)) {
    const parsed = Number(match[1]);
    if (Number.isFinite(parsed) && parsed > maxTurn) {
      maxTurn = parsed;
    }
  }

  const nextTurn = maxTurn > 0 ? maxTurn + 1 : 1;
  const line = `[${nextTurn}] ${leadRole}: If confidence is low or the data may be stale, we can pull live context with \`/mcp\` before finalizing.`;
  return `${text}\n\n${line}`;
};

const appendMissingProviderNotice = (
  text: string,
  leadRole: Role,
  numbered: boolean,
  missingProviders: MentionedProvider[]
) => {
  if (missingProviders.length === 0) {
    return text;
  }

  const missingList = missingProviders.join(", ");
  const notice = `Need at least one MCP check for: ${missingList} before final recommendation.`;

  if (!numbered) {
    return `${text}\n\n${notice}`;
  }

  let maxTurn = 0;
  for (const match of text.matchAll(/\[(\d+)\]\s+[A-Z]+:/g)) {
    const parsed = Number(match[1]);
    if (Number.isFinite(parsed) && parsed > maxTurn) {
      maxTurn = parsed;
    }
  }

  const nextTurn = maxTurn > 0 ? maxTurn + 1 : 1;
  return `${text}\n\n[${nextTurn}] ${leadRole}: ${notice}`;
};

const getMissingProviders = (policy: SessionPolicy) => {
  return policy.mcpProviders.filter((provider) => !(policy.mcpTouched[provider] && policy.mcpTouched[provider]! > 0));
};

const providerFromToolName = (tool: string): MentionedProvider | null => {
  if (tool.startsWith("sentry_")) {
    return "sentry";
  }
  if (tool.startsWith("github_")) {
    return "github";
  }
  if (tool.startsWith("shortcut_")) {
    return "shortcut";
  }
  if (tool.startsWith("nuxt-ui_")) {
    return "nuxt";
  }
  return null;
};

export const AgentConversations: Plugin = async () => {
  return {
    "tui.prompt.append": async ({ input }) => {
      const roles = detectRolesFromMentions(input);
      if (roles.length === 0) {
        return input;
      }

      const marker = `${MARKER_PREFIX}${roles.join(",")}${MARKER_SUFFIX}`;
      return `${input}\n\n${marker}`;
    },
    "chat.message": async (input, output) => {
      if (output.message.role !== "user") {
        return;
      }

      let roles: Role[] | null = null;
      let sourceText = "";

      for (const part of output.parts) {
        if (part.type !== "text") {
          continue;
        }

        const parsed = detectRolesFromText(part.text);
        if (!parsed) {
          continue;
        }

        roles = parsed;
        sourceText = part.text;
        part.text = part.text.replace(MARKER_REMOVAL_REGEX, "");
      }

      if (!roles || roles.length === 0) {
        sessionRoles.delete(input.sessionID);
        sessionPolicy.delete(input.sessionID);
        systemInjectedForSession.delete(input.sessionID);
        return;
      }

      const intent = detectIntent(sourceText);
      const targets = buildTurnTargets(roles, sourceText);
      const mcpProviders = detectMcpProviders(sourceText);
      const mcpHints = buildMcpHints(mcpProviders);
      const staleSensitive = STALE_SENSITIVE_REGEX.test(sourceText);
      const allowDeepMcp = DEEP_MCP_REGEX.test(sourceText);
      for (const part of output.parts) {
        if (part.type === "text") {
          part.text = enforceUserContract(part.text, roles, targets, mcpProviders, mcpHints, staleSensitive);
        }
      }

      sessionRoles.set(input.sessionID, roles);
      sessionPolicy.set(input.sessionID, {
        roles,
        targets,
        intent,
        mcpProviders,
        mcpHints,
        staleSensitive,
        allowDeepMcp,
        mcpCallCount: 0,
        mcpTouched: {}
      });
      systemInjectedForSession.delete(input.sessionID);
    },
    "experimental.chat.messages.transform": async (_input, output) => {
      const userMessages = output.messages.filter((message) => message.info.role === "user");
      const message = userMessages[userMessages.length - 1];
      if (!message) {
        return;
      }

      let roles: Role[] | null = null;
      let sourceText = "";

      for (const part of message.parts) {
        if (part.type !== "text") {
          continue;
        }

        const parsed = detectRolesFromText(part.text);
        if (!parsed) {
          continue;
        }

        roles = parsed;
        sourceText = part.text;
        part.text = part.text.replace(MARKER_REMOVAL_REGEX, "");
      }

      if (!roles || roles.length === 0) {
        sessionRoles.delete(message.info.sessionID);
        sessionPolicy.delete(message.info.sessionID);
        systemInjectedForSession.delete(message.info.sessionID);
        return;
      }

      const intent = detectIntent(sourceText);
      const targets = buildTurnTargets(roles, sourceText);
      const mcpProviders = detectMcpProviders(sourceText);
      const mcpHints = buildMcpHints(mcpProviders);
      const staleSensitive = STALE_SENSITIVE_REGEX.test(sourceText);
      const allowDeepMcp = DEEP_MCP_REGEX.test(sourceText);
      for (const part of message.parts) {
        if (part.type === "text") {
          part.text = enforceUserContract(part.text, roles, targets, mcpProviders, mcpHints, staleSensitive);
        }
      }

      sessionRoles.set(message.info.sessionID, roles);
      sessionPolicy.set(message.info.sessionID, {
        roles,
        targets,
        intent,
        mcpProviders,
        mcpHints,
        staleSensitive,
        allowDeepMcp,
        mcpCallCount: 0,
        mcpTouched: {}
      });
    },
    "experimental.chat.system.transform": async (input, output) => {
      if (!input.sessionID || systemInjectedForSession.has(input.sessionID)) {
        return;
      }

      const policy = sessionPolicy.get(input.sessionID);
      const roles = policy?.roles ?? sessionRoles.get(input.sessionID);
      if (!roles || roles.length === 0) {
        return;
      }

      const targets = policy?.targets ?? buildTurnTargets(roles, "");
      const mcpProviders = policy?.mcpProviders ?? [];
      const mcpHints = policy?.mcpHints ?? [];
      const staleSensitive = policy?.staleSensitive ?? false;
      output.system.push(buildSystemInstruction(roles, targets, mcpProviders, mcpHints, staleSensitive));
      systemInjectedForSession.add(input.sessionID);
    },
    "tool.execute.before": async (input) => {
      const provider = providerFromToolName(input.tool);
      if (!provider) {
        return;
      }

      const policy = sessionPolicy.get(input.sessionID);
      if (!policy) {
        return;
      }

      if (policy.mcpProviders.length === 0) {
        throw new Error("MCP calls are disabled unless a provider is explicitly mentioned in the prompt.");
      }

      if (!policy.mcpProviders.includes(provider)) {
        throw new Error(`MCP provider '${provider}' is blocked for this turn; only explicitly mentioned providers are allowed.`);
      }

      if (policy.mcpProviders.length > 1) {
        const missing = getMissingProviders(policy);
        if (missing.length > 0 && !missing.includes(provider)) {
          throw new Error(
            `MCP provider '${provider}' is temporarily blocked until each named provider is checked at least once. Missing: ${missing.join(", ")}.`
          );
        }
      }

      const cap = policy.allowDeepMcp ? 6 : 2;
      if (policy.mcpCallCount >= cap) {
        throw new Error(`MCP call limit reached for this turn (${cap}). Ask for deeper investigation to increase the limit.`);
      }

      policy.mcpCallCount += 1;
      policy.mcpTouched[provider] = (policy.mcpTouched[provider] ?? 0) + 1;
      sessionPolicy.set(input.sessionID, policy);
    },
    "experimental.text.complete": async (input, output) => {
      const policy = sessionPolicy.get(input.sessionID);
      if (!policy) {
        return;
      }

      let nextText = output.text;
      if (policy.roles.length > 1) {
        nextText = normalizeThreadOutput(nextText, policy.roles, policy.targets);
      }

      if (policy.mcpProviders.length > 1) {
        const missingProviders = getMissingProviders(policy);
        if (missingProviders.length > 0) {
          nextText = appendMissingProviderNotice(nextText, policy.roles[0], policy.roles.length > 1, missingProviders);
        }
      }

      const shouldSuggestMcp = policy.staleSensitive && policy.mcpProviders.length === 0;
      if (shouldSuggestMcp) {
        nextText = appendMcpSuggestion(nextText, policy.roles[0], policy.roles.length > 1);
      }

      output.text = nextText;
    }
  };
};

import type { Role } from "./types";

export type SupervisorReasonCategory =
  | "route-selection"
  | "assignment"
  | "writer-policy"
  | "fallback"
  | "budget-escalation"
  | "approval-pause"
  | "governance-policy"
  | "blocked-action";

export type SupervisorReasonCode =
  | "route.intent-profile"
  | "route.lane-match"
  | "route.multi-role-thread"
  | "route.delegated-thread"
  | "assignment.sticky-session-owner"
  | "assignment.deterministic-owner"
  | "assignment.weighted-turns"
  | "writer.designated"
  | "writer.reassigned"
  | "writer.handoff"
  | "writer.aborted"
  | "writer.proposal-only-enforced"
  | "fallback.missing-prerequisites"
  | "fallback.low-confidence"
  | "fallback.compaction-guardrail"
  | "fallback.compaction-critical-slots"
  | "fallback.compaction-continuity"
  | "budget.warning-threshold"
  | "budget.escalation-required"
  | "budget.hard-stop"
  | "budget.output-compact"
  | "budget.output-truncate"
  | "budget.output-halt"
  | "approval.manual-review-default"
  | "approval.service-critical-review"
  | "approval.blocked-path-review"
  | "approval.eligible-path-review"
  | "approval.auto-merge-allowed"
  | "approval.protected-path-review"
  | "approval.protected-path-denied"
  | "approval.protected-path-allowed"
  | "approval.governance-boundary"
  | "approval.resume-approved"
  | "approval.rejected-hold"
  | "governance.explicit-policy"
  | "governance.policy-default"
  | "governance.policy-missing"
  | "governance.policy-invalid"
  | "delegation.launch"
  | "provenance.delegated-wave"
  | "provenance.max-parallel"
  | "blocked.missing-mcp-provider"
  | "blocked.mcp-access"
  | "blocked.unknown-run"
  | "blocked.unknown-lane"
  | "blocked.unknown-session";

export type SupervisorReasonDetail = {
  code: SupervisorReasonCode;
  category: SupervisorReasonCategory;
  short: string;
  explanation: string;
};

type SupervisorReasonContext = {
  leadRole?: Role;
  roles?: readonly Role[];
  targets?: Partial<Record<Role, number>>;
  usagePercent?: number;
  missingProviders?: readonly string[];
  missingPrerequisites?: readonly string[];
  actionReason?: string;
  intent?: string;
  path?: string;
  laneId?: string;
  owner?: string;
  confidence?: string;
  policyId?: string;
};

const formatRoleList = (roles: readonly Role[]): string => roles.join(", ");

const formatTurnPlan = (targets: Partial<Record<Role, number>>, roles: readonly Role[]): string => roles
  .filter((role) => (targets[role] ?? 0) > 0)
  .map((role) => `${role}:${targets[role]}`)
  .join(" ");

type ReasonEntry = {
  category: SupervisorReasonCategory;
  build: (ctx: SupervisorReasonContext) => { short: string; explanation: string };
};

const rl = (roles: SupervisorReasonContext["roles"]): readonly Role[] => roles ?? [];
const or = (val: string | undefined, fallback: string): string => val ?? fallback;
const withAction = (tpl: string, reason: string | undefined, fallback: string): string =>
  reason ? `${tpl}: ${reason}.` : fallback;

const REASON_TABLE: Record<SupervisorReasonCode, ReasonEntry> = {
  "route.intent-profile": { category: "route-selection", build: (c) => ({ short: "Intent profile selected the route.", explanation: `Routed this work unit to ${or(c.path, "the default execution path")}${c.intent ? ` from the ${c.intent} intent profile` : ""}.`.trim() }) },
  "route.lane-match": { category: "route-selection", build: (c) => ({ short: "Lane matched for execution.", explanation: `Matched this work unit to ${or(c.laneId, "the selected lane")}${c.path ? ` on the ${c.path} path` : ""} so the supervisor can continue deterministically.` }) },
  "route.multi-role-thread": { category: "route-selection", build: (c) => ({ short: "Multi-role thread selected.", explanation: rl(c.roles).length > 0 ? `Routed this checkpoint through a threaded discussion because multiple roles stayed active: ${formatRoleList(rl(c.roles))}.` : "Routed this checkpoint through a threaded discussion because multiple roles stayed active." }) },
  "route.delegated-thread": { category: "route-selection", build: (c) => ({ short: "Delegation expanded the route.", explanation: rl(c.roles).length > 0 ? `Expanded a single-role response into a threaded route after delegation activated: ${formatRoleList(rl(c.roles))}.` : "Expanded a single-role response into a threaded route after delegation activated additional roles." }) },
  "assignment.sticky-session-owner": { category: "assignment", build: (c) => ({ short: "Existing owner kept.", explanation: `Kept ${or(c.owner, "the existing lane owner")} assigned because the lane already has an attached runtime owner.` }) },
  "assignment.deterministic-owner": { category: "assignment", build: (c) => ({ short: "Deterministic owner assigned.", explanation: `Assigned ${or(c.owner, "the selected owner")} with a stable deterministic selection so repeated routing keeps the same owner.` }) },
  "assignment.weighted-turns": { category: "assignment", build: (c) => { const roles = rl(c.roles); const plan = c.targets && roles.length > 0 ? formatTurnPlan(c.targets, roles) : ""; const lead = c.leadRole ? ` Lead ${c.leadRole} opens and closes.` : ""; return { short: "Weighted turn plan assigned.", explanation: (plan ? `Assigned turns with the weighted plan ${plan}.${lead}` : `Assigned turns with the detected role weighting.${lead}`).trim() }; } },
  "writer.designated": { category: "writer-policy", build: (c) => ({ short: "Writer lane designated.", explanation: `Designated ${or(c.laneId, "a lane")} as the single writer lane.${c.actionReason ? ` ${c.actionReason}` : ""}`.trim() }) },
  "writer.reassigned": { category: "writer-policy", build: (c) => ({ short: "Writer lane reassigned.", explanation: `Reassigned single-writer authority to ${or(c.laneId, "a lane")}${c.actionReason ? ` because ${c.actionReason}` : ""}.` }) },
  "writer.handoff": { category: "writer-policy", build: (c) => ({ short: "Writer handoff applied.", explanation: `Handed off single-writer authority to ${or(c.laneId, "a lane")}${c.actionReason ? ` with rationale: ${c.actionReason}` : ""}.` }) },
  "writer.aborted": { category: "writer-policy", build: (c) => ({ short: "Writer lane aborted.", explanation: `Cleared active writer authority${c.actionReason ? ` because ${c.actionReason}` : " due to an explicit abort directive"}.` }) },
  "writer.proposal-only-enforced": { category: "writer-policy", build: (c) => ({ short: "Proposal-only enforcement.", explanation: `${or(c.laneId, "Lane")} is restricted to proposal-only/read-only execution under the active single-writer policy.` }) },
  "fallback.missing-prerequisites": { category: "fallback", build: (c) => ({ short: "Prerequisites still missing.", explanation: `Held execution on a safe fallback path because prerequisite references are still missing: ${c.missingPrerequisites?.join(", ") ?? "required prerequisites"}.` }) },
  "fallback.low-confidence": { category: "fallback", build: (c) => ({ short: "Routing confidence is low.", explanation: c.confidence ? `Held execution on a safe fallback path because routing confidence stayed ${c.confidence}.` : "Held execution on a safe fallback path because routing confidence stayed too low." }) },
  "fallback.compaction-guardrail": { category: "fallback", build: () => ({ short: "Compaction skipped.", explanation: "Full context kept because compaction would not save enough space." }) },
  "fallback.compaction-critical-slots": { category: "fallback", build: () => ({ short: "Compaction kept key signal.", explanation: "Full context kept because compaction would hide goals, constraints, blockers, or next steps." }) },
  "fallback.compaction-continuity": { category: "fallback", build: () => ({ short: "Compaction kept recent context.", explanation: "Full context kept because compaction would hide the latest working context." }) },
  "budget.warning-threshold": { category: "budget-escalation", build: (c) => ({ short: "Budget warning threshold crossed.", explanation: `Budget usage reached ${c.usagePercent}% and stayed in warning mode, so execution can continue under watch.` }) },
  "budget.escalation-required": { category: "budget-escalation", build: (c) => ({ short: "Budget escalation required.", explanation: `Budget usage reached ${c.usagePercent}% and now requires checkpoint review before more automation continues.` }) },
  "budget.hard-stop": { category: "budget-escalation", build: (c) => ({ short: "Budget hard stop triggered.", explanation: `Budget usage reached ${c.usagePercent}% and hit the configured hard stop, so automation pauses here.` }) },
  "budget.output-compact": { category: "budget-escalation", build: (c) => ({ short: "Output compacted for budget.", explanation: withAction("Compacted the checkpoint output to stay within budget", c.actionReason, "Compacted the checkpoint output to stay within budget.") }) },
  "budget.output-truncate": { category: "budget-escalation", build: (c) => ({ short: "Output truncated for budget.", explanation: withAction("Truncated the checkpoint output to stay within budget", c.actionReason, "Truncated the checkpoint output to stay within budget.") }) },
  "budget.output-halt": { category: "budget-escalation", build: (c) => ({ short: "Output paused for budget.", explanation: withAction("Paused the checkpoint output because the budget governor blocked more output", c.actionReason, "Paused the checkpoint output because the budget governor blocked more output.") }) },
  "approval.manual-review-default": { category: "approval-pause", build: () => ({ short: "Manual review is still the default.", explanation: "Paused for human approval because the repository keeps merge decisions in manual review mode by default." }) },
  "approval.service-critical-review": { category: "approval-pause", build: () => ({ short: "Service-critical change needs review.", explanation: "Paused for human approval because service-critical changes are not allowed to auto-merge without an explicit opt-in." }) },
  "approval.blocked-path-review": { category: "approval-pause", build: () => ({ short: "Blocked paths need review.", explanation: "Paused for human approval because one or more changed paths are explicitly blocked from auto-merge." }) },
  "approval.eligible-path-review": { category: "approval-pause", build: () => ({ short: "Path policy needs review.", explanation: "Paused for human approval because one or more changed paths fell outside the configured auto-merge scope." }) },
  "approval.auto-merge-allowed": { category: "approval-pause", build: () => ({ short: "Auto-merge checks passed.", explanation: "Allowed auto-merge because criticality, path, and opt-in policy checks all passed." }) },
  "approval.protected-path-review": { category: "approval-pause", build: () => ({ short: "Protected paths need review.", explanation: "Paused for human approval because one or more changed paths matched a protected-path rule that requires review and audit evidence." }) },
  "approval.protected-path-denied": { category: "blocked-action", build: () => ({ short: "Protected paths denied.", explanation: "Blocked the action because one or more changed paths matched a protected-path rule that does not allow autonomous writes or merges." }) },
  "approval.protected-path-allowed": { category: "approval-pause", build: () => ({ short: "Protected-path checks passed.", explanation: "Allowed the action because every changed path stayed inside the currently allowed protected-path policy scope." }) },
  "approval.governance-boundary": { category: "approval-pause", build: (c) => ({ short: "Governance boundary requires approval.", explanation: `Paused at the ${or(c.path, "governance")} governance boundary until a human approves ${or(c.actionReason, "the requested action")}.` }) },
  "approval.resume-approved": { category: "approval-pause", build: (c) => ({ short: "Human approval received.", explanation: `Resumed only after an explicit human approval event cleared ${or(c.actionReason, "the requested action")} at the ${or(c.path, "governance")} governance boundary.` }) },
  "approval.rejected-hold": { category: "approval-pause", build: (c) => ({ short: "Approval rejected.", explanation: `Kept execution paused because human review rejected ${or(c.actionReason, "the requested action")} at the ${or(c.path, "governance")} governance boundary.` }) },
  "governance.explicit-policy": { category: "governance-policy", build: (c) => ({ short: "Explicit governance policy matched.", explanation: `Applied explicit governance policy at ${or(c.path, "checkpoint")} and routed the checkpoint to ${or(c.actionReason, "accept")}.${c.policyId ? ` Matched rules: ${c.policyId}.` : ""}`.trim() }) },
  "governance.policy-default": { category: "governance-policy", build: (c) => ({ short: "Checkpoint default applied.", explanation: `No explicit governance rule matched at ${or(c.path, "checkpoint")}, so the configured default routed the checkpoint to ${or(c.actionReason, "accept")}.` }) },
  "governance.policy-missing": { category: "governance-policy", build: (c) => ({ short: "Governance policy missing.", explanation: `No governance policy is configured for ${or(c.path, "checkpoint")}, so the evaluator failed open to ${or(c.actionReason, "accept")} and recorded a warning.` }) },
  "governance.policy-invalid": { category: "governance-policy", build: (c) => ({ short: "Supervisor policy invalid.", explanation: `The ${or(c.path, "supervisor policy")} configuration is invalid, so the runtime failed safe to ${or(c.actionReason, "safe defaults")}.${c.policyId ? ` Diagnostics: ${c.policyId}.` : ""}`.trim() }) },
  "blocked.missing-mcp-provider": { category: "blocked-action", build: (c) => ({ short: "Required MCP check still missing.", explanation: `Blocked the final recommendation until at least one MCP check covers: ${c.missingProviders?.join(", ") ?? "the required providers"}.` }) },
  "blocked.mcp-access": { category: "blocked-action", build: (c) => ({ short: "MCP access blocked.", explanation: withAction("Blocked the MCP action", c.actionReason, "Blocked the MCP action because it did not satisfy the current policy.") }) },
  "blocked.unknown-run": { category: "blocked-action", build: (c) => ({ short: "Supervisor run not found.", explanation: withAction("Blocked the workflow action because the supervisor run could not be found", c.actionReason, "Blocked the workflow action because the supervisor run could not be found.") }) },
  "blocked.unknown-lane": { category: "blocked-action", build: (c) => ({ short: "Lane not found.", explanation: withAction("Blocked the workflow action because the lane could not be found", c.actionReason, "Blocked the workflow action because the lane could not be found.") }) },
  "blocked.unknown-session": { category: "blocked-action", build: (c) => ({ short: "Session not found.", explanation: withAction("Blocked the workflow action because the runtime session could not be found", c.actionReason, "Blocked the workflow action because the runtime session could not be found.") }) },
  "delegation.launch": { category: "route-selection", build: (c) => ({ short: "Delegation launch.", explanation: c.leadRole ? `Delegated launch by ${c.leadRole}: ${formatRoleList(rl(c.roles))}.` : "Delegated launch to downstream agents." }) },
  "provenance.delegated-wave": { category: "assignment", build: (c) => ({ short: "Delegated wave.", explanation: c.leadRole ? `Delegated wave by ${c.leadRole}: ${formatRoleList(rl(c.roles))}.` : "Delegated wave to downstream agents." }) },
  "provenance.max-parallel": { category: "assignment", build: (c) => ({ short: "Max parallel agents.", explanation: c.usagePercent !== undefined ? `Max parallel agents: ${c.usagePercent}.` : "Max parallel agents constraint applied." }) },
};

export const createSupervisorReasonDetail = (
  code: SupervisorReasonCode,
  context: SupervisorReasonContext = {}
): SupervisorReasonDetail => {
  const entry = REASON_TABLE[code];
  const { short, explanation } = entry.build(context);
  return { code, category: entry.category, short, explanation };
};

export const formatSupervisorReason = (
  detail: SupervisorReasonDetail,
  prefix = "[Supervisor]"
): string => `${prefix} ${detail.code}: ${detail.explanation}`;

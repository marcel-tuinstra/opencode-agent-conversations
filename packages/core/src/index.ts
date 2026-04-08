// Shared, platform-agnostic contracts and deterministic policy logic.
// Milestone-1 bridge: expose core primitives from the existing implementation
// while we progressively move files into packages/core.

export * from "./types.ts";
export * from "./constants.ts";
export * from "./discovery-heuristics.ts";
export * from "./roles.ts";
export * from "./intent.ts";
export * from "./work-unit.ts";
export * from "./lane-plan.ts";
export * from "../../../plugins/orchestration-workflows/lane-contract.ts";
export * from "../../../plugins/orchestration-workflows/lane-decomposition.ts";
export * from "./turn-ownership.ts";
export * from "../../../plugins/orchestration-workflows/supervisor-goal-plan.ts";
export * from "../../../plugins/orchestration-workflows/supervisor-routing.ts";
export * from "../../../plugins/orchestration-workflows/supervisor-dispatch-planning.ts";
export * from "./governance-policy.ts";
export * from "./protected-path-policy.ts";
export * from "./path-policy.ts";
export * from "../../../plugins/orchestration-workflows/approval-gates.ts";
export * from "../../../plugins/orchestration-workflows/merge-policy.ts";
export * from "../../../plugins/orchestration-workflows/reason-codes.ts";
export * from "../../../plugins/orchestration-workflows/review-ready-packet.ts";
export * from "../../../plugins/orchestration-workflows/review-coordination.ts";
export * from "./budget-governance.ts";
export * from "../../../plugins/orchestration-workflows/guardrail-thresholds.ts";
export * from "../../../plugins/orchestration-workflows/supervisor-config.ts";

export {
  BUDGET_PROFILES,
  VALID_BUDGET_PROFILE_NAMES,
  getBudgetProfileFromEnv,
  getDefaultBudgetProfileName,
  resolveBudgetProfile
} from "./budget-profiles.ts";

export type {
  BudgetProfileName,
  BudgetProfilePreset,
  BudgetRuntimeConfig,
  CompactionConfig
} from "./budget-profiles.ts";

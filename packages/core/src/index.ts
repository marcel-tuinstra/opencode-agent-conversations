// Shared, platform-agnostic contracts and deterministic policy logic.
// Milestone-1 bridge: expose core primitives from the existing implementation
// while we progressively move files into packages/core.

export * from "../../../plugins/orchestration-workflows/types.ts";
export * from "../../../plugins/orchestration-workflows/constants.ts";
export * from "../../../plugins/orchestration-workflows/discovery-heuristics.ts";
export * from "../../../plugins/orchestration-workflows/roles.ts";
export * from "../../../plugins/orchestration-workflows/intent.ts";
export * from "../../../plugins/orchestration-workflows/work-unit.ts";
export * from "../../../plugins/orchestration-workflows/lane-plan.ts";
export * from "../../../plugins/orchestration-workflows/lane-contract.ts";
export * from "../../../plugins/orchestration-workflows/lane-decomposition.ts";
export * from "../../../plugins/orchestration-workflows/turn-ownership.ts";
export * from "../../../plugins/orchestration-workflows/supervisor-goal-plan.ts";
export * from "../../../plugins/orchestration-workflows/supervisor-routing.ts";
export * from "../../../plugins/orchestration-workflows/supervisor-dispatch-planning.ts";
export * from "../../../plugins/orchestration-workflows/governance-policy.ts";
export * from "../../../plugins/orchestration-workflows/protected-path-policy.ts";
export * from "../../../plugins/orchestration-workflows/path-policy.ts";
export * from "../../../plugins/orchestration-workflows/approval-gates.ts";
export * from "../../../plugins/orchestration-workflows/merge-policy.ts";
export * from "../../../plugins/orchestration-workflows/reason-codes.ts";
export * from "../../../plugins/orchestration-workflows/review-ready-packet.ts";
export * from "../../../plugins/orchestration-workflows/review-coordination.ts";
export * from "../../../plugins/orchestration-workflows/budget-governance.ts";
export * from "../../../plugins/orchestration-workflows/guardrail-thresholds.ts";
export * from "../../../plugins/orchestration-workflows/supervisor-config.ts";

export {
  BUDGET_PROFILES,
  VALID_BUDGET_PROFILE_NAMES,
  getBudgetProfileFromEnv,
  getDefaultBudgetProfileName,
  resolveBudgetProfile
} from "../../../plugins/orchestration-workflows/budget-profiles.ts";

export type {
  BudgetProfileName,
  BudgetProfilePreset,
  BudgetRuntimeConfig,
  CompactionConfig
} from "../../../plugins/orchestration-workflows/budget-profiles.ts";

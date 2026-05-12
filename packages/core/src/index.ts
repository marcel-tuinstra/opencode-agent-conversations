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
export * from "./lane-contract.ts";
export * from "./lane-decomposition.ts";
export * from "./supervisor-lane-definitions.ts";
export * from "./turn-ownership.ts";
export * from "./supervisor-goal-plan.ts";
export * from "./supervisor-routing.ts";
export * from "./supervisor-dispatch-planning.ts";
export * from "./governance-policy.ts";
export * from "./protected-path-policy.ts";
export * from "./path-policy.ts";
export * from "./reason-codes.ts";
export * from "./budget-governance.ts";
export * from "./guardrail-thresholds.ts";
export * from "./supervisor-config.ts";
export * from "./debug.ts";

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

import {
  planSupervisorGoal,
  type PlanSupervisorGoalResult
} from "../../core/src/supervisor-goal-plan.ts";
import {
  DISCOVERY_CUE_REGEX,
  isDiscoveryStyleGoal
} from "../../core/src/discovery-heuristics.ts";
import {
  decomposeSupervisorGoalIntoLanes,
  type SupervisorLaneDecompositionResult
} from "../../core/src/lane-decomposition.ts";
import { normalizeWorkUnit } from "../../core/src/work-unit.ts";
import type { LanePlanningWorkUnit } from "../../core/src/lane-plan.ts";
import type { SupervisorLaneDefinition } from "../../../plugins/agent-council/supervisor-scheduler.ts";
import { SUPPORTED_ROLES } from "../../core/src/types.ts";
import { getSupervisorPolicy } from "../../../plugins/agent-council/supervisor-config.ts";

export const SUPERVISOR_TRIGGER_REGEX = /^@supervisor\s+/i;

export type SupervisorPlanResult = {
  goalPlan: PlanSupervisorGoalResult;
  workUnits: LanePlanningWorkUnit[];
  laneDecomposition: SupervisorLaneDecompositionResult | null;
  preview: string;
  status: "supported" | "unsupported";
  warnings: string[];
};

export const detectSupervisorTrigger = (
  text: string
): { detected: boolean; goal: string } => {
  const trimmed = text.trim();

  if (/^@supervisor$/i.test(trimmed)) {
    return { detected: true, goal: "" };
  }

  if (SUPERVISOR_TRIGGER_REGEX.test(trimmed)) {
    const goal = trimmed.replace(/^@supervisor\s+/i, "").trim();
    return { detected: true, goal };
  }

  return { detected: false, goal: "" };
};

const STRONG_SEGMENT_SPLIT_REGEX = /;\s*|\n+/;

const EXECUTION_LIST_CUE_PATTERN = "build|implement|fix|refactor|design|plan|investigate|analy[sz]e|draft|deliver|create|update|write|add|remove|migrate|optimi[sz]e|ship|document|test|validate|map|size";
const EXECUTION_LIST_CUE_REGEX = new RegExp(`\\b(${EXECUTION_LIST_CUE_PATTERN})\\b`, "i");
const SYNTHESIS_JOINER_REGEX = /\b(and|plus|with)\b/i;
const DISCOVERY_LEADING_VERB_REGEX =
  /^(?:then\s+)?(?:research|explore|scope|define|identify|assess|evaluate|compare|analy[sz]e|synthesize|recommend|benchmark|summari[sz]e)\s+/i;
const STEP_LEADING_CUE_REGEX = new RegExp(
  `^(?:then\\s+)?(?:${EXECUTION_LIST_CUE_PATTERN}|research|explore|scope|define|identify|assess|evaluate|compare|synthesize|recommend|benchmark|summari[sz]e)\\b`,
  "i"
);

const normalizeGoalText = (value: string): string => value.replace(/\s+/g, " ").trim();

const titleCaseFirst = (value: string): string =>
  value.length === 0 ? value : value.charAt(0).toUpperCase() + value.slice(1);

const buildSequentialWorkUnits = (segments: readonly string[]): LanePlanningWorkUnit[] => {
  const workUnits: LanePlanningWorkUnit[] = [];

  for (let index = 0; index < segments.length; index++) {
    const segment = segments[index]!;
    const id = `wu-${index + 1}`;
    const dependsOn = index > 0 ? [`wu-${index}`] : [];

    const normalized = normalizeWorkUnit({
      objective: segment,
      source: {
        kind: "ad-hoc",
        title: segment
      }
    });

    workUnits.push({
      id,
      workUnit: normalized,
      dependsOn,
      signals: {
        fileOverlap: "low",
        coupling: index > 0 ? "medium" : "low",
        blastRadius: "contained",
        unknownCount: 0,
        testIsolation: "isolated"
      }
    });
  }

  return workUnits;
};

const splitCommaSeparatedSteps = (segmentText: string): string[] => {
  const parts = segmentText.split(",");

  if (parts.length <= 1) {
    return [normalizeGoalText(segmentText)].filter(Boolean);
  }

  const segments: string[] = [];
  let current = parts[0] ?? "";

  for (let index = 1; index < parts.length; index++) {
    const nextPart = normalizeGoalText(parts[index] ?? "");

    if (STEP_LEADING_CUE_REGEX.test(nextPart)) {
      const normalizedCurrent = normalizeGoalText(current);
      if (normalizedCurrent.length > 0) {
        segments.push(normalizedCurrent);
      }
      current = nextPart;
      continue;
    }

    current = `${current}, ${nextPart}`;
  }

  const normalizedCurrent = normalizeGoalText(current);
  if (normalizedCurrent.length > 0) {
    segments.push(normalizedCurrent);
  }

  return segments;
};

const splitIntoSegments = (goalText: string): string[] => goalText
  .split(STRONG_SEGMENT_SPLIT_REGEX)
  .flatMap((segment) => splitCommaSeparatedSteps(segment))
  .map((segment) => normalizeGoalText(segment))
  .filter(Boolean);

const shouldPreserveExecutionList = (
  goalText: string,
  segments: readonly string[],
  isDiscoveryStyle: boolean
): boolean => {
  if (segments.length <= 1) {
    return false;
  }

  const executionSegmentCount = segments.filter((segment) => EXECUTION_LIST_CUE_REGEX.test(segment)).length;
  const discoverySegmentCount = segments.filter((segment) => DISCOVERY_CUE_REGEX.test(segment)).length;

  if (isDiscoveryStyle) {
    return executionSegmentCount > 0 && discoverySegmentCount < segments.length;
  }

  if (executionSegmentCount === segments.length) {
    return true;
  }

  if (executionSegmentCount >= 2 && discoverySegmentCount === 0) {
    return true;
  }

  return /[,;\n]/.test(goalText) && /\bthen\b/i.test(goalText);
};

const buildDiscoveryWorkUnitObjectives = (goalText: string): string[] => {
  const normalizedGoal = normalizeGoalText(goalText);

  if (/\bcompare\b/i.test(normalizedGoal) && /\brecommend\b/i.test(normalizedGoal)) {
    return [
      "Frame the comparison criteria, constraints, and decision goals",
      titleCaseFirst(normalizedGoal),
      "Recommend the best option, note tradeoffs, and outline scoped next steps"
    ];
  }

  if (/\bresearch\b/i.test(normalizedGoal) && /\bcompetitor\b/i.test(normalizedGoal)) {
    return [
      "Define the competitor scan, comparison dimensions, and assumptions",
      titleCaseFirst(normalizedGoal),
      "Summarize the most relevant findings, recommendations, implications, and bounded next steps"
    ];
  }

  if (/\bdefine\b/i.test(normalizedGoal) && /\bmvp\b/i.test(normalizedGoal)) {
    return [
      "Define the target audience, core user goals, product constraints, and assumptions",
      titleCaseFirst(normalizedGoal),
      "Translate the request into a bounded MVP scope with exclusions, tradeoffs, and practical next steps"
    ];
  }

  const parts = normalizedGoal
    .split(/,|;|\band\b/gi)
    .map((part) => normalizeGoalText(part.replace(DISCOVERY_LEADING_VERB_REGEX, "")))
    .filter(Boolean);
  const focus = parts.slice(0, 3).join(", ");
  const workUnits = [
    focus.length > 0
      ? `Frame the discovery scope, success criteria, and assumptions for ${focus}`
      : "Frame the discovery scope, success criteria, and assumptions",
    titleCaseFirst(normalizedGoal)
  ];

  if (parts.length > 1 || SYNTHESIS_JOINER_REGEX.test(normalizedGoal)) {
    workUnits.push("Synthesize the findings into recommendations, scoped next steps, and follow-up questions");
  }

  return workUnits.slice(0, 4);
};

export const buildWorkUnitsFromGoal = (
  goalText: string,
  intent = "mixed"
): LanePlanningWorkUnit[] => {
  const segments = splitIntoSegments(goalText);
  const isDiscoveryStyle = isDiscoveryStyleGoal(goalText, intent);

  if (shouldPreserveExecutionList(goalText, segments, isDiscoveryStyle)) {
    return buildSequentialWorkUnits(segments);
  }

  if (isDiscoveryStyle) {
    return buildSequentialWorkUnits(buildDiscoveryWorkUnitObjectives(goalText));
  }

  return buildSequentialWorkUnits(segments.length > 0 ? segments : [normalizeGoalText(goalText)]);
};

export const buildSupervisorPlan = (goalText: string): SupervisorPlanResult => {
  const goalPlan = planSupervisorGoal({
    goal: goalText,
    availableRoles: [...SUPPORTED_ROLES]
  });

  if (goalPlan.status === "unsupported") {
    const preview = formatUnsupportedPreview(goalPlan);
    return {
      goalPlan,
      workUnits: [],
      laneDecomposition: null,
      preview,
      status: "unsupported",
      warnings: [...goalPlan.reasons]
    };
  }

  const workUnits = buildWorkUnitsFromGoal(goalText, goalPlan.intent);
  const laneDecomposition = decomposeSupervisorGoalIntoLanes({
    goalPlan,
    workUnits
  });

  const warnings: string[] = [...laneDecomposition.warnings];
  const result: SupervisorPlanResult = {
    goalPlan,
    workUnits,
    laneDecomposition,
    preview: "",
    status: laneDecomposition.status === "supported" ? "supported" : "unsupported",
    warnings
  };

  if (result.status === "unsupported") {
    for (const reason of laneDecomposition.remediation) {
      if (!result.warnings.includes(reason)) {
        result.warnings.push(reason);
      }
    }
    result.preview = formatUnsupportedPreview(goalPlan, result.warnings);
    return result;
  }

  result.preview = formatSupervisorPreview(result);
  return result;
};

const formatUnsupportedPreview = (
  goalPlan: PlanSupervisorGoalResult,
  reasons?: readonly string[]
): string => {
  const effectiveReasons = reasons ?? goalPlan.reasons;
  const lines: string[] = [];
  lines.push("[Supervisor] Plan — Unsupported");
  lines.push("");
  lines.push(`Goal: ${goalPlan.goal}`);
  lines.push("");
  lines.push("Reasons:");
  if (effectiveReasons.length === 0) {
    lines.push("  - No reason provided");
  } else {
    for (const reason of effectiveReasons) {
      lines.push(`  - ${reason}`);
    }
  }
  if (goalPlan.remediation.length > 0) {
    lines.push("");
    lines.push("Remediation:");
    for (const item of goalPlan.remediation) {
      lines.push(`  - ${item}`);
    }
  }
  return lines.join("\n");
};

const padRight = (value: string, width: number): string =>
  value + " ".repeat(Math.max(0, width - value.length));

export const formatSupervisorPreview = (plan: SupervisorPlanResult): string => {
  if (plan.status === "unsupported") {
    return formatUnsupportedPreview(plan.goalPlan, plan.warnings);
  }

  const policy = getSupervisorPolicy();
  const lines: string[] = [];

  lines.push("[Supervisor] Plan");
  lines.push("");
  lines.push(`Goal: ${plan.goalPlan.goal}`);
  lines.push(`Intent: ${plan.goalPlan.intent} | Confidence: ${plan.goalPlan.confidence} | Budget: ${plan.goalPlan.budgetClass}`);
  lines.push("");

  const laneDefinitions: readonly SupervisorLaneDefinition[] =
    plan.laneDecomposition?.laneDefinitionsPreview ?? [];

  if (laneDefinitions.length > 0) {
    lines.push("Lanes:");

    const laneIdWidth = Math.max(
      ...laneDefinitions.map((def: SupervisorLaneDefinition) => def.laneId.length),
      6
    );
    const objectiveMap = new Map<string, string>();
    for (const unit of plan.workUnits) {
      objectiveMap.set(unit.id, unit.workUnit.objective);
    }

    const roleRecommendations = plan.goalPlan.recommendedRoles;
    const defaultRole = roleRecommendations.length > 0 ? roleRecommendations[0]!.role : "DEV";

    const objectiveWidth = Math.max(
      ...laneDefinitions.map((d: SupervisorLaneDefinition) =>
        d.workUnitIds.map((id: string) => objectiveMap.get(id) ?? id).join(", ").length
      ),
      32
    );

    for (const def of laneDefinitions) {
      const objective = def.workUnitIds
        .map((id: string) => objectiveMap.get(id) ?? id)
        .join(", ");

      const role = def.sequence <= roleRecommendations.length
        ? roleRecommendations[def.sequence - 1]!.role
        : defaultRole;

      const deps = def.dependsOnLaneIds.length > 0
        ? `depends on ${def.dependsOnLaneIds.join(", ")}`
        : "--";

      lines.push(
        `  ${padRight(def.laneId, laneIdWidth)}  ${padRight(objective, objectiveWidth)}  ${padRight(String(role), 4)}  ${deps}`
      );
    }

    lines.push("");
  }

  const activeLaneCap = Math.min(
    policy.limits.lanes.activeCapsByTier["small-high-risk"],
    policy.limits.lanes.activeCapsByTier["medium-moderate-risk"],
    policy.limits.lanes.activeCapsByTier["large-mature"]
  );

  const executionMode = laneDefinitions.length <= 1
    ? "single"
    : activeLaneCap <= 1
      ? `sequential (${activeLaneCap} active lane)`
      : `parallel (up to ${activeLaneCap} active lanes)`;

  lines.push(`Execution: ${executionMode} | Merge: ${policy.approvalGates.mergeMode}`);
  lines.push(`Policy: ${policy.profile}`);
  lines.push("");
  lines.push("[Supervisor] Mode: active. Child sessions will be launched for each lane.");

  return lines.join("\n");
};

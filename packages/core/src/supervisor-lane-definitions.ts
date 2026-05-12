import type { LanePlan } from "./lane-plan.ts";

export type SupervisorLaneDefinition = {
  laneId: string;
  sequence: number;
  workUnitIds: readonly string[];
  dependsOnLaneIds: readonly string[];
  branch: string;
};

export type CreateSupervisorLaneDefinitionsOptions = {
  branchPrefix?: string;
  laneIdPrefix?: string;
};

const freezeList = <T>(items: readonly T[]): readonly T[] => Object.freeze([...items]);

const assertNonEmpty = (value: string, field: string): string => {
  const normalized = value.trim();

  if (normalized.length === 0) {
    throw new Error(`Supervisor lane definitions require a non-empty ${field}.`);
  }

  return normalized;
};

export const createSupervisorLaneDefinitions = (
  lanePlan: LanePlan,
  options: CreateSupervisorLaneDefinitionsOptions = {}
): readonly SupervisorLaneDefinition[] => {
  const laneIdPrefix = options.laneIdPrefix ?? "lane";
  const branchPrefix = assertNonEmpty(options.branchPrefix ?? "supervisor", "branch prefix");
  const workUnitLaneMap = new Map(lanePlan.dependencyGraph.map((node) => [node.id, node.lane]));

  return freezeList(lanePlan.lanes
    .map((lane) => {
      const dependsOnLaneIds = Array.from(new Set(
        lane.workUnitIds.flatMap((workUnitId) => {
          const node = lanePlan.dependencyGraph.find((candidate) => candidate.id === workUnitId);
          return (node?.blockedBy ?? [])
            .map((dependencyWorkUnitId) => workUnitLaneMap.get(dependencyWorkUnitId))
            .filter((dependencyLane): dependencyLane is number => dependencyLane !== undefined && dependencyLane !== lane.lane)
            .map((dependencyLane) => `${laneIdPrefix}-${dependencyLane}`);
        })
      )).sort((left, right) => left.localeCompare(right));

      return Object.freeze({
        laneId: `${laneIdPrefix}-${lane.lane}`,
        sequence: lane.lane,
        workUnitIds: [...lane.workUnitIds],
        dependsOnLaneIds,
        branch: `${branchPrefix}/lane-${String(lane.lane).padStart(2, "0")}`
      });
    })
    .sort((left, right) => left.sequence - right.sequence || left.laneId.localeCompare(right.laneId)));
};

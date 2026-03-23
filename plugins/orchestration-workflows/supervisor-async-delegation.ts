import { getSupervisorPolicy } from "./supervisor-config.ts";

export type SupervisorAsyncDelegationPlanStatus = "supported" | "unsupported";

export type SupervisorAsyncDelegationLaneState =
  | "ready"
  | "launching"
  | "launched"
  | "completed"
  | "failed";

export type SupervisorAsyncDelegationTransition = {
  from: SupervisorAsyncDelegationLaneState;
  to: SupervisorAsyncDelegationLaneState;
  occurredAt: string;
  reason: string;
};

export type SupervisorAsyncDelegationLaneSnapshot = {
  laneId: string;
  role: string;
  objective: string;
  state: SupervisorAsyncDelegationLaneState;
  childSessionId?: string;
  launchAttemptCount: number;
  updatedAt: string;
  transitions: readonly SupervisorAsyncDelegationTransition[];
};

export type SupervisorAsyncDelegationGovernanceDecision = {
  allowed: boolean;
  reasonCode?: string;
  reason?: string;
};

export type SupervisorAsyncDelegationLaunchDecision = {
  allowed: boolean;
  reasonCode?: string;
  reason?: string;
  lane?: SupervisorAsyncDelegationLaneSnapshot;
};

export type SupervisorAsyncDelegationEventDecision = {
  matched: boolean;
  transitioned: boolean;
  parentSessionId?: string;
  laneId?: string;
  nextState?: SupervisorAsyncDelegationLaneState;
};

type MutableLaneRecord = {
  laneId: string;
  role: string;
  objective: string;
  state: SupervisorAsyncDelegationLaneState;
  childSessionId?: string;
  launchAttemptCount: number;
  updatedAt: string;
  transitions: SupervisorAsyncDelegationTransition[];
};

type ParentDelegationRecord = {
  planStatus: SupervisorAsyncDelegationPlanStatus;
  allowedLaneIds: ReadonlySet<string>;
  lanes: Map<string, MutableLaneRecord>;
};

const SUPERVISOR_ASYNC_TRANSITIONS: Readonly<Record<SupervisorAsyncDelegationLaneState, readonly SupervisorAsyncDelegationLaneState[]>> = {
  ready: ["launching"],
  launching: ["launched", "failed"],
  launched: ["completed", "failed"],
  completed: ["launching"],
  failed: ["launching"]
};

const TERMINAL_LANE_STATES = new Set<SupervisorAsyncDelegationLaneState>(["completed", "failed"]);

const SESSION_EVENT_TO_STATE: Readonly<Record<string, SupervisorAsyncDelegationLaneState | undefined>> = {
  "session.idle": "completed",
  "session.completed": "completed",
  "session.error": "failed"
};

const canTransition = (
  from: SupervisorAsyncDelegationLaneState,
  to: SupervisorAsyncDelegationLaneState
): boolean => SUPERVISOR_ASYNC_TRANSITIONS[from].includes(to);

const toSnapshot = (lane: MutableLaneRecord): SupervisorAsyncDelegationLaneSnapshot => ({
  laneId: lane.laneId,
  role: lane.role,
  objective: lane.objective,
  state: lane.state,
  childSessionId: lane.childSessionId,
  launchAttemptCount: lane.launchAttemptCount,
  updatedAt: lane.updatedAt,
  transitions: Object.freeze([...lane.transitions])
});

const transitionLane = (
  lane: MutableLaneRecord,
  to: SupervisorAsyncDelegationLaneState,
  occurredAt: string,
  reason: string
): boolean => {
  if (!canTransition(lane.state, to)) {
    return false;
  }

  lane.transitions.push({ from: lane.state, to, occurredAt, reason });
  lane.state = to;
  lane.updatedAt = occurredAt;
  return true;
};

const normalizeNow = (occurredAt?: string): string => occurredAt ?? new Date().toISOString();

const normalizeSet = (items: readonly string[] | undefined): ReadonlySet<string> => {
  const normalized = (items ?? []).map((item) => item.trim()).filter(Boolean);
  return new Set(normalized);
};

export const createSupervisorAsyncDelegationRuntime = () => {
  const byParentSession = new Map<string, ParentDelegationRecord>();

  const primeParent = (input: {
    parentSessionId: string;
    planStatus: SupervisorAsyncDelegationPlanStatus;
    allowedLaneIds?: readonly string[];
  }): void => {
    byParentSession.set(input.parentSessionId, {
      planStatus: input.planStatus,
      allowedLaneIds: normalizeSet(input.allowedLaneIds),
      lanes: new Map<string, MutableLaneRecord>()
    });
  };

  const clearParent = (parentSessionId: string): void => {
    byParentSession.delete(parentSessionId);
  };

  const evaluateLaunchGovernance = (input: {
    parentSessionId: string;
    laneId: string;
    role: string;
    objective: string;
  }): SupervisorAsyncDelegationGovernanceDecision => {
    const parent = byParentSession.get(input.parentSessionId);
    if (!parent) {
      return {
        allowed: false,
        reasonCode: "governance.parent-missing",
        reason: "No active supervisor plan is registered for this parent session."
      };
    }

    if (!input.laneId.trim()) {
      return {
        allowed: false,
        reasonCode: "governance.invalid-lane",
        reason: "Lane id must be non-empty."
      };
    }

    if (!input.role.trim()) {
      return {
        allowed: false,
        reasonCode: "governance.invalid-role",
        reason: "Role must be non-empty."
      };
    }

    if (!input.objective.trim()) {
      return {
        allowed: false,
        reasonCode: "governance.invalid-objective",
        reason: "Objective must be non-empty."
      };
    }

    const existing = parent.lanes.get(input.laneId);
    if (existing && !TERMINAL_LANE_STATES.has(existing.state) && existing.state !== "ready") {
      return {
        allowed: false,
        reasonCode: "governance.lane-in-flight",
        reason: `Lane '${input.laneId}' already has an in-flight child session.`
      };
    }

    const requireDelegationLog = getSupervisorPolicy().execution.requireDelegationLog;
    if (!requireDelegationLog) {
      return { allowed: true };
    }

    return { allowed: true };
  };

  const beginLaunch = (input: {
    parentSessionId: string;
    laneId: string;
    role: string;
    objective: string;
    occurredAt?: string;
  }): SupervisorAsyncDelegationLaunchDecision => {
    const governance = evaluateLaunchGovernance(input);
    if (!governance.allowed) {
      return governance;
    }

    const parent = byParentSession.get(input.parentSessionId)!;
    const occurredAt = normalizeNow(input.occurredAt);
    const lane = parent.lanes.get(input.laneId) ?? {
      laneId: input.laneId,
      role: input.role,
      objective: input.objective,
      state: "ready" as const,
      launchAttemptCount: 0,
      updatedAt: occurredAt,
      transitions: []
    };

    lane.role = input.role;
    lane.objective = input.objective;
    lane.childSessionId = undefined;

    if (!transitionLane(lane, "launching", occurredAt, "begin-launch")) {
      return {
        allowed: false,
        reasonCode: "runtime.invalid-transition",
        reason: `Cannot transition lane '${input.laneId}' from ${lane.state} to launching.`
      };
    }

    lane.launchAttemptCount += 1;
    parent.lanes.set(input.laneId, lane);

    return {
      allowed: true,
      lane: toSnapshot(lane)
    };
  };

  const commitLaunch = (input: {
    parentSessionId: string;
    laneId: string;
    childSessionId: string;
    occurredAt?: string;
  }): SupervisorAsyncDelegationLaunchDecision => {
    const parent = byParentSession.get(input.parentSessionId);
    const lane = parent?.lanes.get(input.laneId);
    if (!parent || !lane) {
      return {
        allowed: false,
        reasonCode: "runtime.lane-not-found",
        reason: `Lane '${input.laneId}' is not tracked for parent session '${input.parentSessionId}'.`
      };
    }

    const occurredAt = normalizeNow(input.occurredAt);
    if (!transitionLane(lane, "launched", occurredAt, "commit-launch")) {
      return {
        allowed: false,
        reasonCode: "runtime.invalid-transition",
        reason: `Cannot transition lane '${input.laneId}' from ${lane.state} to launched.`
      };
    }

    lane.childSessionId = input.childSessionId;
    return { allowed: true, lane: toSnapshot(lane) };
  };

  const failLaunch = (input: {
    parentSessionId: string;
    laneId: string;
    reason: string;
    occurredAt?: string;
  }): SupervisorAsyncDelegationLaunchDecision => {
    const parent = byParentSession.get(input.parentSessionId);
    const lane = parent?.lanes.get(input.laneId);
    if (!parent || !lane) {
      return {
        allowed: false,
        reasonCode: "runtime.lane-not-found",
        reason: `Lane '${input.laneId}' is not tracked for parent session '${input.parentSessionId}'.`
      };
    }

    const occurredAt = normalizeNow(input.occurredAt);
    if (!transitionLane(lane, "failed", occurredAt, `launch-failed:${input.reason}`)) {
      return {
        allowed: false,
        reasonCode: "runtime.invalid-transition",
        reason: `Cannot transition lane '${input.laneId}' from ${lane.state} to failed.`
      };
    }

    return { allowed: true, lane: toSnapshot(lane) };
  };

  const applySessionEvent = (input: {
    eventType: string;
    childSessionId: string;
    occurredAt?: string;
  }): SupervisorAsyncDelegationEventDecision => {
    if (!input.childSessionId.trim()) {
      return { matched: false, transitioned: false };
    }

    for (const [parentSessionId, parent] of byParentSession) {
      for (const lane of parent.lanes.values()) {
        if (lane.childSessionId !== input.childSessionId) {
          continue;
        }

        const targetState = SESSION_EVENT_TO_STATE[input.eventType];
        if (!targetState) {
          return {
            matched: true,
            transitioned: false,
            parentSessionId,
            laneId: lane.laneId,
            nextState: lane.state
          };
        }

        if (TERMINAL_LANE_STATES.has(lane.state)) {
          return {
            matched: true,
            transitioned: false,
            parentSessionId,
            laneId: lane.laneId,
            nextState: lane.state
          };
        }

        const transitioned = transitionLane(lane, targetState, normalizeNow(input.occurredAt), `event:${input.eventType}`);
        return {
          matched: true,
          transitioned,
          parentSessionId,
          laneId: lane.laneId,
          nextState: lane.state
        };
      }
    }

    return { matched: false, transitioned: false };
  };

  const getChildSessions = (parentSessionId: string): readonly SupervisorAsyncDelegationLaneSnapshot[] => {
    const parent = byParentSession.get(parentSessionId);
    if (!parent) {
      return Object.freeze([]);
    }

    return Object.freeze(
      [...parent.lanes.values()]
        .filter((lane) => Boolean(lane.childSessionId))
        .map((lane) => toSnapshot(lane))
    );
  };

  const allChildSessionsTerminal = (parentSessionId: string): boolean => {
    const children = getChildSessions(parentSessionId);
    if (children.length === 0) {
      return false;
    }

    return children.every((child) => TERMINAL_LANE_STATES.has(child.state));
  };

  return {
    primeParent,
    clearParent,
    evaluateLaunchGovernance,
    beginLaunch,
    commitLaunch,
    failLaunch,
    applySessionEvent,
    getChildSessions,
    allChildSessionsTerminal
  };
};

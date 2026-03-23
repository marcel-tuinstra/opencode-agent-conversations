/**
 * Shared internal utility functions.
 *
 * This module is NOT exported from any barrel — it is strictly internal to the
 * orchestration-workflows plugin.
 */

export const freezeRecord = <T extends Record<string, unknown>>(value: T): Readonly<T> =>
  Object.freeze({ ...value });

export const freezeList = <T>(items: readonly T[]): readonly T[] =>
  Object.freeze([...items]);

export const assertNonEmpty = (value: string, field: string, context?: string): string => {
  const normalized = value.trim();

  if (normalized.length === 0) {
    throw new Error(`${context ?? "Validation"} requires a non-empty ${field}.`);
  }

  return normalized;
};

export const assertTimestamp = (value: string, field: string, context?: string): string => {
  const normalized = assertNonEmpty(value, field, context);

  if (Number.isNaN(Date.parse(normalized))) {
    throw new Error(`${context ?? "Validation"} requires a valid ${field}.`);
  }

  return normalized;
};

export const findLane = <T extends { laneId: string }>(
  state: { lanes: readonly T[] },
  laneId: string
): T | undefined => state.lanes.find((lane) => lane.laneId === laneId);

export const findWorktree = <T extends { worktreeId: string }>(
  state: { worktrees: readonly T[] },
  worktreeId?: string
): T | undefined => worktreeId
  ? state.worktrees.find((worktree) => worktree.worktreeId === worktreeId)
  : undefined;

export const findSession = <T extends { sessionId: string }>(
  state: { sessions: readonly T[] },
  sessionId?: string
): T | undefined => sessionId
  ? state.sessions.find((session) => session.sessionId === sessionId)
  : undefined;

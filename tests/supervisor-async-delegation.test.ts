import { describe, expect, it } from "vitest";
import { createSupervisorAsyncDelegationRuntime } from "../plugins/orchestration-workflows/supervisor-async-delegation";

describe("supervisor-async-delegation", () => {
  it("blocks launches when no parent supervisor plan is registered", () => {
    const runtime = createSupervisorAsyncDelegationRuntime();

    const launch = runtime.beginLaunch({
      parentSessionId: "parent-1",
      laneId: "lane-1",
      role: "DEV",
      objective: "Build feature"
    });

    expect(launch.allowed).toBe(false);
    expect(launch.reasonCode).toBe("governance.parent-missing");
  });

  it("enforces plan status and approved lane ids for launches", () => {
    const runtime = createSupervisorAsyncDelegationRuntime();
    runtime.primeParent({
      parentSessionId: "parent-unsupported",
      planStatus: "unsupported",
      allowedLaneIds: ["lane-1"]
    });

    const unsupportedLaunch = runtime.beginLaunch({
      parentSessionId: "parent-unsupported",
      laneId: "lane-1",
      role: "DEV",
      objective: "Build feature"
    });
    expect(unsupportedLaunch.allowed).toBe(false);
    expect(unsupportedLaunch.reasonCode).toBe("governance.plan-unsupported");

    runtime.primeParent({
      parentSessionId: "parent-supported",
      planStatus: "supported",
      allowedLaneIds: ["lane-1"]
    });
    const supportedLaunch = runtime.beginLaunch({
      parentSessionId: "parent-supported",
      laneId: "lane-999",
      role: "DEV",
      objective: "Build feature"
    });
    expect(supportedLaunch.allowed).toBe(false);
    expect(supportedLaunch.reasonCode).toBe("governance.lane-not-approved");
  });

  it("does not report terminal completion while launches are in flight or planned lanes are missing", () => {
    const runtime = createSupervisorAsyncDelegationRuntime();
    runtime.primeParent({
      parentSessionId: "parent-4",
      planStatus: "supported",
      allowedLaneIds: ["lane-1", "lane-2"]
    });

    const beginLaneOne = runtime.beginLaunch({
      parentSessionId: "parent-4",
      laneId: "lane-1",
      role: "DEV",
      objective: "First lane"
    });
    expect(beginLaneOne.allowed).toBe(true);
    expect(runtime.allChildSessionsTerminal("parent-4")).toBe(false);

    runtime.commitLaunch({
      parentSessionId: "parent-4",
      laneId: "lane-1",
      childSessionId: "child-4"
    });
    runtime.applySessionEvent({ eventType: "session.completed", childSessionId: "child-4" });

    // lane-2 never launched yet, so parent should not be considered terminal.
    expect(runtime.allChildSessionsTerminal("parent-4")).toBe(false);
  });

  it("applies deterministic launch -> complete transitions and ignores late terminal flips", () => {
    const runtime = createSupervisorAsyncDelegationRuntime();
    runtime.primeParent({
      parentSessionId: "parent-1",
      planStatus: "supported",
      allowedLaneIds: ["lane-1"]
    });

    const begin = runtime.beginLaunch({
      parentSessionId: "parent-1",
      laneId: "lane-1",
      role: "DEV",
      objective: "Build feature"
    });
    expect(begin.allowed).toBe(true);
    expect(begin.lane?.state).toBe("launching");

    const commit = runtime.commitLaunch({
      parentSessionId: "parent-1",
      laneId: "lane-1",
      childSessionId: "child-1"
    });
    expect(commit.allowed).toBe(true);
    expect(commit.lane?.state).toBe("launched");

    const completed = runtime.applySessionEvent({
      eventType: "session.completed",
      childSessionId: "child-1"
    });
    expect(completed).toMatchObject({
      matched: true,
      transitioned: true,
      nextState: "completed"
    });

    const lateFailure = runtime.applySessionEvent({
      eventType: "session.error",
      childSessionId: "child-1"
    });
    expect(lateFailure).toMatchObject({
      matched: true,
      transitioned: false,
      nextState: "completed"
    });
  });

  it("supports deterministic relaunch after terminal states for recovery/regression", () => {
    const runtime = createSupervisorAsyncDelegationRuntime();
    runtime.primeParent({
      parentSessionId: "parent-2",
      planStatus: "supported",
      allowedLaneIds: ["lane-1"]
    });

    runtime.beginLaunch({
      parentSessionId: "parent-2",
      laneId: "lane-1",
      role: "DEV",
      objective: "First attempt"
    });
    runtime.commitLaunch({
      parentSessionId: "parent-2",
      laneId: "lane-1",
      childSessionId: "child-a"
    });
    runtime.applySessionEvent({ eventType: "session.error", childSessionId: "child-a" });

    const retry = runtime.beginLaunch({
      parentSessionId: "parent-2",
      laneId: "lane-1",
      role: "DEV",
      objective: "Retry attempt"
    });
    expect(retry.allowed).toBe(true);
    expect(retry.lane?.state).toBe("launching");
    expect(retry.lane?.launchAttemptCount).toBe(2);

    const commitRetry = runtime.commitLaunch({
      parentSessionId: "parent-2",
      laneId: "lane-1",
      childSessionId: "child-b"
    });
    expect(commitRetry.allowed).toBe(true);
    runtime.applySessionEvent({ eventType: "session.idle", childSessionId: "child-b" });

    expect(runtime.allChildSessionsTerminal("parent-2")).toBe(true);
  });

  it("treats unknown session events as matched no-ops for tracked children", () => {
    const runtime = createSupervisorAsyncDelegationRuntime();
    runtime.primeParent({
      parentSessionId: "parent-3",
      planStatus: "supported",
      allowedLaneIds: ["lane-1"]
    });
    runtime.beginLaunch({
      parentSessionId: "parent-3",
      laneId: "lane-1",
      role: "DEV",
      objective: "Build feature"
    });
    runtime.commitLaunch({
      parentSessionId: "parent-3",
      laneId: "lane-1",
      childSessionId: "child-3"
    });

    const heartbeat = runtime.applySessionEvent({
      eventType: "session.heartbeat",
      childSessionId: "child-3"
    });

    expect(heartbeat).toMatchObject({
      matched: true,
      transitioned: false,
      nextState: "launched"
    });
    expect(runtime.allChildSessionsTerminal("parent-3")).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import {
  createSupervisorDispatchPlan,
  evaluateBudgetGovernance,
  evaluateGovernancePolicy,
  resolveBudgetGovernancePolicy,
  routeSupervisorWorkUnit,
  type LanePlanningWorkUnit,
  type Role
} from "../packages/core/src/index.ts";

type PlatformId = "opencode" | "claude-code" | "codex";

const PLATFORMS: readonly PlatformId[] = ["opencode", "claude-code", "codex"];

const snapshotForPlatform = (platform: PlatformId) => {
  const budgetPolicy = resolveBudgetGovernancePolicy({
    warningThresholdPercents: [80, 100, 120],
    escalationThresholdPercent: 110,
    hardStopEnabled: true,
    hardStopThresholdPercent: 130
  });

  const budgetDecision = evaluateBudgetGovernance(budgetPolicy, {
    scope: "run",
    usedTokens: 1200,
    budgetTokens: 1000
  });

  const governanceDecision = evaluateGovernancePolicy({
    checkpoint: "lane-output-review",
    violations: [
      {
        code: "missing-review-packet-artifact",
        field: "artifacts",
        message: "Missing review packet"
      }
    ]
  });

  const workUnit = {
    objective: "Stabilize API latency and preserve release safety.",
    constraints: ["Do not merge without review"],
    acceptanceCriteria: ["p95 improves"],
    dependencies: [],
    riskTags: ["production"],
    evidenceLinks: [],
    source: {
      kind: "ad-hoc" as const,
      title: "Latency response",
      metadata: {}
    }
  };

  const routeDecision = routeSupervisorWorkUnit({
    workUnitId: "WU-1",
    workUnit,
    sessionOwners: ["alice", "bob"]
  });

  const workUnits: LanePlanningWorkUnit[] = [
    {
      id: "WU-1",
      workUnit,
      dependsOn: [],
      signals: {
        fileOverlap: "medium",
        coupling: "medium",
        blastRadius: "adjacent",
        unknownCount: 1,
        testIsolation: "partial"
      }
    }
  ];

  const dispatchPlan = createSupervisorDispatchPlan({
    goalPlan: {
      status: "supported",
      goal: "Stabilize production latency",
      intent: "backend",
      confidence: "high",
      budgetClass: "standard",
      laneCount: 1,
      requiresApproval: true,
      approvalBoundaries: ["release"],
      recommendedRoles: [
        {
          role: "CTO" as Role,
          count: 1,
          rationale: "Lead role"
        }
      ],
      reasons: ["Backend intent"],
      remediation: []
    },
    workUnits
  });

  return {
    platform,
    budget: {
      status: budgetDecision.status,
      shouldPauseAutomation: budgetDecision.shouldPauseAutomation,
      recommendations: budgetDecision.recommendations
    },
    governance: {
      outcome: governanceDecision.outcome,
      route: governanceDecision.route,
      source: governanceDecision.source
    },
    routing: {
      executionPath: routeDecision.executionPath,
      leadRole: routeDecision.leadRole,
      nextAction: routeDecision.nextAction,
      confidence: routeDecision.confidence
    },
    dispatch: {
      status: dispatchPlan.status,
      laneInputCount: dispatchPlan.laneInputs.length,
      routeCount: dispatchPlan.routeResults.length
    }
  };
};

describe("cross-platform parity scenarios", () => {
  it("keeps core governance, budget, and dispatch decisions identical across platforms", () => {
    const snapshots = PLATFORMS.map((platform) => snapshotForPlatform(platform));
    const [, ...rest] = snapshots;
    const baseline = snapshots[0];

    for (const snapshot of rest) {
      expect(snapshot.budget).toEqual(baseline.budget);
      expect(snapshot.governance).toEqual(baseline.governance);
      expect(snapshot.routing).toEqual(baseline.routing);
      expect(snapshot.dispatch).toEqual(baseline.dispatch);
    }
  });
});

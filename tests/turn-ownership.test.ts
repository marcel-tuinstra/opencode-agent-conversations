import { describe, expect, it } from "vitest";
import {
  assertLaneTurnOwner,
  canRoleWriteToLane,
  createLaneTurnHandoffContract,
  designateLaneWriter,
  transferLaneTurn,
  type LaneTurnOwnership
} from "../plugins/orchestration-workflows/turn-ownership";

const activeDevTurn: LaneTurnOwnership = {
  laneId: "lane-1",
  activeRole: "DEV",
  writeAuthorityRole: "DEV",
  writeCapability: "writer",
  writerProvenance: [],
  handoffHistory: []
};

describe("turn-ownership", () => {
  it("requires structured handoff fields aligned to the evidence packet", () => {
    // Arrange

    // Act
    const handoff = createLaneTurnHandoffContract({
      laneId: "lane-1",
      currentOwner: "DEV",
      nextOwner: "TESTER",
      transferScope: "test",
      transferTrigger: "Implementation is complete and ready for verification.",
      deltaSummary: "Added the lane ownership contract and packet fields.",
      risks: ["Regression coverage still depends on lane-specific validation."],
      nextRequiredEvidence: ["Run the targeted handoff and lifecycle tests."],
      evidenceAttached: ["tests/turn-ownership.test.ts", "tests/lane-lifecycle.test.ts"],
      openQuestions: ["None"]
    });

    // Assert
    expect(handoff.deltaSummary).toBe("Added the lane ownership contract and packet fields.");
    expect(handoff.risks).toEqual(["Regression coverage still depends on lane-specific validation."]);
    expect(handoff.nextRequiredEvidence).toEqual(["Run the targeted handoff and lifecycle tests."]);
  });

  it("enforces one active role with write authority per lane", () => {
    // Arrange

    // Act
    const devCanWrite = canRoleWriteToLane("DEV", activeDevTurn);
    const pmCanWrite = canRoleWriteToLane("PM", activeDevTurn);

    // Assert
    expect(devCanWrite).toBe(true);
    expect(pmCanWrite).toBe(false);
    expect(() => assertLaneTurnOwner("PM", activeDevTurn)).toThrow(
      "Role PM does not hold the active lane turn for lane-1; current owner is DEV."
    );
  });

  it("supports explicit re-entry loops through audited handoffs", () => {
    // Arrange

    // Act
    const testerTurn = transferLaneTurn(activeDevTurn, {
      laneId: "lane-1",
      currentOwner: "DEV",
      nextOwner: "TESTER",
      transferScope: "test",
      transferTrigger: "DEV linked passing implementation evidence.",
      deltaSummary: "Feature code is ready for tester validation.",
      risks: ["Edge-case coverage still needs confirmation."],
      nextRequiredEvidence: ["Record failing or passing validation notes."],
      evidenceAttached: ["Evidence packet acceptance trace"],
      openQuestions: []
    });

    const devReentryTurn = transferLaneTurn(testerTurn, {
      laneId: "lane-1",
      currentOwner: "TESTER",
      nextOwner: "DEV",
      transferScope: "implementation",
      transferTrigger: "Tester found a follow-up fix that needs code changes.",
      deltaSummary: "Validation exposed a missing edge-case guard.",
      risks: ["The fix must preserve the original handoff behavior."],
      nextRequiredEvidence: ["Add regression coverage for the reported case."],
      evidenceAttached: ["Tester notes with the failing scenario"],
      openQuestions: ["Confirm whether the follow-up needs another review pass."]
    });

    // Assert
    expect(testerTurn.activeRole).toBe("TESTER");
    expect(devReentryTurn.activeRole).toBe("DEV");
    expect(devReentryTurn.writeAuthorityRole).toBe("DEV");
    expect(devReentryTurn.handoffHistory).toHaveLength(2);
    expect(devReentryTurn.handoffHistory.map((handoff) => `${handoff.currentOwner}->${handoff.nextOwner}`)).toEqual([
      "DEV->TESTER",
      "TESTER->DEV"
    ]);
  });

  it("supports writer reassignment provenance without changing active owner", () => {
    const reassigned = designateLaneWriter(activeDevTurn, {
      nextWriterRole: "TESTER",
      reasonCode: "writer.reassignment",
      reason: "DEV lane hit a flaky runtime failure and handoff was requested.",
      actor: "supervisor",
      occurredAt: "2026-03-23T10:00:00.000Z"
    });

    expect(reassigned.activeRole).toBe("DEV");
    expect(reassigned.writeAuthorityRole).toBe("TESTER");
    expect(reassigned.writeCapability).toBe("writer");
    expect(reassigned.writerProvenance).toHaveLength(1);
    expect(reassigned.writerProvenance?.[0]?.reasonCode).toBe("writer.reassignment");
  });

  it("allows handoff without write authority transfer for proposal-only reviewers", () => {
    const handoff = transferLaneTurn(activeDevTurn, {
      laneId: "lane-1",
      currentOwner: "DEV",
      nextOwner: "REVIEWER",
      transferScope: "review",
      transferTrigger: "Move to review while keeping writer authority on DEV.",
      deltaSummary: "Review pass before integrating code edits.",
      risks: ["Reviewer should not write code in single-writer mode."],
      nextRequiredEvidence: ["Review packet"],
      evidenceAttached: ["docs/review-packet.md"],
      transferWriteAuthority: false
    });

    expect(handoff.activeRole).toBe("REVIEWER");
    expect(handoff.writeAuthorityRole).toBe("DEV");
    expect(handoff.writeCapability).toBe("proposal-only");
  });

  it("rejects handoffs that omit required risks or evidence expectations", () => {
    // Arrange

    // Act / Assert
    expect(() => createLaneTurnHandoffContract({
      laneId: "lane-1",
      currentOwner: "DEV",
      nextOwner: "TESTER",
      transferScope: "test",
      transferTrigger: "Ready for test.",
      deltaSummary: "Docs updated.",
      risks: [],
      nextRequiredEvidence: ["Run the smoke test."],
      evidenceAttached: ["Updated docs"],
      openQuestions: []
    })).toThrow("Lane turn handoff requires at least one risk entry.");
  });
});

import type { Role } from "./types";
import { assertNonEmpty as assertNonEmptyValue } from "./internal-utils";

export type LaneTurnRole = Role | "TESTER" | "REVIEWER" | (string & {});
export type LaneWriteCapability = "writer" | "proposal-only";
export type LaneWriterReasonCode =
  | "writer.initial-designation"
  | "writer.handoff"
  | "writer.reassignment"
  | "writer.failure-recovery"
  | "writer.abort";

export type LaneTurnTransferScope = "implementation" | "test" | "review" | "release-readiness" | "docs";

export type LaneTurnOwnership = {
  laneId: string;
  activeRole: LaneTurnRole;
  writeAuthorityRole: LaneTurnRole;
  writeCapability?: LaneWriteCapability;
  writerProvenance?: LaneWriterProvenanceEntry[];
  handoffHistory: LaneTurnHandoffContract[];
};

export type LaneWriterProvenanceEntry = {
  fromRole?: LaneTurnRole;
  toRole?: LaneTurnRole;
  reasonCode: LaneWriterReasonCode;
  reason: string;
  actor: string;
  occurredAt: string;
};

export type LaneTurnHandoffInput = {
  laneId: string;
  currentOwner: LaneTurnRole;
  nextOwner: LaneTurnRole;
  transferScope: LaneTurnTransferScope;
  transferTrigger: string;
  deltaSummary: string;
  risks: readonly string[];
  nextRequiredEvidence: readonly string[];
  evidenceAttached: readonly string[];
  openQuestions?: string[];
  transferWriteAuthority?: boolean;
  writerReasonCode?: Exclude<LaneWriterReasonCode, "writer.abort" | "writer.initial-designation">;
  writerReason?: string;
  writerActor?: string;
  writerOccurredAt?: string;
};

export type LaneTurnHandoffContract = LaneTurnHandoffInput & {
  openQuestions: readonly string[];
};

const normalizeEvidenceList = (values: readonly string[], field: string): string[] => {
  const normalized = values
    .map((value) => value.trim())
    .filter((value, index, all) => value.length > 0 && all.indexOf(value) === index);

  if (normalized.length === 0) {
    throw new Error(`Lane turn handoff requires at least one ${field}.`);
  }

  return normalized;
};

export const assertLaneTurnOwner = (role: LaneTurnRole, ownership: LaneTurnOwnership): void => {
  if (ownership.activeRole !== role || ownership.writeAuthorityRole !== role) {
    throw new Error(
      `Role ${role} does not hold the active lane turn for ${ownership.laneId}; current owner is ${ownership.activeRole}.`
    );
  }
};

export const canRoleWriteToLane = (role: LaneTurnRole, ownership: LaneTurnOwnership): boolean => (
  ownership.activeRole === role && ownership.writeAuthorityRole === role
);

export const createLaneTurnHandoffContract = (input: LaneTurnHandoffInput): LaneTurnHandoffContract => ({
  laneId: assertNonEmptyValue(input.laneId, "lane id"),
  currentOwner: input.currentOwner,
  nextOwner: input.nextOwner,
  transferScope: input.transferScope,
  transferTrigger: assertNonEmptyValue(input.transferTrigger, "transfer trigger"),
  deltaSummary: assertNonEmptyValue(input.deltaSummary, "delta summary"),
  risks: normalizeEvidenceList(input.risks, "risk entry"),
  nextRequiredEvidence: normalizeEvidenceList(input.nextRequiredEvidence, "next required evidence entry"),
  evidenceAttached: normalizeEvidenceList(input.evidenceAttached, "attached evidence entry"),
  openQuestions: (input.openQuestions ?? []).map((value) => value.trim()).filter((value) => value.length > 0)
});

export const designateLaneWriter = (
  ownership: LaneTurnOwnership,
  input: {
    nextWriterRole?: LaneTurnRole;
    reasonCode: LaneWriterReasonCode;
    reason: string;
    actor: string;
    occurredAt: string;
  }
): LaneTurnOwnership => {
  const nextWriterRole = input.nextWriterRole;
  const writeAuthorityRole = nextWriterRole ?? ownership.writeAuthorityRole;
  const writeCapability: LaneWriteCapability = writeAuthorityRole === ownership.activeRole ? "writer" : "proposal-only";

  return {
    ...ownership,
    writeAuthorityRole,
    writeCapability,
    writerProvenance: [
      ...(ownership.writerProvenance ?? []),
      {
        fromRole: ownership.writeAuthorityRole,
        toRole: nextWriterRole,
        reasonCode: input.reasonCode,
        reason: assertNonEmptyValue(input.reason, "writer designation reason"),
        actor: assertNonEmptyValue(input.actor, "writer designation actor"),
        occurredAt: assertNonEmptyValue(input.occurredAt, "writer designation timestamp")
      }
    ]
  };
};

export const transferLaneTurn = (
  ownership: LaneTurnOwnership,
  handoffInput: LaneTurnHandoffInput
): LaneTurnOwnership => {
  const handoff = createLaneTurnHandoffContract(handoffInput);

  if (handoff.laneId !== ownership.laneId) {
    throw new Error(`Lane turn handoff lane mismatch: ${handoff.laneId} != ${ownership.laneId}`);
  }

  assertLaneTurnOwner(handoff.currentOwner, ownership);

  const transferWriteAuthority = handoffInput.transferWriteAuthority ?? true;
  const nextWriteAuthorityRole = transferWriteAuthority ? handoff.nextOwner : ownership.writeAuthorityRole;
  const writerProvenance = [...(ownership.writerProvenance ?? [])];
  if (transferWriteAuthority) {
    writerProvenance.push({
      fromRole: ownership.writeAuthorityRole,
      toRole: handoff.nextOwner,
      reasonCode: handoffInput.writerReasonCode ?? "writer.handoff",
      reason: assertNonEmptyValue(handoffInput.writerReason ?? handoff.transferTrigger, "writer handoff reason"),
      actor: assertNonEmptyValue(handoffInput.writerActor ?? String(handoff.currentOwner), "writer handoff actor"),
      occurredAt: assertNonEmptyValue(handoffInput.writerOccurredAt ?? new Date().toISOString(), "writer handoff timestamp")
    });
  }

  return {
    laneId: ownership.laneId,
    activeRole: handoff.nextOwner,
    writeAuthorityRole: nextWriteAuthorityRole,
    writeCapability: nextWriteAuthorityRole === handoff.nextOwner ? "writer" : "proposal-only",
    writerProvenance,
    handoffHistory: [...ownership.handoffHistory, handoff]
  };
};

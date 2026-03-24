import type { Role } from "./types.ts";

/** Roles that should not own implementation work. */
export const MANAGER_ROLES = Object.freeze([
  "CEO",
  "CTO",
  "PM",
  "PO",
  "RESEARCH",
  "MARKETING",
  "DESIGN",
  "QA",
  "REVIEWER"
] as const satisfies readonly Role[]);

// npm package root entry for agent-council
// This is what consumers import via `import { ... } from "agent-council"`
//
// This is NOT the OpenCode plugin entry — that is plugins/agent-council.ts
// which must export ONLY the plugin factory function.

export { AgentConversations } from "./plugins/agent-council/index.ts";
export { SUPPORTED_ROLES } from "./plugins/agent-council/types.ts";
export type {
  DelegationMode,
  DelegationPlan,
  DelegationRequest,
  DelegationWave,
  Intent,
  Role,
  SessionPolicy
} from "./plugins/agent-council/types.ts";

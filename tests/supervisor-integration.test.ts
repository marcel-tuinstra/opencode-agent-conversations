import { afterEach, describe, expect, it, vi } from "vitest";
import { AgentConversations } from "../plugins/orchestration-workflows/index";
import {
  sessionPolicy,
  systemInjectedForSession
} from "../plugins/orchestration-workflows/session";
import type { PluginInput, OpencodeClient } from "@opencode-ai/plugin";

/**
 * Mock PluginInput for testing AgentConversations hooks.
 */
const createMockPluginInput = (overrides?: {
  client?: OpencodeClient;
  directory?: string;
}): PluginInput => ({
  client: overrides?.client ?? (undefined as any),
  project: {},
  directory: overrides?.directory ?? "/tmp/test-project",
  worktree: "/tmp/test-project",
  serverUrl: new URL("http://localhost:3000"),
  $: {}
});

/**
 * Build a mock messages output structure matching what OpenCode provides.
 */
const createMessagesOutput = (text: string, sessionID: string) => ({
  messages: [
    {
      info: { role: "user", sessionID },
      parts: [{ type: "text", text }]
    }
  ]
});

/**
 * Build a mock system transform input/output pair.
 */
const createSystemTransformIO = (sessionID: string) => ({
  input: { sessionID },
  output: { system: [] as string[] }
});

/**
 * Build a mock text complete input/output pair.
 */
const createTextCompleteIO = (sessionID: string, text: string) => ({
  input: { sessionID },
  output: { text }
});

afterEach(() => {
  sessionPolicy.clear();
  systemInjectedForSession.clear();
});

describe("supervisor integration (Wave 4)", () => {
  describe("messages.transform — supervisor trigger detection", () => {
    it("detects @supervisor trigger and sets supervisorMode in session policy", async () => {
      const hooks = await AgentConversations(createMockPluginInput());
      const sessionID = "test-session-supervisor-1";
      const output = createMessagesOutput(
        "@supervisor Build auth module, refactor API layer",
        sessionID
      );

      await hooks["experimental.chat.messages.transform"]!({}, output);

      const policy = sessionPolicy.get(sessionID);
      expect(policy).toBeDefined();
      expect(policy!.supervisorMode).toBe(true);
    });

    it("assigns recommended roles from the supervisor plan", async () => {
      const hooks = await AgentConversations(createMockPluginInput());
      const sessionID = "test-session-supervisor-2";
      const output = createMessagesOutput(
        "@supervisor Build authentication module and refactor the API contract layer",
        sessionID
      );

      await hooks["experimental.chat.messages.transform"]!({}, output);

      const policy = sessionPolicy.get(sessionID);
      expect(policy).toBeDefined();
      expect(policy!.roles.length).toBeGreaterThan(0);
      // Supervisor mode should be set
      expect(policy!.supervisorMode).toBe(true);
    });

    it("strips @supervisor prefix from message parts", async () => {
      const hooks = await AgentConversations(createMockPluginInput());
      const sessionID = "test-session-supervisor-3";
      const output = createMessagesOutput(
        "@supervisor Build authentication module and refactor the API contract layer",
        sessionID
      );

      await hooks["experimental.chat.messages.transform"]!({}, output);

      const lastMessage = output.messages[output.messages.length - 1];
      const textPart = lastMessage.parts.find((p: any) => p.type === "text") as { type: string; text: string };
      expect(textPart).toBeDefined();
      expect(textPart!.text).not.toMatch(/^@supervisor/i);
      expect(textPart!.text).toContain("Build authentication module");
    });

    it("skips normal role detection when supervisor trigger is detected", async () => {
      const hooks = await AgentConversations(createMockPluginInput());
      const sessionID = "test-session-supervisor-4";
      const output = createMessagesOutput(
        "@supervisor Build authentication module and design the frontend dashboard",
        sessionID
      );

      await hooks["experimental.chat.messages.transform"]!({}, output);

      const policy = sessionPolicy.get(sessionID);
      expect(policy).toBeDefined();
      // Should have supervisor mode, not regular role detection
      expect(policy!.supervisorMode).toBe(true);
      // Delegation should be null since we bypassed normal flow
      expect(policy!.delegation).toBeNull();
      expect(policy!.delegationPlan).toBeNull();
    });

    it("does not set supervisor mode for non-supervisor messages", async () => {
      const hooks = await AgentConversations(createMockPluginInput());
      const sessionID = "test-session-no-supervisor";
      const output = createMessagesOutput(
        "Just a plain message without any mentions",
        sessionID
      );

      await hooks["experimental.chat.messages.transform"]!({}, output);

      const policy = sessionPolicy.get(sessionID);
      // No policy should be set for a plain message (no roles detected)
      expect(policy).toBeUndefined();
    });
  });

  describe("system.transform — supervisor instruction injection", () => {
    it("injects supervisor system instructions when plan is supported", async () => {
      const hooks = await AgentConversations(createMockPluginInput());
      const sessionID = "test-session-sys-1";

      // First, set up the supervisor trigger via messages.transform
      const msgOutput = createMessagesOutput(
        "@supervisor Build authentication module and refactor the API contract layer",
        sessionID
      );
      await hooks["experimental.chat.messages.transform"]!({}, msgOutput);

      // Then call system.transform
      const { input, output } = createSystemTransformIO(sessionID);
      await hooks["experimental.chat.system.transform"]!(input, output);

      // Should have at least 2 system entries: supervisor instruction + normal instruction
      expect(output.system.length).toBeGreaterThanOrEqual(2);
      // First system entry should be the supervisor instruction
      expect(output.system[0]).toContain("Supervisor mode");
    });
  });

  describe("text.complete — supervisor plan preview", () => {
    it("prepends supervisor plan preview to output text", async () => {
      const hooks = await AgentConversations(createMockPluginInput());
      const sessionID = "test-session-text-1";

      // Set up supervisor trigger
      const msgOutput = createMessagesOutput(
        "@supervisor Build authentication module and refactor the API contract layer",
        sessionID
      );
      await hooks["experimental.chat.messages.transform"]!({}, msgOutput);

      // Call text.complete
      const { input, output } = createTextCompleteIO(sessionID, "LLM response here");
      await hooks["experimental.text.complete"]!(input, output);

      // Output should start with supervisor plan preview
      expect(output.text).toContain("[Supervisor] Plan");
    });

    it("shows sane synthesized preview for mixed discovery prompts", async () => {
      const hooks = await AgentConversations(createMockPluginInput());
      const sessionID = "test-session-text-discovery";

      const msgOutput = createMessagesOutput(
        "@supervisor research competitor patterns, shape launch positioning, and outline a near-term roadmap",
        sessionID
      );
      await hooks["experimental.chat.messages.transform"]!({}, msgOutput);

      const { input, output } = createTextCompleteIO(sessionID, "LLM response here");
      await hooks["experimental.text.complete"]!(input, output);

      expect(output.text).toContain("[Supervisor] Plan");
      expect(output.text).toContain("comparison dimensions");
      expect(output.text).toContain("recommendations");
    });
  });

  describe("tool registration — supervisor_launch", () => {
    it("returns a tool hook with supervisor_launch", async () => {
      const hooks = await AgentConversations(createMockPluginInput());
      expect(hooks.tool).toBeDefined();
      expect(hooks.tool!.supervisor_launch).toBeDefined();
    });

    it("supervisor_launch has the correct shape", async () => {
      const hooks = await AgentConversations(createMockPluginInput());
      const toolDef = hooks.tool!.supervisor_launch as any;
      expect(toolDef.description).toContain("Launch a child agent session");
      expect(toolDef.parameters).toBeDefined();
      expect(toolDef.parameters.properties.laneId).toBeDefined();
      expect(toolDef.parameters.properties.objective).toBeDefined();
      expect(toolDef.parameters.properties.role).toBeDefined();
      expect(typeof toolDef.execute).toBe("function");
    });

    it("supervisor_launch returns error when no client is available", async () => {
      const hooks = await AgentConversations(createMockPluginInput({ client: undefined as any }));
      const toolDef = hooks.tool!.supervisor_launch as any;
      const result = await toolDef.execute(
        { laneId: "lane-1", objective: "Build auth", role: "DEV" },
        { sessionID: "test-session-tool-1" }
      );
      const parsed = JSON.parse(result);
      expect(parsed.error).toContain("No OpenCode client available");
    });
  });

  describe("event hook — child session monitoring", () => {
    it("returns an event hook", async () => {
      const hooks = await AgentConversations(createMockPluginInput());
      expect(hooks.event).toBeDefined();
      expect(typeof hooks.event).toBe("function");
    });

    it("handles events without crashing when no child sessions tracked", async () => {
      const hooks = await AgentConversations(createMockPluginInput());
      // Should not throw for unrecognized events
      await hooks.event!({
        event: {
          type: "session.completed",
          properties: { sessionID: "unknown-session" }
        }
      });
    });
  });

  describe("event hook — tracked child session lifecycle (P0)", () => {
    /**
     * Helper: build a mock OpencodeClient whose session.create returns
     * a deterministic child session ID, and session.promptAsync succeeds.
     */
    const createMockClient = (childSessionId: string): OpencodeClient =>
      ({
        session: {
          create: vi.fn().mockResolvedValue({ data: { id: childSessionId } }),
          promptAsync: vi.fn().mockResolvedValue(undefined),
          status: vi.fn().mockResolvedValue({ data: {} }),
          abort: vi.fn().mockResolvedValue(undefined),
          children: vi.fn().mockResolvedValue({ data: [] }),
          messages: vi.fn().mockResolvedValue({ data: [] }),
          get: vi.fn().mockResolvedValue({ data: { id: childSessionId, status: "idle" } })
        }
      }) as any;

    /**
     * End-to-end helper: sets up supervisor mode, launches a child session,
     * and returns all the handles needed to exercise the event hook.
     */
    const setupSupervisorWithChild = async (opts: {
      parentSessionId: string;
      childSessionId: string;
      goal?: string;
      laneId?: string;
    }) => {
      const client = createMockClient(opts.childSessionId);
      const hooks = await AgentConversations(
        createMockPluginInput({ client, directory: "/tmp/test-project" })
      );

      // Step 1: trigger supervisor mode via messages.transform
      const msgOutput = createMessagesOutput(
        `@supervisor ${opts.goal ?? "Build authentication module and refactor the API contract layer"}`,
        opts.parentSessionId
      );
      await hooks["experimental.chat.messages.transform"]!({}, msgOutput);

      // Verify supervisor mode is active
      const policy = sessionPolicy.get(opts.parentSessionId);
      expect(policy).toBeDefined();
      expect(policy!.supervisorMode).toBe(true);

      // Step 2: launch a child session via the tool
      const toolDef = hooks.tool!.supervisor_launch as any;
      const launchResult = await toolDef.execute(
        {
          laneId: opts.laneId ?? "lane-1",
          objective: "Build auth module",
          role: "DEV"
        },
        { sessionID: opts.parentSessionId }
      );
      const parsed = JSON.parse(launchResult);
      expect(parsed.status).toBe("launched");
      expect(parsed.childSessionId).toBe(opts.childSessionId);

      return { hooks, client };
    };

    it("marks a tracked child session as completed on session.completed event", async () => {
      const parentId = "test-event-complete-parent";
      const childId = "test-event-complete-child";

      const { hooks } = await setupSupervisorWithChild({
        parentSessionId: parentId,
        childSessionId: childId
      });

      // Fire completion event for the child
      await hooks.event!({
        event: {
          type: "session.completed",
          properties: { sessionID: childId }
        }
      });

      // After the single child completes, supervisor state should be cleaned up.
      // We verify cleanup by checking that text.complete no longer injects the
      // supervisor plan preview (since supervisorPlans was deleted).
      const textIO = createTextCompleteIO(parentId, "Some LLM response");
      await hooks["experimental.text.complete"]!(textIO.input, textIO.output);
      expect(textIO.output.text).not.toContain("[Supervisor] Plan");
    });

    it("marks a tracked child session as failed on session.error event", async () => {
      const parentId = "test-event-error-parent";
      const childId = "test-event-error-child";

      const { hooks } = await setupSupervisorWithChild({
        parentSessionId: parentId,
        childSessionId: childId
      });

      // Fire error event for the child
      await hooks.event!({
        event: {
          type: "session.error",
          properties: { sessionID: childId }
        }
      });

      // After the single child fails, supervisor state should also be cleaned up.
      const textIO = createTextCompleteIO(parentId, "Some LLM response");
      await hooks["experimental.text.complete"]!(textIO.input, textIO.output);
      expect(textIO.output.text).not.toContain("[Supervisor] Plan");
    });

    it("marks a tracked child session as completed on session.idle event", async () => {
      const parentId = "test-event-idle-parent";
      const childId = "test-event-idle-child";

      const { hooks } = await setupSupervisorWithChild({
        parentSessionId: parentId,
        childSessionId: childId
      });

      // session.idle is treated as completion in the event handler
      await hooks.event!({
        event: {
          type: "session.idle",
          properties: { sessionID: childId }
        }
      });

      // Supervisor state cleaned up
      const textIO = createTextCompleteIO(parentId, "Some LLM response");
      await hooks["experimental.text.complete"]!(textIO.input, textIO.output);
      expect(textIO.output.text).not.toContain("[Supervisor] Plan");
    });

    it("does not clean up state until ALL children reach a terminal status", async () => {
      const parentId = "test-event-multi-parent";
      const childId1 = "test-event-multi-child-1";
      const childId2 = "test-event-multi-child-2";

      // Use a client that returns different child session IDs on successive calls
      let callCount = 0;
      const client = {
        session: {
          create: vi.fn().mockImplementation(() => {
            callCount += 1;
            return Promise.resolve({
              data: { id: callCount === 1 ? childId1 : childId2 }
            });
          }),
          promptAsync: vi.fn().mockResolvedValue(undefined),
          status: vi.fn().mockResolvedValue({ data: {} }),
          abort: vi.fn().mockResolvedValue(undefined),
          children: vi.fn().mockResolvedValue({ data: [] }),
          messages: vi.fn().mockResolvedValue({ data: [] }),
          get: vi.fn().mockResolvedValue({ data: { id: childId1, status: "idle" } })
        }
      } as any;

      const hooks = await AgentConversations(
        createMockPluginInput({ client, directory: "/tmp/test-project" })
      );

      // Trigger supervisor mode
      const msgOutput = createMessagesOutput(
        "@supervisor Build authentication module and refactor the API contract layer",
        parentId
      );
      await hooks["experimental.chat.messages.transform"]!({}, msgOutput);

      // Launch two child sessions for the same parent
      const toolDef = hooks.tool!.supervisor_launch as any;

      const result1 = JSON.parse(
        await toolDef.execute(
          { laneId: "lane-1", objective: "Build auth", role: "DEV" },
          { sessionID: parentId }
        )
      );
      expect(result1.childSessionId).toBe(childId1);

      const result2 = JSON.parse(
        await toolDef.execute(
          { laneId: "lane-2", objective: "Refactor API", role: "BE" },
          { sessionID: parentId }
        )
      );
      expect(result2.childSessionId).toBe(childId2);

      // Complete only the first child
      await hooks.event!({
        event: {
          type: "session.completed",
          properties: { sessionID: childId1 }
        }
      });

      // Supervisor plan should STILL be active (child 2 is still "launched")
      const textIO1 = createTextCompleteIO(parentId, "Intermediate response");
      await hooks["experimental.text.complete"]!(textIO1.input, textIO1.output);
      expect(textIO1.output.text).toContain("[Supervisor] Plan");

      // Now complete the second child
      await hooks.event!({
        event: {
          type: "session.completed",
          properties: { sessionID: childId2 }
        }
      });

      // NOW supervisor state should be cleaned up
      // Need to clear systemInjectedForSession to allow text.complete to run again
      systemInjectedForSession.clear();
      const textIO2 = createTextCompleteIO(parentId, "Final response");
      await hooks["experimental.text.complete"]!(textIO2.input, textIO2.output);
      expect(textIO2.output.text).not.toContain("[Supervisor] Plan");
    });

    it("cleans up when children have a mix of completed and failed statuses", async () => {
      const parentId = "test-event-mixed-parent";
      const childId1 = "test-event-mixed-child-1";
      const childId2 = "test-event-mixed-child-2";

      let callCount = 0;
      const client = {
        session: {
          create: vi.fn().mockImplementation(() => {
            callCount += 1;
            return Promise.resolve({
              data: { id: callCount === 1 ? childId1 : childId2 }
            });
          }),
          promptAsync: vi.fn().mockResolvedValue(undefined),
          status: vi.fn().mockResolvedValue({ data: {} }),
          abort: vi.fn().mockResolvedValue(undefined),
          children: vi.fn().mockResolvedValue({ data: [] }),
          messages: vi.fn().mockResolvedValue({ data: [] }),
          get: vi.fn().mockResolvedValue({ data: {} })
        }
      } as any;

      const hooks = await AgentConversations(
        createMockPluginInput({ client, directory: "/tmp/test-project" })
      );

      const msgOutput = createMessagesOutput(
        "@supervisor Build authentication module and refactor the API contract layer",
        parentId
      );
      await hooks["experimental.chat.messages.transform"]!({}, msgOutput);

      const toolDef = hooks.tool!.supervisor_launch as any;
      await toolDef.execute(
        { laneId: "lane-1", objective: "Build auth", role: "DEV" },
        { sessionID: parentId }
      );
      await toolDef.execute(
        { laneId: "lane-2", objective: "Refactor API", role: "BE" },
        { sessionID: parentId }
      );

      // Child 1 completes, child 2 fails
      await hooks.event!({
        event: { type: "session.completed", properties: { sessionID: childId1 } }
      });
      await hooks.event!({
        event: { type: "session.error", properties: { sessionID: childId2 } }
      });

      // Both terminal — cleanup should have occurred
      const textIO = createTextCompleteIO(parentId, "Response");
      await hooks["experimental.text.complete"]!(textIO.input, textIO.output);
      expect(textIO.output.text).not.toContain("[Supervisor] Plan");
    });

    it("ignores events for sessions not tracked as children", async () => {
      const parentId = "test-event-ignore-parent";
      const childId = "test-event-ignore-child";

      const { hooks } = await setupSupervisorWithChild({
        parentSessionId: parentId,
        childSessionId: childId
      });

      // Fire event for an unrelated session — should not crash or affect state
      await hooks.event!({
        event: {
          type: "session.completed",
          properties: { sessionID: "totally-unrelated-session" }
        }
      });

      // Supervisor plan should still be active (the tracked child is still "launched")
      const textIO = createTextCompleteIO(parentId, "Still running");
      await hooks["experimental.text.complete"]!(textIO.input, textIO.output);
      expect(textIO.output.text).toContain("[Supervisor] Plan");
    });

    it("handles events without properties gracefully", async () => {
      const parentId = "test-event-noprops-parent";
      const childId = "test-event-noprops-child";

      const { hooks } = await setupSupervisorWithChild({
        parentSessionId: parentId,
        childSessionId: childId
      });

      // Fire event with no properties — should not crash
      await hooks.event!({ event: { type: "session.completed" } });
      await hooks.event!({ event: { type: "session.completed", properties: {} } });
      await hooks.event!({ event: {} });

      // Supervisor state should still be intact
      const textIO = createTextCompleteIO(parentId, "Response");
      await hooks["experimental.text.complete"]!(textIO.input, textIO.output);
      expect(textIO.output.text).toContain("[Supervisor] Plan");
    });

    it("subsequent events for an already-cleaned-up child are no-ops", async () => {
      const parentId = "test-event-double-parent";
      const childId = "test-event-double-child";

      const { hooks } = await setupSupervisorWithChild({
        parentSessionId: parentId,
        childSessionId: childId
      });

      // Complete the child — triggers cleanup
      await hooks.event!({
        event: { type: "session.completed", properties: { sessionID: childId } }
      });

      // Fire another event for the same child — should be a no-op (already cleaned up)
      await hooks.event!({
        event: { type: "session.error", properties: { sessionID: childId } }
      });

      // Still cleaned up
      const textIO = createTextCompleteIO(parentId, "Response");
      await hooks["experimental.text.complete"]!(textIO.input, textIO.output);
      expect(textIO.output.text).not.toContain("[Supervisor] Plan");
    });

    it("routes events to the correct parent when multiple supervisors are active", async () => {
      // Parent A with child A
      const parentA = "test-event-multi-super-parentA";
      const childA = "test-event-multi-super-childA";

      // Parent B with child B – needs its own plugin instance (separate state)
      const parentB = "test-event-multi-super-parentB";
      const childB = "test-event-multi-super-childB";

      // Build a client that returns childA first, then childB
      let launchCount = 0;
      const client = {
        session: {
          create: vi.fn().mockImplementation(() => {
            launchCount += 1;
            return Promise.resolve({
              data: { id: launchCount === 1 ? childA : childB }
            });
          }),
          promptAsync: vi.fn().mockResolvedValue(undefined),
          status: vi.fn().mockResolvedValue({ data: {} }),
          abort: vi.fn().mockResolvedValue(undefined),
          children: vi.fn().mockResolvedValue({ data: [] }),
          messages: vi.fn().mockResolvedValue({ data: [] }),
          get: vi.fn().mockResolvedValue({ data: {} })
        }
      } as any;

      const hooks = await AgentConversations(
        createMockPluginInput({ client, directory: "/tmp/test-project" })
      );

      // Activate supervisor for Parent A
      const msgA = createMessagesOutput(
        "@supervisor Build authentication module and refactor the API contract layer",
        parentA
      );
      await hooks["experimental.chat.messages.transform"]!({}, msgA);

      // Activate supervisor for Parent B
      const msgB = createMessagesOutput(
        "@supervisor Design the database schema and implement migrations",
        parentB
      );
      await hooks["experimental.chat.messages.transform"]!({}, msgB);

      // Launch children under their respective parents
      const toolDef = hooks.tool!.supervisor_launch as any;
      const resultA = JSON.parse(
        await toolDef.execute(
          { laneId: "lane-a", objective: "Build auth", role: "DEV" },
          { sessionID: parentA }
        )
      );
      expect(resultA.childSessionId).toBe(childA);

      const resultB = JSON.parse(
        await toolDef.execute(
          { laneId: "lane-b", objective: "Design DB", role: "BE" },
          { sessionID: parentB }
        )
      );
      expect(resultB.childSessionId).toBe(childB);

      // Complete child A only — parent A should clean up, parent B should NOT
      await hooks.event!({
        event: { type: "session.completed", properties: { sessionID: childA } }
      });

      // Parent A supervisor plan should be cleaned up
      const textA = createTextCompleteIO(parentA, "Parent A response");
      await hooks["experimental.text.complete"]!(textA.input, textA.output);
      expect(textA.output.text).not.toContain("[Supervisor] Plan");

      // Parent B supervisor plan should still be active
      const textB = createTextCompleteIO(parentB, "Parent B response");
      await hooks["experimental.text.complete"]!(textB.input, textB.output);
      expect(textB.output.text).toContain("[Supervisor] Plan");

      // Now complete child B — parent B should clean up
      await hooks.event!({
        event: { type: "session.completed", properties: { sessionID: childB } }
      });

      systemInjectedForSession.clear();
      const textB2 = createTextCompleteIO(parentB, "Parent B final response");
      await hooks["experimental.text.complete"]!(textB2.input, textB2.output);
      expect(textB2.output.text).not.toContain("[Supervisor] Plan");
    });

    it("does not alter child status for unrecognized event types (e.g. session.heartbeat)", async () => {
      const parentId = "test-event-unrecognized-parent";
      const childId = "test-event-unrecognized-child";

      const { hooks } = await setupSupervisorWithChild({
        parentSessionId: parentId,
        childSessionId: childId
      });

      // Fire an event type that the handler doesn't branch on
      await hooks.event!({
        event: { type: "session.heartbeat", properties: { sessionID: childId } }
      });

      // Child should still be in "launched" status — supervisor plan still active
      const textIO = createTextCompleteIO(parentId, "Response");
      await hooks["experimental.text.complete"]!(textIO.input, textIO.output);
      expect(textIO.output.text).toContain("[Supervisor] Plan");
    });

    it("handles event with null sessionID in properties gracefully", async () => {
      const parentId = "test-event-null-sid-parent";
      const childId = "test-event-null-sid-child";

      const { hooks } = await setupSupervisorWithChild({
        parentSessionId: parentId,
        childSessionId: childId
      });

      // Fire event with null sessionID — should not crash or match any child
      await hooks.event!({
        event: { type: "session.completed", properties: { sessionID: null } }
      });

      // Supervisor state should remain intact
      const textIO = createTextCompleteIO(parentId, "Response");
      await hooks["experimental.text.complete"]!(textIO.input, textIO.output);
      expect(textIO.output.text).toContain("[Supervisor] Plan");
    });

    it("supervisor system instructions are still injected while children are in-flight", async () => {
      const parentId = "test-event-inflight-sys-parent";
      const childId = "test-event-inflight-sys-child";

      const { hooks } = await setupSupervisorWithChild({
        parentSessionId: parentId,
        childSessionId: childId
      });

      // While child is running, system.transform should still inject supervisor instructions
      const sysIO = createSystemTransformIO(parentId);
      await hooks["experimental.chat.system.transform"]!(sysIO.input, sysIO.output);

      expect(sysIO.output.system.length).toBeGreaterThanOrEqual(2);
      expect(sysIO.output.system[0]).toContain("Supervisor mode");
    });

    it("can launch additional children after some have already completed", async () => {
      const parentId = "test-event-late-launch-parent";
      const childId1 = "test-event-late-launch-child-1";
      const childId2 = "test-event-late-launch-child-2";

      let callCount = 0;
      const client = {
        session: {
          create: vi.fn().mockImplementation(() => {
            callCount += 1;
            return Promise.resolve({
              data: { id: callCount === 1 ? childId1 : childId2 }
            });
          }),
          promptAsync: vi.fn().mockResolvedValue(undefined),
          status: vi.fn().mockResolvedValue({ data: {} }),
          abort: vi.fn().mockResolvedValue(undefined),
          children: vi.fn().mockResolvedValue({ data: [] }),
          messages: vi.fn().mockResolvedValue({ data: [] }),
          get: vi.fn().mockResolvedValue({ data: {} })
        }
      } as any;

      const hooks = await AgentConversations(
        createMockPluginInput({ client, directory: "/tmp/test-project" })
      );

      // Trigger supervisor mode
      const msgOutput = createMessagesOutput(
        "@supervisor Build authentication module and refactor the API contract layer",
        parentId
      );
      await hooks["experimental.chat.messages.transform"]!({}, msgOutput);

      // Launch first child and complete it
      const toolDef = hooks.tool!.supervisor_launch as any;
      const result1 = JSON.parse(
        await toolDef.execute(
          { laneId: "lane-1", objective: "Build auth", role: "DEV" },
          { sessionID: parentId }
        )
      );
      expect(result1.childSessionId).toBe(childId1);

      // Complete child 1 — since it's the only child, cleanup triggers
      await hooks.event!({
        event: { type: "session.completed", properties: { sessionID: childId1 } }
      });

      // Re-establish supervisor state for a second wave
      systemInjectedForSession.clear();
      const msgOutput2 = createMessagesOutput(
        "@supervisor Now handle the second wave of work: deploy and monitor",
        parentId
      );
      await hooks["experimental.chat.messages.transform"]!({}, msgOutput2);

      // Launch second child under fresh supervisor state
      const result2 = JSON.parse(
        await toolDef.execute(
          { laneId: "lane-2", objective: "Deploy", role: "DEV" },
          { sessionID: parentId }
        )
      );
      expect(result2.childSessionId).toBe(childId2);

      // Second child is in-flight — supervisor plan should be active
      const textIO = createTextCompleteIO(parentId, "Second wave response");
      await hooks["experimental.text.complete"]!(textIO.input, textIO.output);
      expect(textIO.output.text).toContain("[Supervisor] Plan");

      // Complete second child — cleanup triggers
      await hooks.event!({
        event: { type: "session.completed", properties: { sessionID: childId2 } }
      });

      systemInjectedForSession.clear();
      const textIO2 = createTextCompleteIO(parentId, "All done");
      await hooks["experimental.text.complete"]!(textIO2.input, textIO2.output);
      expect(textIO2.output.text).not.toContain("[Supervisor] Plan");
    });

    it("handles rapid-fire events for the same child without race conditions", async () => {
      const parentId = "test-event-rapidfire-parent";
      const childId = "test-event-rapidfire-child";

      const { hooks } = await setupSupervisorWithChild({
        parentSessionId: parentId,
        childSessionId: childId
      });

      // Fire multiple events concurrently for the same child
      await Promise.all([
        hooks.event!({
          event: { type: "session.completed", properties: { sessionID: childId } }
        }),
        hooks.event!({
          event: { type: "session.error", properties: { sessionID: childId } }
        }),
        hooks.event!({
          event: { type: "session.idle", properties: { sessionID: childId } }
        })
      ]);

      // Should not crash; supervisor state should be cleaned up
      const textIO = createTextCompleteIO(parentId, "Response");
      await hooks["experimental.text.complete"]!(textIO.input, textIO.output);
      expect(textIO.output.text).not.toContain("[Supervisor] Plan");
    });
  });

  describe("backward compatibility", () => {
    it("existing @cto role detection still works alongside supervisor", async () => {
      const hooks = await AgentConversations(createMockPluginInput());
      const sessionID = "test-session-compat-1";
      const output = createMessagesOutput(
        "Hello\n\n<<ORCHESTRATION_WORKFLOWS:CTO>>",
        sessionID
      );

      await hooks["experimental.chat.messages.transform"]!({}, output);

      const policy = sessionPolicy.get(sessionID);
      expect(policy).toBeDefined();
      expect(policy!.roles).toContain("CTO");
      // Should NOT have supervisor mode
      expect(policy!.supervisorMode).toBeUndefined();
    });
  });
});

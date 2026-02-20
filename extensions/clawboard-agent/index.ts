import type { OpenClawPluginApi } from "openclaw/plugin-sdk";

interface AgentState {
  status: "thinking" | "idle" | "offline";
  timeoutHandle?: ReturnType<typeof setTimeout>;
}

export default function register(api: OpenClawPluginApi) {
  const config = api.pluginConfig as {
    webhookUrl?: string;
    idleTimeoutMs?: number;
  } | undefined;

  const webhookUrl = config?.webhookUrl;
  const idleTimeoutMs = config?.idleTimeoutMs ?? 30000;
  const logger = api.logger;

  // Per-agent state inside register — not module-level — to avoid leaking
  // across any potential re-registrations.
  const agentStates = new Map<string, AgentState>();

  function getOrCreateState(agentId: string): AgentState {
    let state = agentStates.get(agentId);
    if (!state) {
      state = { status: "idle" };
      agentStates.set(agentId, state);
    }
    return state;
  }

  function clearIdleTimer(agentId: string) {
    const state = agentStates.get(agentId);
    if (state?.timeoutHandle) {
      clearTimeout(state.timeoutHandle);
      state.timeoutHandle = undefined;
    }
  }

  // Send a status webhook to Clawboard.
  // fireAndForget: skip awaiting (use during shutdown to avoid blocking).
  async function sendStatus(
    agentId: string,
    status: "thinking" | "idle" | "offline",
    { fireAndForget = false }: { fireAndForget?: boolean } = {},
  ) {
    if (!webhookUrl) return;

    const event =
      status === "thinking" ? "agent:thinking" :
      status === "idle"     ? "agent:idle"     :
                              "agent:offline";

    const thought =
      status === "thinking" ? "I am thinking..." :
      status === "offline"  ? "Gateway offline"  :
      undefined;

    const doFetch = async () => {
      // 3-second hard timeout — before_agent_start is awaited by OpenClaw before
      // the agent runs, so a hanging fetch here delays every agent response.
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 3000);
      try {
        const res = await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ event, agentId, status, thought, timestamp: new Date().toISOString() }),
          signal: controller.signal,
        });
        if (!res.ok) {
          logger.warn(`[clawboard-agent] webhook ${res.status} for ${agentId}:${status}`);
        }
      } catch (err: unknown) {
        if ((err as { name?: string }).name !== "AbortError") {
          logger.warn(`[clawboard-agent] webhook error for ${agentId}: ${(err as Error).message}`);
        }
      } finally {
        clearTimeout(timer);
      }
    };

    if (fireAndForget) {
      void doFetch();
    } else {
      await doFetch();
    }
  }

  function agentIdFrom(ctx: { agentId?: string }): string {
    return ctx.agentId ?? "default";
  }

  logger.info(`[clawboard-agent] registered · webhookUrl=${webhookUrl ? "(set)" : "(not set)"} · idleTimeoutMs=${idleTimeoutMs}`);

  // Modifying hook — OpenClaw awaits this before the agent runs.
  // Must stay fast: set state, fire webhook with timeout, return.
  api.on("before_agent_start", async (_event, ctx) => {
    const agentId = agentIdFrom(ctx);
    const state = getOrCreateState(agentId);
    clearIdleTimer(agentId);

    if (state.status === "thinking") return; // suppress duplicate on rapid messages

    state.status = "thinking";
    logger.info(`[clawboard-agent] ${agentId} → thinking`);
    await sendStatus(agentId, "thinking");
  });

  // Void hook — start the idle countdown after the agent finishes.
  api.on("agent_end", async (_event, ctx) => {
    const agentId = agentIdFrom(ctx);
    const state = getOrCreateState(agentId);
    clearIdleTimer(agentId);

    state.timeoutHandle = setTimeout(async () => {
      const current = agentStates.get(agentId);
      if (current?.status === "thinking") {
        current.status = "idle";
        current.timeoutHandle = undefined;
        logger.info(`[clawboard-agent] ${agentId} → idle`);
        await sendStatus(agentId, "idle");
      }
    }, idleTimeoutMs);
  });

  // Void hook — a new session is ready; report idle unless agent is mid-run.
  api.on("session_start", async (_event, ctx) => {
    const agentId = agentIdFrom(ctx);
    const state = getOrCreateState(agentId);
    if (state.status !== "thinking") {
      state.status = "idle";
      await sendStatus(agentId, "idle");
    }
  });

  // Void hook — gateway came online.
  api.on("gateway_start", async (_event, _ctx) => {
    if (agentStates.size > 0) {
      for (const [agentId, state] of agentStates) {
        clearIdleTimer(agentId);
        state.status = "idle";
        await sendStatus(agentId, "idle");
      }
    } else {
      // First boot before any agent has run — broadcast to all.
      await sendStatus("*", "idle");
    }
    logger.info("[clawboard-agent] gateway online");
  });

  // Void hook — gateway shutting down. Fire-and-forget: don't hold up shutdown
  // waiting for HTTP responses.
  api.on("gateway_stop", (_event, _ctx) => {
    if (agentStates.size > 0) {
      for (const [agentId, state] of agentStates) {
        clearIdleTimer(agentId);
        state.status = "offline";
        void sendStatus(agentId, "offline", { fireAndForget: true });
      }
    } else {
      void sendStatus("*", "offline", { fireAndForget: true });
    }
    logger.info("[clawboard-agent] gateway offline");
  });
}

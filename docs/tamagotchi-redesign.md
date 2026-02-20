# AgentTamagotchi Redesign

## Current Problems

### 1. `active` status is orphaned

The plugin emits three statuses: `thinking`, `idle`, `offline`. The component declares a fourth — `active` — that nothing ever sets. It has its own emoji, color, energy bar width, and idle-timeout logic. All dead code, but it creates a confusing gap between what the backend produces and what the frontend models.

**Fix:** Remove `active`. Align `AgentStatus` exactly with the plugin output.

---

### 2. Duplicate idle timeout

The plugin has `idleTimeoutMs: 5000` and fires `agent:idle` after `agent_end`. The component also runs a 30-second frontend timer that force-flips the status to idle. These fight each other — the plugin is the authority; the frontend timer is an unreliable approximation that can override real state.

**Fix:** Remove the frontend timer. Trust the plugin.

---

### 3. `fetchStatus` poll is broken

`/api/openclaw/status` returns `{ agents: ['tee', 'fay'] }` — a list of configured agent IDs, not live status. The code checks `data.agents?.includes(agentId)` and sets status `idle` if true. This tells you nothing about whether the agent is actually online. The offline detection is also inverted: if the backend is up but the gateway is down, the fetch succeeds and sets `idle`.

**Fix:** Drop the poll. Initialize as `offline` and let the first WebSocket message or `gateway_start` event tell us the real status. No polling needed — we have a live WebSocket.

---

### 4. `agentId === '*'` wildcard not handled

The plugin sends `agentId: "*"` on `gateway_start` / `gateway_stop` when no per-agent state has been established. The WebSocket handler checks `data.agentId === agentId` — so the wildcard is silently dropped. On fresh gateway boot, the widget never updates.

**Fix:** Treat `*` as a broadcast: if `data.agentId === '*'`, apply the status update regardless of which agent this widget is showing.

---

### 5. `thought` field conflates two different things

Two unrelated concepts share one field:

- **Real agent output** — `"I am thinking..."` sent by the plugin on `agent:thinking`
- **Decorative copy** — random motivational quotes from `AGENT_THOUGHTS[]`

On idle, the random quote overwrites the real output. There is no way to distinguish "agent said this" from "we made this up."

**Fix:** Separate them. `agentThought` holds the last real content from the plugin (preserved across status transitions). A `decorativeQuote` is shown only when there is no real thought to display.

---

### 6. "Energy" bar looks real but is decorative

Energy values (`active: 85%`, `thinking: 60%`, `idle: 30%`) are hardcoded magic numbers. Users will wonder what they measure and whether they can influence it. A fake metric that looks like a real one erodes trust in the real ones.

**Fix:** Remove the energy bar. If we later expose context window usage % or turn count via the API, we can add a meaningful metric at that point.

---

### 7. `console.log` in production

Line 93 of the current implementation logs to the browser console on every idle timeout. Not a crisis, just noise that should not ship.

**Fix:** Remove it.

---

### 8. `AgentPresence.agent` is a dead field

`presence.agent` is set from the `agentId` prop and never changes. It is not referenced in the render. Noise in the state shape.

**Fix:** Remove it. The `agentId` prop is available directly.

---

## Proposed Design

### Status model

```ts
type AgentStatus = 'thinking' | 'idle' | 'offline';
```

Exactly mirrors the plugin. No phantom states.

### State shape

```ts
interface AgentPresence {
  status: AgentStatus;
  lastActivity: string | null;
  agentThought: string | null;   // real content from plugin, null when absent
}
```

`agentThought` is set when the plugin sends a `thought` field (on `agent:thinking`). It is cleared when status transitions to `offline`. On `idle`, if the plugin sends no thought, `agentThought` stays as the last known value (the most recent thing the agent said) until the next run.

### Thought bubble display logic

```
if agentThought → show agentThought
else            → show decorative quote (static, not random-on-render)
```

Decorative quote is chosen once on mount and stays stable. It does not flash on every status change.

### Wildcard handling

```ts
if (data.agentId === agentId || data.agentId === '*') {
  // apply update
}
```

### Initialization

Start as `offline`. No initial fetch. The WebSocket `gateway_start` event brings the widget online when the gateway is ready.

### Connection state surface

Expose the WebSocket `status` from `useWebSocket` and reflect it visually. If `status === 'disconnected'` or `'reconnecting'`, the widget should show a degraded state (e.g., dim the card, show "Connecting..." subtitle) so the user knows whether the data is live or stale.

---

## What We Keep

- `formatLastActivity` — works fine as-is
- `STATUS_CONFIG` — keep emoji + label + color per status, just remove `active` and `blocked`
- `useWebSocket` onMessage handler pattern — correct approach
- Card layout — bg-slate-800, border, compact design is good

---

## Implementation Checklist

- [x] Remove `active` and `blocked` from `AgentStatus`
- [x] Remove `agent` field from `AgentPresence`
- [x] Add `agentThought: string | null` to `AgentPresence`
- [x] Remove `AGENT_THOUGHTS` array and `getRandomThought()`
- [x] Remove frontend idle timeout (`idleTimeoutRef` + `useEffect`)
- [x] Remove `fetchStatus` poll (`useEffect` + `getApiKey` + `getApiBase`)
- [x] Handle `agentId === '*'` in WebSocket message handler
- [x] Clear `agentThought` on `offline` transition
- [x] Remove energy bar
- [x] Add WebSocket connection status indicator
- [x] Remove `console.log`
- [x] Remove `STATUS_CONFIG` entries for `active` and `blocked`

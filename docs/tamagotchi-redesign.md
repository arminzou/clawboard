# AgentTamagotchi Redesign

## Phase 1: Code Cleanup (Completed ✅)

Redesigned the component to align with the plugin's actual output and remove dead code.

### Changes Made

| Item | Detail |
|------|--------|
| Removed `active` / `blocked` statuses | Type now exactly mirrors plugin output: `thinking \| idle \| offline` |
| Removed frontend idle timeout | Plugin owns the `thinking → idle` transition via `idleTimeoutMs` |
| Removed `fetchStatus` poll | `/api/openclaw/status` returns agent list, not live status — useless here |
| Removed dead `presence.agent` field | Prop `agentId` is available directly |
| Split thought into two concepts | `agentThought` (real plugin output) vs `decorativeQuote` (stable, chosen on mount) |
| Handle `agentId: "*"` wildcard | `gateway_start` / `gateway_stop` broadcast to all agents |
| Clear `agentThought` on offline | Preserve on idle (last known output stays visible) |
| Removed energy bar | Decorative and misleading — no real metric behind it |
| Added WebSocket connection indicator | Card dims + shows "Connecting..." / "Reconnecting..." when WS is not live |
| Removed `console.log` | Debug noise |

---

## Phase 2: UX Improvements (Planned)

### Animation & Liveliness

The biggest gap: nothing moves. A static card is just a status badge with a cat emoji.

- **Thinking pulse** — card border or avatar glows/pulses with CSS `animate-pulse` during `thinking`. Instant at-a-glance signal.
- **Thinking spinner ring** — rotating dashed ring around the avatar during `thinking`, disappears on `idle`.
- **Status transition animation** — subtle scale + fade when status changes. Prevents jarring snaps between states.
- **Typewriter effect for thought bubble** — when a new `agentThought` arrives, characters type in one by one rather than snapping to the full string.
- **Idle breathing** — very subtle scale oscillation (1.0 → 1.02 → 1.0) on `idle` to suggest the agent is alive but resting. Stops on `offline`.

**Priority: Thinking pulse first — highest impact, pure CSS, zero data dependencies.**

---

### Information Density

- **Run elapsed timer** — record when `thinking` begins; show live counter: `"Thinking · 0:23"`. Tells you if the agent is stuck or just taking its time.
- **Turn counter** — show how many tool calls/turns the current run has taken (requires plugin to emit it): `"Turn 4"`.
- **Today's session count** — `"3 runs today"` as a tiny stat below the name. Glanceable activity signal.
- **Preserved last thought** — keep the last real `agentThought` visible at `opacity-60` with a `"last run"` label on idle, rather than hiding it behind a decorative quote.

---

### Personality

Tee and Fay are cats with distinct personalities. The widget should feel like it knows them.

- **Agent-specific idle quotes** — replace generic dev quotes with character-appropriate ones:
  - Tee (methodical, nerdy): *"Checking the types first..."*, *"I prefer to read the whole file."*
  - Fay (playful, curious): *"Ooh what does this button do?"*, *"Already three ideas, pick one."*
- **Per-agent color accent** — Tee gets blue/purple (calm), Fay gets amber/orange (warm). Applied to card border or status dot.
- **Distinct avatars** — both currently show 🐱. Give them different poses: Tee = 🐈 (sitting, composed), Fay = 🐈‍⬛ or custom SVG.

---

### Context Awareness

The widget knows status but nothing about *what* the agent is doing — the most useful missing signal.

- **Task link** — when a session is linked to a Clawboard task (Phase 12), show the task title in the card: `"Working on #47 — Fix auth flow"`. Click to jump to the task.
- **Project / branch context** — show the git branch or project name: `"on feature/auth"`.
- **"Working on..." summary** — if the plugin emits the first user message of the session, show it truncated in the card.

---

### Interaction

The card is currently pure display with no affordances.

- **Click to open session** — clicking the card opens the agent's activity feed or linked task.
- **Hover tooltip** — full thought text (untruncated), exact last-activity timestamp, run start time.
- **Ping button** — small icon to send a quick message to the agent without leaving the board. Taps into existing agent-to-agent messaging.

---

### Connection State

- **Reconnecting skeleton** — shimmer on the thought bubble area specifically while WS is disconnected; name/avatar stay fully visible. Clearer than a blanket opacity dim.
- **"Offline since X"** — under the status label when `offline`, show when the gateway went down rather than just "Last: Xm ago".

---

### Layout

- **Horizontal compact mode** — single-row render for narrow sidebars: `🐱 Tee · Thinking · "Just finished a feature"`.
- **Unified team panel** — when both Fay and Tee are visible, a cohesive two-agent layout rather than two independent cards floating next to each other.

---

## Implementation Priority

| Priority | Item | Effort | Dependencies |
|----------|------|--------|--------------|
| 1 | Thinking pulse animation | Low | None |
| 2 | Run elapsed timer | Low | None |
| 3 | Agent-specific colors + idle quotes | Low | None |
| 4 | Typewriter effect for thought bubble | Medium | None |
| 5 | Distinct avatars per agent | Low | None |
| 6 | Click to open session / task | Medium | Phase 12 task linking |
| 7 | Turn counter | Medium | Plugin emit support |
| 8 | Horizontal compact mode | Medium | None |
| 9 | Ping button | High | Agent messaging API |

---

## Phase 3: Arcade Pet Direction (v1 Spec)

Chosen direction:
- Visual style: **arcade pet**
- Product emphasis: **personality-first**
- Primary click action: open **Activity Feed** (agent-filtered when available)

### Visual System

- Strong per-agent identity via avatar + scene first, text second.
- Personality mix target:
  - 70% avatar + background scene
  - 20% motion behavior
  - 10% quotes/copy
- Agent themes:
  - Tee: cool blue/cyan palette, calmer motion
  - Fay: warm amber/orange palette, more playful motion

### Card Structure

- Top lane: avatar capsule + name + status chip.
- Mid lane: thought bubble (real thought first, decorative quote fallback).
- Bottom lane: compact telemetry (elapsed time, last activity).
- Offline card keeps identity visible, but desaturates scene and pauses decorative motion.

### Motion Language

- Thinking:
  - energetic spark particles/ring around avatar
  - status chip flicker/pulse (small amplitude)
- Idle:
  - low-amplitude breathing
  - slow ambient backdrop drift
- Offline:
  - subtle moon/sleep icon accent, no active pulse

### Global Presence Requirement

- Tamagotchi panel must be visible across **all primary pages**:
  - Kanban
  - Activity
  - Docs
- Placement rule:
  - Desktop: persistent right-side "Agent Arcade" panel
  - Mobile: compact sticky bottom dock, expandable into a bottom sheet
- Keep one shared component to avoid diverging behavior across routes.

### Interaction Rules

- Card click opens Activity Feed scoped to that agent.
- Task deep-link remains a secondary affordance for later Phase 12 linkage.
- Quotes are only shown when idle and no real thought is present.

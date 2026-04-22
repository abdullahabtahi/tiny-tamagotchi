# Feature Plan — Dynamic States

## Roadmap Item
Satisfies roadmap item **3. Dynamic States** (`/dynamic-states/`)

## Overview
The pet transitions between three states — Normal, Sick, and Evolved — based on stat thresholds. Each state has distinct visual representation. A pre-Sick attention pulse warns the player at < 30. Stat decay pauses in Evolved state.

## Dependencies
- **Living Vitals** (required): provides the tick loop and stat values that drive state transitions.
- **Care Loop** (required): actions that replenish stats are the mechanism for Sick → Normal recovery.

## State Machine

```
         any stat < 30           any stat < 20
Normal ──────────────> [pulse] ──────────────> Sick
  ^                                              │
  │    all stats ≥ 50 (via Feed/Play/Rest)       │
  └──────────────────────────────────────────────┘

         all stats > 80 for 18 consecutive ticks
Normal ──────────────────────────────────────> Evolved
```

States are mutually exclusive. Only one state is active at a time.

## Implementation Steps

### Task Group 1 — State Transition Pure Functions

```js
// evaluateState(state, TICK_INTERVAL_MS) → updated state
// Called after every tick and every action.

function evaluateState(state, TICK_INTERVAL_MS) {
  const { hunger, happiness, energy } = state;
  const now = Date.now();

  // Evolved → stays evolved (decay paused, no transitions out in MVP)
  if (state.state === 'evolved') return state;

  // Sick check: any stat < 20
  const isSick = hunger < 20 || happiness < 20 || energy < 20;

  // Recovery check: all stats ≥ 50 (only relevant if currently sick)
  const isRecovered = hunger >= 50 && happiness >= 50 && energy >= 50;

  if (state.state === 'sick') {
    if (isRecovered) {
      return { ...state, state: 'normal', sickAt: null };
    }
    return state; // stays sick
  }

  // Normal → Sick
  if (isSick) {
    return { ...state, state: 'sick', sickAt: state.sickAt ?? now, evolvedAt: null };
  }

  // Normal → check evolution window
  const allHigh = hunger > 80 && happiness > 80 && energy > 80;

  if (!allHigh) {
    // Reset evolution timer if any stat dropped below 80
    return state.evolvedAt !== null ? { ...state, evolvedAt: null } : state;
  }

  // All stats > 80
  const evolvedAt = state.evolvedAt ?? now;
  if (now - evolvedAt >= 18 * TICK_INTERVAL_MS) {
    return {
      ...state,
      state: 'evolved',
      evolvedAt,
      recoveredFromSick: state.recoveredFromSick || (state.sickAt !== null),
    };
  }

  return { ...state, evolvedAt };
}
```

### Task Group 2 — Attention Pulse
`evaluateState` does not manage the pulse — it is a pure visual layer:
- In the render: when any stat < 30 AND `state !== "sick"` AND `state !== "evolved"`, apply `className="pet--pulse"` CSS animation to the pet sprite.
- The pulse is a CSS `@keyframes` that loops while the condition is true.

### Task Group 3 — Visual State Indicators
Each state renders a distinct visual:
- **Normal**: default pet sprite (idle animation).
- **Sick** (any stat < 20): sick sprite variant (or grayscale filter + 🤒 indicator).
- **Pulse warning** (any stat < 30, not yet sick): CSS shake/glow on the normal sprite.
- **Evolved**: alternate evolved sprite + sparkle CSS effect.

### Task Group 4 — Integration with Tick Loop
`evaluateState` is called:
1. After every tick (in the `setInterval` callback, after decay is applied).
2. After every Care Loop action (in each action handler, after stat update).

## Design Decisions
- **Evolved state has no exit in MVP**: Once evolved, the pet stays evolved. Decay is paused. This is intentional — evolution is the reward state.
- **`recoveredFromSick` is set at evolution time**: If the pet was ever sick (`sickAt !== null`) and then evolves, `recoveredFromSick = true`. This enables the Personality Easter egg.
- **Pulse is render-only**: The pulse animation is not a state value — it is computed from stat values in render. No `isPulsing` field in state.
- **`evaluateState` is a pure function**: Takes state in, returns new state. No side effects. Fully unit-testable.

# Feature Plan — Living Vitals

## Roadmap Item
Satisfies roadmap item **1. Living Vitals** (`/living-vitals/`)

## Overview
Auto-decreasing Hunger, Happiness, and Energy meters that tick on a fixed interval, persist to localStorage, and apply elapsed-time catch-up when the tab reopens.

## Dependencies
None — this is the foundational feature. All other features depend on it.

## Implementation Steps

### Task Group 1 — State Initialization
1. Define `TICK_INTERVAL_MS = 30_000` constant (override to `1_000` for testing).
2. Define initial state factory:
   - `hunger: 80`, `happiness: 80`, `energy: 80`
   - `state: "normal"`, `evolvedAt: null`, `sickAt: null`
   - `lastSavedAt: Date.now()`, `recoveredFromSick: false`, `lastInteractedAt: Date.now()`
3. On app mount: read `tamagotchi_state` from localStorage.
   - If no saved state → use initial state factory + show naming screen.
   - If saved state exists → run catch-up algorithm (Task Group 2), then load.

### Task Group 2 — Elapsed-Time Catch-Up
On mount, before starting the tick interval:
1. Read `lastSavedAt` from loaded state.
2. `elapsed = Date.now() - lastSavedAt`
3. `missedTicks = Math.floor(elapsed / TICK_INTERVAL_MS)`
4. Apply `missedTicks` rounds of decay in a loop, clamping stats to [0, 100] after each round.
5. Skip decay rounds if `state === "evolved"`.
6. After catch-up, evaluate state transitions (delegate to dynamic-states logic).

### Task Group 3 — Tick Interval
1. Start `setInterval` with `TICK_INTERVAL_MS` after catch-up completes.
2. Each tick:
   - If `state === "evolved"`: skip decay.
   - Else: apply one round of decay (Hunger −3, Happiness −2, Energy −1), clamp to [0, 100].
3. On component unmount: clear the interval.

### Task Group 4 — Persistence
1. `useEffect` that watches the full state object.
2. On every state change: write the updated state (with `lastSavedAt: Date.now()`) to `localStorage.setItem("tamagotchi_state", JSON.stringify(state))`.

### Task Group 5 — Stat Bar UI
1. Render three stat bars (Hunger, Happiness, Energy) with numeric labels.
2. Bar fill corresponds to current stat value (width = `${value}%`).
3. Bars update reactively when state changes.

## Design Decisions
- **Catch-up runs before interval starts**: Prevents a tick firing immediately on mount before catch-up applies.
- **Clamp at each catch-up step, not once at end**: Matches production tick behavior exactly.
- **`lastSavedAt` updated on every write**: Ensures catch-up is always based on the most recent save, not the original session start.
- **Evolved state pauses decay**: A reward for good caretaking — the pet stays in its best state.

# Feature Plan — Personality

## Roadmap Item
Satisfies roadmap item **4. Personality** (`/personality/`)

## Overview
Pet naming on first visit, stat-driven idle animations, food refusal behavior, a poop mechanic, and a "Resilient" Easter egg. All retro pixel art styled.

## Dependencies
- **Living Vitals**: `lastInteractedAt` and `lastSavedAt` are used by the poop timer.
- **Care Loop**: Play action clears poop and grants +3 Happiness.
- **Dynamic States**: `state`, `evolvedAt`, and `recoveredFromSick` drive the Easter egg condition.

## Implementation Steps

### Task Group 1 — Naming Screen
1. On app mount: check localStorage for `tamagotchi_state`.
2. If no saved state (or saved state has empty/null `name`): render the **Naming Screen**.
   - Input field for pet name (1–12 characters, trimmed).
   - Confirm button disabled while input is empty or whitespace-only.
   - On confirm: create initial state with the provided name, save to localStorage, show Pet screen.
3. If saved state with valid name: skip naming screen, go directly to Pet screen.

### Task Group 2 — Idle Animation States
The pet sprite has 3 animation tiers, evaluated every render from current stat values:

| Tier | Condition | CSS Class | Visual |
|---|---|---|---|
| Happy | All stats ≥ 60 | `pet--happy` | Bouncing idle loop |
| Neutral | Any stat 30–59 | `pet--neutral` | Gentle sway |
| Droopy | Any stat < 30 | `pet--droopy` | Slow drooping loop |

Priority: Droopy > Neutral > Happy (lowest stat wins).

### Task Group 3 — Food Refusal
When Feed is clicked AND `hunger > 80`:
- With **30% probability**: the action is cancelled. The pet sprite plays a shake animation (`pet--refuse` class for ~500ms). Hunger does not change. `lastInteractedAt` still updates.
- With **70% probability**: the action executes normally (hunger + 20, clamped).

Implementation:
```js
function feedWithRefusal(state) {
  if (state.hunger > 80 && Math.random() < 0.30) {
    return { ...state, lastInteractedAt: Date.now(), refusing: true };
  }
  return { ...feed(state), refusing: false };
}
```
The `refusing` field is transient — reset to `false` after the animation completes (500ms timeout clears it).

### Task Group 4 — Poop Mechanic
1. Compute `timeSinceInteraction = Date.now() - state.lastInteractedAt` on every render.
2. If `timeSinceInteraction >= 300_000` (300 seconds = 5 minutes): render the poop emoji indicator 💩 near the pet.
3. When the Play button is clicked while poop is showing:
   - Clear poop: the poop indicator disappears.
   - Apply standard Play action (happiness + 15) **plus** a +3 bonus (happiness + 18 total, capped at 100).
   - Update `lastInteractedAt`.
4. Poop clears on any interaction after the Play — but the +3 bonus only applies when Play specifically clears it.

> Note: The poop indicator is computed from `lastInteractedAt` — it is not stored in state. This avoids a separate `hasPooped` flag.

### Task Group 5 — Easter Egg: "Resilient" Badge
On transition to `state === "evolved"` (evaluated in Dynamic States):
- If `recoveredFromSick === true`: render the **alternate evolved sprite** and a `"Resilient"` badge overlay.
- If `recoveredFromSick === false`: render the standard evolved sprite.

The Easter egg is discoverable by getting the pet Sick, recovering it, then evolving it. No tooltip or hint is given — it is a surprise reward.

### Task Group 6 — Visual Style
- Apply `image-rendering: pixelated` to all pet sprites.
- Use a monospace or 8-bit-style web font (e.g., `Press Start 2P` from Google Fonts or a CSS monospace fallback).
- Retro border/shadow styles on stat bars and buttons.

## Design Decisions
- **Food refusal is probabilistic, not deterministic**: 30% makes it feel organic, not punishing.
- **Poop is computed, not stored**: Avoids state drift if `lastInteractedAt` is updated by non-care events.
- **Naming is enforced at state level, not routing level**: A single boolean flag (`hasName = !!state.name`) governs which screen renders.
- **`refusing` is transient UI state**: Not persisted to localStorage — it is reset on every render cycle.
- **Speech bubble uses a single shared component**: `SpeechBubble` renders null when `message` is null, so no conditional rendering is needed at the call site. A `msgTimerRef` prevents stale timeout closures.
- **Idle chatter uses `idleActionRef` pattern**: The ref is updated every render so the recursive `setTimeout` always calls the current closure — avoids stale state in long-running timers.
- **Poke animation is exclusive**: `pet--tap` replaces all other animation classes for 400ms. Normal idle classes resume automatically via React state reconciliation after the timeout clears `tapping`.
- **Streak counter is not a loss mechanic**: Resetting to 0 is silent — no badge, no warning. The counter only appears as a positive reward when > 0.

### Task Group 7 — Speech Bubble Reactions (R10–R12)
1. Define `MESSAGES` constant in `App.jsx`: keyed by action (`feed`, `play`, `poop`, `rest`, `refuse`, `sick`, `evolved`), each value is a string array.
2. Implement `pickMessage(key)` — returns a random element from the pool.
3. Implement `showMessage(key)` in `PetScreen`: clears any pending `msgTimerRef`, sets `message` state, schedules a 2000ms clear.
4. Wire `showMessage` into every action handler and into the `useEffect` that watches `state.state`.
5. Render `<SpeechBubble message={message} />` — returns `null` when message is null; carries `role="status"` and `aria-live="polite"`.
6. Add `.bubble` CSS: pixel border + `box-shadow`, downward `::after` tail, `bubble-in` keyframe (fade + slide in 150ms).

### Task Group 8 — Clickable Pet (R13)
1. Add `tapping` boolean state and a `handlePetClick` handler to `PetScreen`.
2. `handlePetClick`: calls `playClip('poke')`, calls `showMessage('poke')`, sets `tapping = true`, schedules `setTimeout(() => setTapping(false), 400)`.
3. When `tapping` is true, pet element gets only `['pet', 'pet--tap']` — all other classes are omitted.
4. Pet element gains `role="button"`, `tabIndex={0}`, `onKeyDown` handler (Enter/Space triggers `handlePetClick`).
5. Add `poke` clip to `audio.js` CLIPS: single C6 square oscillator, 50ms duration.
6. Add `pet--tap` keyframe to CSS: `scale(1) → scale(1.30) rotate(-6deg) → scale(0.88) rotate(5deg) → scale(1.10) rotate(-2deg) → scale(1)`, 400ms ease-out.

### Task Group 9 — Idle Chatter (R14)
1. Define idle message pools in `MESSAGES` constant: `idle_hungry`, `idle_unhappy`, `idle_tired`, `idle_thriving`, `idle_sick`, `idle_evolved`, `idle_normal`.
2. Implement `getIdleMessageKey(petState)` — pure function applying priority rules (sick > evolved > lowest-stat-<50 > thriving > normal).
3. In `PetScreen`, create `idleActionRef` — ref updated every render to hold `() => showMessage(getIdleMessageKey(state))`.
4. In a mount-only `useEffect`, run a recursive `schedule()` function:
   ```js
   function schedule() {
     timerId = setTimeout(() => {
       idleActionRef.current?.();
       schedule();
     }, 20_000 + Math.random() * 20_000);
   }
   schedule();
   return () => clearTimeout(timerId);
   ```
5. No new petLogic exports required — idle chatter is pure UI-layer behaviour.

### Task Group 10 — Care Streak Counter (R15)
1. Add `STORAGE_KEY_STREAK = 'tamagotchi_streak'` to `petLogic.js` constants.
2. Implement `computeStreak(current, petState)` in `App.jsx` (UI-layer, not petLogic — depends on `Date`):
   - Derives `today` as `new Date().toISOString().slice(0, 10)`.
   - Short-circuits if `current.lastDay === today`.
   - Evaluates pet health: all stats ≥ 50 AND `state !== 'sick'`.
   - Returns new `{ count, lastDay }` object (immutable).
3. Add `streak` state to `App` component, initialised from `loadStreak()` + `computeStreak()` on mount.
4. In the `useEffect` that calls `saveState(state)`, also call `setStreak(s => { const next = computeStreak(s, state); saveStreak(next); return next; })`.
5. Pass `streak` prop to `PetScreen`; render `<span className="streak">🔥{streak.count}</span>` in the header when `streak.count > 0`.

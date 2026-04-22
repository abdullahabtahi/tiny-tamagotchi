# Feature Plan — Care Loop

## Roadmap Item
Satisfies roadmap item **2. Care Loop** (`/care-loop/`)

## Overview
Three action buttons — Feed, Play, Rest — that increase the corresponding stat when clicked, provide immediate visual feedback, update `lastInteractedAt`, and persist state to localStorage.

## Dependencies
- **Living Vitals** (required): Care Loop reads and writes the same state object that Living Vitals owns. The stat values, clamping logic, and localStorage persistence are all established by Living Vitals.

## Implementation Steps

### Task Group 1 — Action Functions
Define three pure functions (stat mutators):

```js
feed(state)  → { ...state, hunger: clamp(state.hunger + 20, 0, 100), lastInteractedAt: Date.now() }
play(state)  → { ...state, happiness: clamp(state.happiness + 15, 0, 100), lastInteractedAt: Date.now() }
rest(state)  → { ...state, energy: clamp(state.energy + 25, 0, 100), lastInteractedAt: Date.now() }
```

Each function:
- Returns a new state object (immutable — does not mutate input).
- Clamps the affected stat to [0, 100].
- Updates `lastInteractedAt` to `Date.now()`.
- Affects exactly one stat. No secondary stat changes.

### Task Group 2 — Button Components
1. Render three buttons: "Feed 🍖", "Play 🎮", "Rest 💤" (or equivalent pixel-art labels).
2. On click: call the corresponding action function, update React state.
3. Button enters a brief `active` CSS class on click (visual feedback: scale-down or color flash for ~200ms).
4. Buttons are always enabled (no disabled state in MVP).

### Task Group 3 — Persistence Hook-In
The action functions update React state; the existing Living Vitals `useEffect` writes the updated state to localStorage automatically. No additional persistence code needed in Care Loop.

## Design Decisions
- **Exactly one stat per action**: Feed → Hunger only. Play → Happiness only. Rest → Energy only. No cross-stat bonuses in the base care loop (poop clearing in Personality adds +3 Happiness as a special case).
- **No cooldown on buttons**: Rapid clicking is allowed and handled by clamping. A stat at 100 stays at 100 regardless of how many times Feed is clicked.
- **lastInteractedAt updated on every action**: This drives the poop timer in the Personality feature.
- **Pure action functions**: Makes unit testing trivial and prevents hidden state mutations.

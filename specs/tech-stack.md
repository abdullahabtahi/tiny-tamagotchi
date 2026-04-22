# Tech Stack

## Frontend Framework

**React 18 + Vite**

- React handles component state and reactive UI updates.
- Vite provides a zero-config dev server and fast production build.
- Single-Page Application (SPA) — one HTML entry point, no routing needed.

## State Management

React `useState` and `useEffect` hooks only. No external state library (Redux, Zustand, etc.).

- All pet state lives in a top-level `App` component and is passed down via props.
- Each action (Feed, Play, Rest) affects exactly one stat. There are no secondary stat side effects.
- State shape:

```js
{
  name: string,              // pet name set on first visit
  hunger: number,            // 0–100
  happiness: number,         // 0–100
  energy: number,            // 0–100
  state: "normal" | "sick" | "evolved",
  evolvedAt: number | null,  // timestamp when all stats first crossed 80 (ms)
  sickAt: number | null,     // timestamp when any stat first dropped below 20 (ms)
  lastSavedAt: number,       // Date.now() written on every save — enables catch-up
  recoveredFromSick: boolean,// true if pet evolved after recovering from Sick state
  lastInteractedAt: number   // timestamp of last user action — drives poop timer
}
```

## Persistence Strategy

**localStorage** — synchronous read/write on every state change via a `useEffect`.

- Key: `tamagotchi_state`
- Key: `tamagotchi_muted` — boolean, default `true` (muted on first visit).
- Key: `tamagotchi_streak` — `{ count: number, lastDay: 'YYYY-MM-DD' }` — care-streak counter.
- On app load: read from localStorage; if empty, show the naming screen.
- On every state update: write the full state object to localStorage.
- No server, no database, no cookies.

## Data Flow — Stat Tick

A `useEffect` runs a `setInterval` that fires **every 30 seconds** in production
(configurable via `TICK_INTERVAL_MS` constant for testing).

`TICK_INTERVAL_MS` defaults to `30_000` (30 seconds). Set to `1_000` during testing to simulate 1 tick per second. The 30-second cadence is deliberate — the app is designed as a calm background-tab companion, not a constant-attention pet.

Each tick decreases stats by:

| Stat | Decrease per tick |
|---|---|
| Hunger | −3 points |
| Happiness | −2 points |
| Energy | −1 point |

Stats are clamped to `[0, 100]` after every mutation. Stats never go below 0 or above 100.

Stat decay is **paused** when `state === "evolved"`.

### Evolution Timer Reset Rule

On each tick, if `evolvedAt` is not null and any stat drops below 80, `evolvedAt` is reset to null — the consecutive-tick window restarts. Evolution triggers when `evolvedAt` is not null and `Date.now() - evolvedAt >= 18 * TICK_INTERVAL_MS`.

### Elapsed-Time Catch-Up on Load

On app mount, before starting the tick interval:

1. Read `lastSavedAt` from localStorage.
2. Calculate `elapsed = Date.now() - lastSavedAt`.
3. Calculate `missedTicks = Math.floor(elapsed / TICK_INTERVAL_MS)`.
4. Apply `missedTicks` rounds of decay (clamped at each step).
5. Evaluate state transitions on the catch-up result.

This ensures the pet degrades while the tab is closed — the core Tamagotchi premise.

### Attention Pulse

When any stat drops below **30**, the pet sprite enters a **pulse animation** (soft box-shadow glow — see CSS Animation Spec). This is a warning state — the pet is not yet Sick. Sick triggers separately when any stat drops below **20**, giving the player a meaningful urgency window between the warning (< 30) and the state transition (< 20). The pulse is a silent, visual-only warning consistent with the calm-companion aesthetic — it does not trigger an audio cue.

## Audio Stack

**Web Audio API synthesiser** — no audio asset files, no 404 risk, no preload required.

All sounds are generated at runtime using the browser's built-in `AudioContext`. The context is created **lazily on the first `playClip()` call** (i.e. after a user gesture), satisfying Chrome's autoplay policy without any workaround.

**Why Web Audio API instead of HTMLAudioElement:**
The original spec called for OGG files. During implementation it was found that (a) asset files don't exist, (b) the browser autoplay policy blocks HTMLAudioElement before a user gesture, and (c) synthesised tones are zero-dependency and instantly portable. The Web Audio API approach produces identical or better results for retro blip sounds.

**Oscillator type:** `square` — classic 8-bit / GameBoy timbre.

**Gain envelope:** 5 ms linear attack + 10 ms release on each note to eliminate click artifacts from abrupt gain transitions.

**Master volume:** 0.18 per note oscillator. No sound is ever louder than ~18% of browser volume.

**Clip inventory:**

| Event | Notes (Hz sequence) | Feel |
|---|---|---|
| Feed | C5 → E5 | happy ascending blip |
| Play | C5 → E5 → G5 | cheerful arpeggio |
| Rest | G4 → E4 → C4 | descending lullaby |
| Refuse | B4 → Bb4 | dissonant buzz |
| Evolve | C5 → E5 → G5 → C6 | mini fanfare |
| Poke | C6 | single high blip |

**Events that intentionally have NO audio:**
- Sick state transition (visual greyscale is sufficient; a sound would startle)
- Attention pulse (silent warning by design)
- Every stat decay tick (would become noise in a background tab)
- Poop indicator appearance (subtle visual cue only)
- Idle chatter (ambient text only — audio would be intrusive in a background tab)

**Mute toggle:**
- Persisted in `localStorage` under key `tamagotchi_muted` (boolean).
- **Default on first visit: `true` (muted).** Never startle a user who just opened the page. The player opts in to audio.
- UI control: icon button in the header (`🔇` muted / `🔈` unmuted).
- When muted, `playClip()` calls are no-ops (guarded behind the mute flag).

**Accessibility:**
- Every audio event has a simultaneous visual cue (stat bar update, sprite animation, badge change, speech bubble).
- No game state is communicated by audio alone.
- `prefers-reduced-motion` does not force-mute audio — these are independent user preferences.

## SPA vs. MPA

**SPA.** No routing library. The app has two screens managed by a boolean flag:
- **Naming screen** — shown when `localStorage` has no saved name.
- **Pet screen** — the main care loop UI.

## Design Tokens

All visual values are defined as CSS custom properties on `:root`. No magic numbers in component CSS.

```css
:root {
  --color-bg:      #0d0d1a; /* app background — deep midnight navy */
  --color-surface: #1a1a2e; /* card/screen surface */
  --color-accent:  #e0a82e; /* buttons, borders, evolved glow — warm amber */
  --color-danger:  #e05c5c; /* sick state, danger-range stat bars */
  --color-text:    #f0e6d3; /* all text — warm off-white */

  --font-main: 'Press Start 2P', monospace; /* loaded from Google Fonts */

  --container-max-width: 375px;
}
```

Font sizes: 16px (title/pet name), 8px (body, labels, buttons, stat values). Line-height: 2 (required for Press Start 2P legibility).

Stat bar fill color is determined by current stat value — not a fixed token. This 3-band system is the single source of truth; the segmented heart bar (see `living-vitals/requirements.md` R8) uses the same thresholds for heart color.

| Value range | Bar / heart color | Class | Meaning |
|---|---|---|---|
| 60–100 | `#4caf50` | `heart--healthy` | Healthy |
| 30–59 | `#e0a82e` (matches `--color-accent`) | `heart--warning` | Caution |
| 0–29 | `#e05c5c` (matches `--color-danger`) | `heart--critical` | Danger |

Heart opacity transitions when a heart fills/empties: `transition: opacity 0.4s ease`.

### Ambient Background

The app body uses a slow-shifting gradient to reinforce the calm-companion aesthetic:

```css
body {
  background: linear-gradient(135deg, var(--color-bg), var(--color-surface), var(--color-bg));
  background-size: 400% 400%;
  animation: ambientShift 300s ease-in-out infinite;
}
```

`ambientShift` keyframe: `background-position: 0% 50% → 100% 50% → 0% 50%`. The 300s (5-minute) cycle is slow enough to feel like ambient environment, not animation. Disabled under `prefers-reduced-motion`.

## CSS Animation Spec

All pet sprite CSS classes and their keyframe contracts. Implementations must match these specs exactly.

| Class | Trigger | Keyframe | Duration | Iteration |
|---|---|---|---|---|
| `.pet--breathing` | Always (base layer on sprite) | `scale(1 → 1.02 → 1)` | 3.0s | infinite |
| `.pet--happy` | All stats ≥ 60 | `translateY(0 → -4px → 0)` | 1.6s | infinite |
| `.pet--neutral` | Any stat 30–59 | `rotate(-2deg → 2deg → -2deg)` | 1.8s | infinite |
| `.pet--droopy` | Any stat < 30 | `translateY(0 → 3px → 0)` | 2.4s | infinite |
| `.pet--pulse` | Any stat < 30, state normal | `box-shadow: 0 0 4px var(--color-danger) → 0 0 12px var(--color-danger) → 0 0 4px var(--color-danger)` | 2.0s | infinite |
| `.pet--sick` | `state === "sick"` | `filter: grayscale(80%) sepia(20%)` | static class | — |
| `.pet--evolved` | `state === "evolved"` | `rotate(-1deg → 1deg → -1deg)` + `filter: drop-shadow(0 0 8px var(--color-accent))` | 1.2s | infinite |
| `.pet--refuse` | Feed refused | `translateX(-4px → 4px → -4px → 0)` | 0.5s | 1 (then class removed) |
| `.egg--intact` | Name length 0–3 | static | — | — |
| `.egg--cracked` | Name length 4–8 | static | — | — |
| `.egg--hatching` | Name length 9–12 | `scale(1 → 1.04 → 1)` | 0.8s | infinite |
| `.egg--burst` | HATCH submit | `scale(1 → 1.3) + opacity(1 → 0)` | 0.6s | 1 |
| `body` ambient | Always | `background-position 0% 50% → 100% 50% → 0% 50%` | 300s | infinite |

**Layering rules:** `.pet--breathing` is always applied to the sprite container. Exactly one of `{.pet--happy, .pet--neutral, .pet--droopy}` is also applied based on stats. `.pet--pulse` may layer on top when stats drop below 30. `.pet--sick` and `.pet--evolved` replace the idle tier — they do not stack with happy/neutral/droopy.

`prefers-reduced-motion`: all `animation: none !important` (including ambient background). Static class differences (sprite text, badge text, greyscale filter) remain as the sole visual distinguishers.

## Smoke Tests

Manual smoke tests to run before submitting:

1. Open app in fresh browser tab (no localStorage) → naming screen appears, app is muted by default.
2. Enter a name and confirm → pet screen appears with all three stats at 80.
3. Wait 30 seconds → at least one stat decreases.
4. Click Feed → Hunger increases by 20, capped at 100. If unmuted, feed sound plays at gain ≤ 0.3.
5. Click Play → Happiness increases by 15, capped at 100. If unmuted, play sound plays at gain ≤ 0.3.
6. Click Rest → Energy increases by 25, capped at 100. If unmuted, rest sound plays at gain ≤ 0.3.
7. Force `hunger = 15` in DevTools → pet transitions to Sick state (greyscale). No sound plays on the transition.
8. Use Feed, Play, and Rest until all three stats are ≥ 50 → pet transitions back to Normal.
9. Set `TICK_INTERVAL_MS = 1000` in the source constant. Force all stats to 85. Wait 18 seconds → pet transitions to Evolved state; if unmuted, evolve chime plays once.
10. Refresh page → pet name, stats, and mute preference restored from localStorage.

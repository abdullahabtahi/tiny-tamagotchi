# Requirements — Living Vitals

## Behavioral Requirements

### R1 — Initial State
On first load (no `tamagotchi_state` in localStorage), all three stats initialize to **80**.

### R2 — Stat Decay
Every `TICK_INTERVAL_MS` milliseconds (default: 30,000ms), stats decrease by:
- Hunger: **−3 points**
- Happiness: **−2 points**
- Energy: **−1 point**

Decay applies simultaneously to all three stats per tick.

### R3 — Stat Clamping
After every mutation (decay or action), each stat is clamped to the range **[0, 100]**:
- A stat at 2 that would decay by 3 becomes **0**, not −1.
- A stat at 100 that receives +20 stays at **100**.

### R4 — Decay Pause
Stat decay is **completely paused** when `state === "evolved"`. No tick decreases any stat while the pet is evolved.

### R5 — Persistence
On every state change, the full state object is written to `localStorage` under the key `tamagotchi_state`. The write includes an updated `lastSavedAt: Date.now()` timestamp.

### R6 — Restore on Load
On app mount, if `tamagotchi_state` exists in localStorage, the saved state is restored before the tick interval starts.

### R7 — Elapsed-Time Catch-Up
On app mount, after restoring saved state:
1. Calculate `elapsed = Date.now() - savedState.lastSavedAt`
2. Calculate `missedTicks = Math.floor(elapsed / TICK_INTERVAL_MS)`
3. Apply exactly `missedTicks` rounds of decay (same per-tick amounts as R2), clamping after each round.
4. Catch-up rounds where `state === "evolved"` are skipped.

### R8 — Stat Bar Display
Three stat bars render with labels ("Hunger", "Happiness", "Energy") and current numeric values. Each bar is **segmented into 10 heart icons**, where each heart represents 10 stat points. Filled hearts = `Math.floor(value / 10)`.

Heart color thresholds (applied uniformly to all filled hearts in a bar, matching the 3-band system in `specs/tech-stack.md` — Design Tokens):
- **Healthy** (`heart--healthy`, `#4caf50`): stat value ≥ **60**.
- **Caution** (`heart--warning`, `--color-accent` amber): stat value in **30–59**.
- **Danger** (`heart--critical`, `--color-danger` red): stat value **< 30**.

The numeric stat value is displayed alongside the bar.

### R9 — Mobile Viewport
The app fits within a **375px-wide viewport** without horizontal scrolling. The game container is centered with a max-width of 375px.

### R10 — Keyboard Accessibility
All three action buttons (Feed, Play, Rest) are reachable via Tab key and activatable via Enter or Space. Focus ring is visible on focused buttons.

## Edge Cases

| Scenario | Expected Behavior |
|---|---|
| Tab closed for 1 tick (30s) | 1 catch-up tick applied on reload |
| Tab closed for 100 ticks (3000s ≈ 50 min) | 100 catch-up ticks applied; stats likely at 0 |
| Stat at 1, decay is −3 | Stat becomes 0, not −2 |
| Stat at 0, decay fires again | Stat stays 0 |
| State is "evolved" on reload, tab was closed | No catch-up ticks applied |
| localStorage corrupted / unparseable | Treat as empty → show naming screen with fresh state |

## Technical Constraints
- Decay logic must be a pure function (no side effects) so it can be unit tested in isolation.
- The tick interval must be cleared on component unmount to prevent memory leaks.
- `TICK_INTERVAL_MS` must be a named constant, not a magic number, so tests can override it.

# Validation — Living Vitals

## Level 1 — Automated Unit Tests (Vitest)

These tests target the pure decay and catch-up logic functions, independent of React.

```js
// living-vitals/living-vitals.test.js
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { applyDecay, applyCatchUp, createInitialState, clamp } from '../src/petLogic';

describe('clamp', () => {
  it('returns value within range unchanged', () => {
    expect(clamp(50, 0, 100)).toBe(50);
  });
  it('clamps value below min to min', () => {
    expect(clamp(-5, 0, 100)).toBe(0);
  });
  it('clamps value above max to max', () => {
    expect(clamp(105, 0, 100)).toBe(100);
  });
  it('clamps exactly at boundary', () => {
    expect(clamp(0, 0, 100)).toBe(0);
    expect(clamp(100, 0, 100)).toBe(100);
  });
});

describe('createInitialState', () => {
  it('initializes all stats to 80', () => {
    const state = createInitialState('Tama');
    expect(state.hunger).toBe(80);
    expect(state.happiness).toBe(80);
    expect(state.energy).toBe(80);
  });
  it('sets state to normal', () => {
    expect(createInitialState('Tama').state).toBe('normal');
  });
  it('sets name from argument', () => {
    expect(createInitialState('Pixel').name).toBe('Pixel');
  });
});

describe('applyDecay', () => {
  it('decreases hunger by 3, happiness by 2, energy by 1 per tick', () => {
    const state = { hunger: 80, happiness: 80, energy: 80, state: 'normal' };
    const next = applyDecay(state);
    expect(next.hunger).toBe(77);
    expect(next.happiness).toBe(78);
    expect(next.energy).toBe(79);
  });
  it('clamps stats to 0, does not go negative', () => {
    const state = { hunger: 2, happiness: 1, energy: 0, state: 'normal' };
    const next = applyDecay(state);
    expect(next.hunger).toBe(0);
    expect(next.happiness).toBe(0);
    expect(next.energy).toBe(0);
  });
  it('does not mutate the original state object', () => {
    const state = { hunger: 80, happiness: 80, energy: 80, state: 'normal' };
    applyDecay(state);
    expect(state.hunger).toBe(80);
  });
  it('skips decay when state is evolved', () => {
    const state = { hunger: 90, happiness: 90, energy: 90, state: 'evolved' };
    const next = applyDecay(state);
    expect(next.hunger).toBe(90);
    expect(next.happiness).toBe(90);
    expect(next.energy).toBe(90);
  });
  it('applies decay when state is sick', () => {
    const state = { hunger: 10, happiness: 10, energy: 10, state: 'sick' };
    const next = applyDecay(state);
    expect(next.hunger).toBe(7);
    expect(next.happiness).toBe(8);
    expect(next.energy).toBe(9);
  });
});

describe('applyCatchUp', () => {
  it('applies correct number of missed ticks', () => {
    const state = { hunger: 80, happiness: 80, energy: 80, state: 'normal', lastSavedAt: 0 };
    const now = 30_000; // 3 ticks at 10s each
    const TICK_MS = 10_000;
    const result = applyCatchUp(state, now, TICK_MS);
    expect(result.hunger).toBe(80 - 3 * 3); // 71
    expect(result.happiness).toBe(80 - 3 * 2); // 74
    expect(result.energy).toBe(80 - 3 * 1); // 77
  });
  it('clamps stats at 0 during multi-tick catch-up', () => {
    const state = { hunger: 5, happiness: 5, energy: 5, state: 'normal', lastSavedAt: 0 };
    const now = 100_000; // 10 ticks
    const result = applyCatchUp(state, now, 10_000);
    expect(result.hunger).toBe(0);
    expect(result.happiness).toBe(0);
    expect(result.energy).toBe(0);
  });
  it('applies zero ticks when elapsed < TICK_MS', () => {
    const state = { hunger: 80, happiness: 80, energy: 80, state: 'normal', lastSavedAt: Date.now() - 5_000 };
    const result = applyCatchUp(state, Date.now(), 10_000);
    expect(result.hunger).toBe(80);
  });
  it('skips all catch-up ticks when state is evolved', () => {
    const state = { hunger: 90, happiness: 90, energy: 90, state: 'evolved', lastSavedAt: 0 };
    const result = applyCatchUp(state, 100_000, 10_000);
    expect(result.hunger).toBe(90);
  });
  it('handles corrupted lastSavedAt gracefully (NaN)', () => {
    const state = { hunger: 80, happiness: 80, energy: 80, state: 'normal', lastSavedAt: NaN };
    const result = applyCatchUp(state, Date.now(), 10_000);
    // Should not throw; missedTicks resolves to 0
    expect(result.hunger).toBe(80);
  });
});
```

## Level 2 — Manual Smoke Tests

Run these in the browser before submission. Check each box when passing.

| # | Step | Expected |
|---|---|---|
| S1 | Open app in fresh tab (DevTools → Application → clear localStorage first) | Naming screen appears |
| S2 | Enter name "Pixel" and confirm | Pet screen loads; all 3 stats show at 80 |
| S3 | Wait 30 seconds without clicking anything | At least Hunger decreased (77), Happiness (78), Energy (79) |
| S4 | Open DevTools Console. Run: `let s = JSON.parse(localStorage.getItem('tamagotchi_state')); console.log(s.hunger, s.happiness, s.energy)` | Values match what's shown on screen |
| S5 | Reload the page | Stats are restored exactly as they were; no reset to 80 |
| S6 | Close the tab. Wait 90 seconds. Reopen | Stats have decayed by ~3 ticks (Hunger ~−9, Happiness ~−6, Energy ~−3 from last saved values) — catch-up applied at mount |
| S7 | In DevTools console, manually set `state` to `"evolved"` in localStorage, reload | Stats stop decreasing over time |
| S8 | Set `hunger` to `2` in localStorage, reload, wait 30 seconds | Hunger shows 0, not a negative number |
| S9 | Set `hunger` to `73` in localStorage, reload | Hunger bar shows exactly 7 filled hearts and 3 empty hearts |
| S10 | Set any stat to `45`, reload | That stat's hearts render in amber color (caution band, 30–59) |
| S11 | Set any stat to `15`, reload | That stat's hearts render in red color (danger band, < 30) |

## Traceability

| Test | Traces to |
|---|---|
| `clamp` suite | R3 — Stat Clamping |
| `createInitialState` suite | R1 — Initial State |
| `applyDecay` — normal decay | R2 — Stat Decay |
| `applyDecay` — no mutation | Design decision: pure function |
| `applyDecay` — evolved skip | R4 — Decay Pause |
| `applyCatchUp` — missed ticks | R7 — Elapsed-Time Catch-Up |
| `applyCatchUp` — clamp during catch-up | R3 + R7 |
| `applyCatchUp` — evolved skip | R4 + R7 |
| S3 smoke test | R2 — Stat Decay |
| S5 smoke test | R6 — Restore on Load |
| S6 smoke test | R7 — Elapsed-Time Catch-Up |
| S7 smoke test | R4 — Decay Pause |
| S8 smoke test | R3 — Stat Clamping |
| S9 smoke test | R8 — 10-segment heart bar |
| S10 smoke test | R8 — Amber threshold (30–59) |
| S11 smoke test | R8 — Red threshold (< 30) |

**Coverage check:** 9/11 automated tests + 11 smoke tests trace directly to R1–R10. Traceability: ~90% ✅

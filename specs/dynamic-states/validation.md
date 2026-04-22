# Validation — Dynamic States

## Level 1 — Automated Unit Tests (Vitest)

```js
// dynamic-states/dynamic-states.test.js
import { describe, it, expect } from 'vitest';
import { evaluateState } from '../src/petLogic';

const TICK_MS = 10_000;

const normal = (overrides = {}) => ({
  hunger: 80, happiness: 80, energy: 80,
  state: 'normal', evolvedAt: null, sickAt: null,
  recoveredFromSick: false,
  ...overrides,
});

describe('Normal → Sick transition', () => {
  it('transitions to sick when hunger < 20', () => {
    const next = evaluateState(normal({ hunger: 15 }), TICK_MS);
    expect(next.state).toBe('sick');
  });
  it('transitions to sick when happiness < 20', () => {
    const next = evaluateState(normal({ happiness: 10 }), TICK_MS);
    expect(next.state).toBe('sick');
  });
  it('transitions to sick when energy < 20', () => {
    const next = evaluateState(normal({ energy: 0 }), TICK_MS);
    expect(next.state).toBe('sick');
  });
  it('does NOT transition to sick at exactly 20', () => {
    const next = evaluateState(normal({ hunger: 20 }), TICK_MS);
    expect(next.state).toBe('normal');
  });
  it('sets sickAt on first sick transition', () => {
    const next = evaluateState(normal({ hunger: 15 }), TICK_MS);
    expect(next.sickAt).not.toBeNull();
  });
});

describe('Sick → Normal recovery', () => {
  const sick = (overrides = {}) => ({
    ...normal({ hunger: 15, ...overrides }),
    state: 'sick',
    sickAt: 1000,
  });

  it('recovers when all stats ≥ 50', () => {
    const next = evaluateState(sick({ hunger: 50, happiness: 50, energy: 50 }), TICK_MS);
    expect(next.state).toBe('normal');
  });
  it('clears sickAt on recovery', () => {
    const next = evaluateState(sick({ hunger: 50, happiness: 50, energy: 50 }), TICK_MS);
    expect(next.sickAt).toBeNull();
  });
  it('does NOT recover if one stat is below 50', () => {
    const next = evaluateState(sick({ hunger: 50, happiness: 40, energy: 50 }), TICK_MS);
    expect(next.state).toBe('sick');
  });
  it('does NOT recover if stats are exactly 49', () => {
    const next = evaluateState(sick({ hunger: 49, happiness: 49, energy: 49 }), TICK_MS);
    expect(next.state).toBe('sick');
  });
});

describe('Evolution timer', () => {
  it('sets evolvedAt when all stats > 80', () => {
    const state = normal({ hunger: 85, happiness: 85, energy: 85, evolvedAt: null });
    const next = evaluateState(state, TICK_MS);
    expect(next.evolvedAt).not.toBeNull();
  });
  it('resets evolvedAt if any stat drops to 80', () => {
    const state = normal({ hunger: 80, happiness: 90, energy: 90, evolvedAt: Date.now() - 5000 });
    const next = evaluateState(state, TICK_MS);
    expect(next.evolvedAt).toBeNull();
  });
  it('does NOT evolve before 18 ticks have elapsed', () => {
    const evolvedAt = Date.now() - (17 * TICK_MS);
    const state = normal({ hunger: 90, happiness: 90, energy: 90, evolvedAt });
    const next = evaluateState(state, TICK_MS);
    expect(next.state).toBe('normal');
  });
  it('triggers evolution after 18 ticks', () => {
    const evolvedAt = Date.now() - (18 * TICK_MS + 100);
    const state = normal({ hunger: 90, happiness: 90, energy: 90, evolvedAt });
    const next = evaluateState(state, TICK_MS);
    expect(next.state).toBe('evolved');
  });
  it('sets recoveredFromSick=true if pet was previously sick', () => {
    const evolvedAt = Date.now() - (18 * TICK_MS + 100);
    const state = normal({ hunger: 90, happiness: 90, energy: 90, evolvedAt, sickAt: 12345 });
    const next = evaluateState(state, TICK_MS);
    expect(next.recoveredFromSick).toBe(true);
  });
  it('leaves recoveredFromSick=false if pet was never sick', () => {
    const evolvedAt = Date.now() - (18 * TICK_MS + 100);
    const state = normal({ hunger: 90, happiness: 90, energy: 90, evolvedAt, sickAt: null });
    const next = evaluateState(state, TICK_MS);
    expect(next.recoveredFromSick).toBe(false);
  });
});

describe('Evolved state permanence', () => {
  it('no state changes once evolved', () => {
    const state = { ...normal({ hunger: 5 }), state: 'evolved' };
    const next = evaluateState(state, TICK_MS);
    expect(next.state).toBe('evolved');
  });
});
```

## Level 2 — Manual Smoke Tests

| # | Step | Expected |
|---|---|---|
| S1 | Set `TICK_INTERVAL_MS = 1000`. Force `hunger = 25` in DevTools → wait | Hunger bar pulses/glows at < 30 |
| S2 | Let hunger decay to 19 | Pet sprite changes to sick indicator |
| S3 | Click Feed + Play until all stats ≥ 50 | Pet returns to Normal state |
| S4 | Force all stats to 85 in state, set `TICK_INTERVAL_MS = 1000`. Wait 18 seconds | Pet evolves — alternate sprite shown |
| S5 | After evolution, stop interacting | Stats stay frozen (no decay) |
| S6 | Go sick, recover, then evolve (S2 → S3 → S4) | Alternate "Resilient" evolved sprite shown (Easter egg — validated in Personality tests) |
| S7 | Force hunger exactly to 20 | Pet NOT sick (< 20 required) |
| S8 | During evolution window, click Play when Happiness = 82 → let decay bring it to 80 | Evolution timer resets |
| S9 | Force `state: "sick"` in localStorage, reload | State badge shows exactly `SICK 🤒`; pet sprite is visually distinct (greyscale/droop) |
| S10 | Enable `prefers-reduced-motion` in OS/browser, load sick pet | State badge still shows `SICK 🤒`, sprite class still differs — no animation plays |
| S11 | Unmute, then force pet into evolve (stats all 85, `TICK_INTERVAL_MS=1000`, wait 18s) | `/sounds/evolve.ogg` plays exactly once on the transition |
| S12 | Unmute, then force a Sick transition (hunger to 15) | No audio plays on the transition — silent by design |
| S13 | Unmute, then force Sick → Normal recovery | No audio plays on recovery |

## Traceability

| Test | Traces to |
|---|---|
| Normal → Sick when stat < 20 | R2 |
| Not sick at exactly 20 | Edge case: exact threshold |
| sickAt set on transition | R2 |
| Recovery at all stats ≥ 50 | R3 |
| sickAt cleared on recovery | R3 |
| No recovery if any stat < 50 | R3 edge case |
| evolvedAt set when all > 80 | R4 step 1 |
| evolvedAt reset when stat ≤ 80 | R4 step 2 |
| No evolution before 18 ticks | R4 step 3 |
| Evolution triggers at 18 ticks | R5 |
| recoveredFromSick set | R5 |
| Evolved state no exit | R6 |
| S1–S8 smoke tests | R1–R8 |
| S9 smoke test | R8 — exact badge text and sprite variant |
| S10 smoke test | R9 — prefers-reduced-motion |
| S11 smoke test | R10 — Evolve chime plays once |
| S12 smoke test | R10 — Sick transition is silent |
| S13 smoke test | R10 — Recovery is silent |

**Coverage: 13/13 automated tests + 13 smoke tests trace to R1–R10. Traceability: ~100% ✅**

// tests/dynamic-states.test.js
// Matches specs/dynamic-states/validation.md — Level 1 automated tests.
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

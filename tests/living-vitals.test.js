// tests/living-vitals.test.js
// Matches specs/living-vitals/validation.md — Level 1 automated tests.
import { describe, it, expect } from 'vitest';
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
    expect(result.hunger).toBe(80 - 3 * 3);
    expect(result.happiness).toBe(80 - 3 * 2);
    expect(result.energy).toBe(80 - 3 * 1);
  });
  it('clamps stats at 0 during multi-tick catch-up', () => {
    const state = { hunger: 5, happiness: 5, energy: 5, state: 'normal', lastSavedAt: 0 };
    const now = 100_000;
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
    expect(result.hunger).toBe(80);
  });
});

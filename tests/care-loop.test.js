// tests/care-loop.test.js
// Matches specs/care-loop/validation.md — Level 1 automated tests.
import { describe, it, expect } from 'vitest';
import { feed, play, rest } from '../src/petLogic';

const baseState = {
  hunger: 50,
  happiness: 50,
  energy: 50,
  state: 'normal',
  lastInteractedAt: 0,
};

describe('feed', () => {
  it('increases hunger by 20', () => {
    const next = feed(baseState);
    expect(next.hunger).toBe(70);
  });
  it('does not change happiness or energy', () => {
    const next = feed(baseState);
    expect(next.happiness).toBe(50);
    expect(next.energy).toBe(50);
  });
  it('clamps hunger at 100 when near max', () => {
    const next = feed({ ...baseState, hunger: 95 });
    expect(next.hunger).toBe(100);
  });
  it('clamps hunger at 100 when already at max', () => {
    const next = feed({ ...baseState, hunger: 100 });
    expect(next.hunger).toBe(100);
  });
  it('updates lastInteractedAt', () => {
    const before = Date.now();
    const next = feed(baseState);
    expect(next.lastInteractedAt).toBeGreaterThanOrEqual(before);
  });
  it('does not mutate original state', () => {
    feed(baseState);
    expect(baseState.hunger).toBe(50);
  });
});

describe('play', () => {
  it('increases happiness by 15', () => {
    const next = play(baseState);
    expect(next.happiness).toBe(65);
  });
  it('does not change hunger', () => {
    const next = play(baseState);
    expect(next.hunger).toBe(50);
  });
  it('reduces energy by 10 (tradeoff cost)', () => {
    const next = play(baseState);
    expect(next.energy).toBe(40);
  });
  it('clamps energy at 0 when energy is below cost', () => {
    const next = play({ ...baseState, energy: 5 });
    expect(next.energy).toBe(0);
  });
  it('clamps happiness at 100', () => {
    const next = play({ ...baseState, happiness: 90 });
    expect(next.happiness).toBe(100);
  });
  it('updates lastInteractedAt', () => {
    const before = Date.now();
    const next = play(baseState);
    expect(next.lastInteractedAt).toBeGreaterThanOrEqual(before);
  });
  it('does not mutate original state', () => {
    play(baseState);
    expect(baseState.happiness).toBe(50);
  });
});

describe('rest', () => {
  it('increases energy by 25', () => {
    const next = rest(baseState);
    expect(next.energy).toBe(75);
  });
  it('does not change hunger', () => {
    const next = rest(baseState);
    expect(next.hunger).toBe(50);
  });
  it('reduces happiness by 5 (tradeoff cost)', () => {
    const next = rest(baseState);
    expect(next.happiness).toBe(45);
  });
  it('clamps happiness at 0 when happiness is below cost', () => {
    const next = rest({ ...baseState, happiness: 3 });
    expect(next.happiness).toBe(0);
  });
  it('clamps energy at 100', () => {
    const next = rest({ ...baseState, energy: 80 });
    expect(next.energy).toBe(100);
  });
  it('increases energy from 0 to 25', () => {
    const next = rest({ ...baseState, energy: 0 });
    expect(next.energy).toBe(25);
  });
  it('updates lastInteractedAt', () => {
    const before = Date.now();
    const next = rest(baseState);
    expect(next.lastInteractedAt).toBeGreaterThanOrEqual(before);
  });
  it('does not mutate original state', () => {
    rest(baseState);
    expect(baseState.energy).toBe(50);
  });
});

describe('action tradeoffs', () => {
  it('feed only changes hunger (no cross-stat cost)', () => {
    const next = feed(baseState);
    expect(next.happiness).toBe(baseState.happiness);
    expect(next.energy).toBe(baseState.energy);
    expect(next.state).toBe(baseState.state);
  });
  it('play raises happiness and costs energy', () => {
    const next = play(baseState);
    expect(next.happiness).toBeGreaterThan(baseState.happiness);
    expect(next.energy).toBeLessThan(baseState.energy);
  });
  it('rest raises energy and costs happiness', () => {
    const next = rest(baseState);
    expect(next.energy).toBeGreaterThan(baseState.energy);
    expect(next.happiness).toBeLessThan(baseState.happiness);
  });
});

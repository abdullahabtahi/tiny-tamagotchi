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
  it('does not change hunger or energy', () => {
    const next = play(baseState);
    expect(next.hunger).toBe(50);
    expect(next.energy).toBe(50);
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
  it('does not change hunger or happiness', () => {
    const next = rest(baseState);
    expect(next.hunger).toBe(50);
    expect(next.happiness).toBe(50);
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

describe('single-stat rule', () => {
  it('feed only changes hunger', () => {
    const keys = ['happiness', 'energy', 'state'];
    const next = feed(baseState);
    keys.forEach(k => expect(next[k]).toBe(baseState[k]));
  });
  it('play only changes happiness', () => {
    const keys = ['hunger', 'energy', 'state'];
    const next = play(baseState);
    keys.forEach(k => expect(next[k]).toBe(baseState[k]));
  });
  it('rest only changes energy', () => {
    const keys = ['hunger', 'happiness', 'state'];
    const next = rest(baseState);
    keys.forEach(k => expect(next[k]).toBe(baseState[k]));
  });
});

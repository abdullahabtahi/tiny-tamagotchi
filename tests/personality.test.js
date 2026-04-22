// tests/personality.test.js
// Matches specs/personality/validation.md — Level 1 automated tests.
import { describe, it, expect, vi } from 'vitest';
import {
  getIdleAnimationTier,
  shouldRefuseFood,
  isPoopShowing,
  getPoopPlayBonus,
  shouldShowResilientEasterEgg,
  validateName,
} from '../src/petLogic';

// ── Naming ──────────────────────────────────────────────────────────────────

describe('validateName', () => {
  it('accepts a single character', () => {
    expect(validateName('A')).toBe(true);
  });
  it('accepts a 12-character name', () => {
    expect(validateName('Abcdefghijkl')).toBe(true);
  });
  it('rejects empty string', () => {
    expect(validateName('')).toBe(false);
  });
  it('rejects whitespace-only string', () => {
    expect(validateName('   ')).toBe(false);
  });
  it('rejects name longer than 12 characters', () => {
    expect(validateName('Abcdefghijklm')).toBe(false);
  });
  it('trims before validation', () => {
    expect(validateName('  A  ')).toBe(true);
  });
});

// ── Idle Animations ──────────────────────────────────────────────────────────

describe('getIdleAnimationTier', () => {
  it('returns happy when all stats ≥ 60', () => {
    expect(getIdleAnimationTier(60, 60, 60)).toBe('happy');
    expect(getIdleAnimationTier(100, 100, 100)).toBe('happy');
  });
  it('returns neutral when any stat is in [30, 59]', () => {
    expect(getIdleAnimationTier(30, 80, 80)).toBe('neutral');
    expect(getIdleAnimationTier(80, 59, 80)).toBe('neutral');
  });
  it('returns droopy when any stat < 30', () => {
    expect(getIdleAnimationTier(29, 80, 80)).toBe('droopy');
    expect(getIdleAnimationTier(80, 80, 0)).toBe('droopy');
  });
  it('droopy takes priority over neutral', () => {
    expect(getIdleAnimationTier(10, 40, 80)).toBe('droopy');
  });
  it('neutral takes priority over happy', () => {
    expect(getIdleAnimationTier(59, 80, 80)).toBe('neutral');
  });
  it('returns happy at exact boundary (all = 60)', () => {
    expect(getIdleAnimationTier(60, 60, 60)).toBe('happy');
  });
});

// ── Food Refusal ─────────────────────────────────────────────────────────────

describe('shouldRefuseFood', () => {
  it('never refuses when hunger ≤ 80', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.10);
    expect(shouldRefuseFood(80)).toBe(false);
    expect(shouldRefuseFood(50)).toBe(false);
    vi.restoreAllMocks();
  });
  it('refuses when hunger > 80 and random < 0.30', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.29);
    expect(shouldRefuseFood(81)).toBe(true);
    vi.restoreAllMocks();
  });
  it('does not refuse when hunger > 80 and random ≥ 0.30', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.30);
    expect(shouldRefuseFood(81)).toBe(false);
    vi.restoreAllMocks();
  });
  it('never refuses when hunger = 80 (boundary)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.01);
    expect(shouldRefuseFood(80)).toBe(false);
    vi.restoreAllMocks();
  });
});

// ── Poop Mechanic ────────────────────────────────────────────────────────────

describe('isPoopShowing', () => {
  it('shows poop after 300 seconds of inactivity', () => {
    const lastInteractedAt = Date.now() - 300_001;
    expect(isPoopShowing(lastInteractedAt)).toBe(true);
  });
  it('does not show poop before 300 seconds', () => {
    const lastInteractedAt = Date.now() - 299_999;
    expect(isPoopShowing(lastInteractedAt)).toBe(false);
  });
  it('does not show poop at exactly 300 seconds', () => {
    const lastInteractedAt = Date.now() - 300_000;
    expect(isPoopShowing(lastInteractedAt)).toBe(false);
  });
});

describe('getPoopPlayBonus', () => {
  it('returns 18 when poop is showing', () => {
    expect(getPoopPlayBonus(true)).toBe(18);
  });
  it('returns 15 (standard) when poop is not showing', () => {
    expect(getPoopPlayBonus(false)).toBe(15);
  });
});

// ── Easter Egg ───────────────────────────────────────────────────────────────

describe('shouldShowResilientEasterEgg', () => {
  it('returns true when state is evolved and recoveredFromSick is true', () => {
    expect(shouldShowResilientEasterEgg('evolved', true)).toBe(true);
  });
  it('returns false when state is evolved but recoveredFromSick is false', () => {
    expect(shouldShowResilientEasterEgg('evolved', false)).toBe(false);
  });
  it('returns false when state is not evolved', () => {
    expect(shouldShowResilientEasterEgg('normal', true)).toBe(false);
    expect(shouldShowResilientEasterEgg('sick', true)).toBe(false);
  });
});

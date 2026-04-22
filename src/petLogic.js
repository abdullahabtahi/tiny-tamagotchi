// src/petLogic.js
// Pure game logic — no React, no DOM, no side effects. Fully unit-testable.
// Every function here is referenced by a numbered requirement in specs/.

// ─── Constants ────────────────────────────────────────────────────────────────

export const TICK_INTERVAL_MS = 30_000; // specs/tech-stack.md — Data Flow
export const DECAY = { hunger: 3, happiness: 2, energy: 1 }; // living-vitals R2
export const ACTION_GAIN = { feed: 20, play: 15, rest: 25 }; // care-loop R1–R3
export const ACTION_COST = { play: 10, rest: 5 };  // care-loop R1–R3 — cross-stat tradeoffs
export const POOP_PLAY_BONUS = 3; // personality R7
export const POOP_DELAY_MS = 300_000; // personality R6 — 5 minutes
export const EVOLUTION_TICKS = 18; // dynamic-states R4
export const SICK_THRESHOLD = 20; // < 20
export const RECOVERY_THRESHOLD = 50; // >= 50
export const EVOLVE_STAT_THRESHOLD = 80; // > 80
export const PULSE_THRESHOLD = 30; // < 30
export const REFUSAL_PROBABILITY = 0.30; // personality R5
export const REFUSAL_HUNGER_THRESHOLD = 80; // > 80
export const NAME_MIN = 1;
export const NAME_MAX = 12;
export const STORAGE_KEY_STATE  = 'tamagotchi_state';
export const STORAGE_KEY_MUTED  = 'tamagotchi_muted';
export const STORAGE_KEY_STREAK = 'tamagotchi_streak';

// ─── Pure utilities ───────────────────────────────────────────────────────────

export function clamp(value, min, max) {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

// ─── State factory ────────────────────────────────────────────────────────────

export function createInitialState(name) {
  const now = Date.now();
  return {
    name,
    hunger: 80,
    happiness: 80,
    energy: 80,
    state: 'normal',
    evolvedAt: null,
    sickAt: null,
    lastSavedAt: now,
    recoveredFromSick: false,
    lastInteractedAt: now,
  };
}

// ─── Decay + catch-up ─────────────────────────────────────────────────────────

export function applyDecay(state) {
  if (state.state === 'evolved') return { ...state };
  return {
    ...state,
    hunger: clamp(state.hunger - DECAY.hunger, 0, 100),
    happiness: clamp(state.happiness - DECAY.happiness, 0, 100),
    energy: clamp(state.energy - DECAY.energy, 0, 100),
  };
}

export function applyCatchUp(state, now, tickMs) {
  const lastSaved = state.lastSavedAt;
  if (!Number.isFinite(lastSaved) || !Number.isFinite(now) || !tickMs) {
    return { ...state };
  }
  const elapsed = now - lastSaved;
  if (elapsed < tickMs) return { ...state };
  const missedTicks = Math.floor(elapsed / tickMs);
  let cur = { ...state };
  for (let i = 0; i < missedTicks; i++) {
    if (cur.state === 'evolved') break; // decay paused permanently
    cur = applyDecay(cur);
  }
  return cur;
}

// ─── Actions ──────────────────────────────────────────────────────────────────

export function feed(state) {
  return {
    ...state,
    hunger: clamp(state.hunger + ACTION_GAIN.feed, 0, 100),
    lastInteractedAt: Date.now(),
  };
}

export function play(state) {
  return {
    ...state,
    happiness: clamp(state.happiness + ACTION_GAIN.play, 0, 100),
    energy: clamp(state.energy - ACTION_COST.play, 0, 100),
    lastInteractedAt: Date.now(),
  };
}

export function rest(state) {
  return {
    ...state,
    energy: clamp(state.energy + ACTION_GAIN.rest, 0, 100),
    happiness: clamp(state.happiness - ACTION_COST.rest, 0, 100),
    lastInteractedAt: Date.now(),
  };
}

// ─── Dynamic state machine ────────────────────────────────────────────────────

export function evaluateState(state, tickMs) {
  const { hunger, happiness, energy } = state;
  const now = Date.now();

  // Evolved is terminal (dynamic-states R6)
  if (state.state === 'evolved') return { ...state };

  const isSick = hunger < SICK_THRESHOLD || happiness < SICK_THRESHOLD || energy < SICK_THRESHOLD;
  const isRecovered =
    hunger >= RECOVERY_THRESHOLD && happiness >= RECOVERY_THRESHOLD && energy >= RECOVERY_THRESHOLD;

  if (state.state === 'sick') {
    if (isRecovered) {
      return { ...state, state: 'normal', sickAt: null };
    }
    return { ...state };
  }

  // Normal → Sick
  if (isSick) {
    return {
      ...state,
      state: 'sick',
      sickAt: state.sickAt ?? now,
      evolvedAt: null,
    };
  }

  // Normal → evolution window
  const allHigh =
    hunger > EVOLVE_STAT_THRESHOLD &&
    happiness > EVOLVE_STAT_THRESHOLD &&
    energy > EVOLVE_STAT_THRESHOLD;

  if (!allHigh) {
    return state.evolvedAt !== null ? { ...state, evolvedAt: null } : { ...state };
  }

  const evolvedAt = state.evolvedAt ?? now;
  if (now - evolvedAt >= EVOLUTION_TICKS * tickMs) {
    return {
      ...state,
      state: 'evolved',
      evolvedAt,
      recoveredFromSick: state.recoveredFromSick || state.sickAt !== null,
    };
  }

  return { ...state, evolvedAt };
}

// ─── Personality helpers ──────────────────────────────────────────────────────

export function validateName(raw) {
  if (typeof raw !== 'string') return false;
  const trimmed = raw.trim();
  return trimmed.length >= NAME_MIN && trimmed.length <= NAME_MAX;
}

export function getIdleAnimationTier(hunger, happiness, energy) {
  const min = Math.min(hunger, happiness, energy);
  if (min < PULSE_THRESHOLD) return 'droopy';
  if (min < 60) return 'neutral';
  return 'happy';
}

export function shouldRefuseFood(hunger, rng = Math.random) {
  if (hunger <= REFUSAL_HUNGER_THRESHOLD) return false;
  return rng() < REFUSAL_PROBABILITY;
}

export function isPoopShowing(lastInteractedAt, now = Date.now()) {
  return now - lastInteractedAt > POOP_DELAY_MS;
}

export function getPoopPlayBonus(poopShowing) {
  return poopShowing ? ACTION_GAIN.play + POOP_PLAY_BONUS : ACTION_GAIN.play;
}

export function shouldShowResilientEasterEgg(state, recoveredFromSick) {
  return state === 'evolved' && recoveredFromSick === true;
}

// ─── Derived view helpers (used by React) ─────────────────────────────────────

export function getHeartColorClass(value) {
  if (value >= 60) return 'heart--healthy';
  if (value >= 30) return 'heart--warning';
  return 'heart--critical';
}

export function getStateBadge(state, recoveredFromSick) {
  if (state === 'sick') return 'SICK 🤒';
  if (state === 'evolved') return recoveredFromSick ? 'RESILIENT 🏅' : 'EVOLVED ✨';
  return 'NORMAL';
}

export function getPetFace(state, recoveredFromSick) {
  if (state === 'sick') return '(×﹏×)';
  if (state === 'evolved') return recoveredFromSick ? '(✦ω✦)' : '(★ω★)';
  return '(^·ω·^)';
}

export function getEggStage(nameLength) {
  if (nameLength <= 3) return 'egg--intact';
  if (nameLength <= 8) return 'egg--cracked';
  return 'egg--hatching';
}

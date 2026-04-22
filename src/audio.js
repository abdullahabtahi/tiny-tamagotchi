// src/audio.js
// Web Audio API synthesiser — no asset files, no 404s, no preload needed.
// AudioContext is created lazily on the first playClip() call (after a user
// gesture) to comply with browser autoplay policy.

import { STORAGE_KEY_MUTED } from './petLogic';

// ── Retro note frequencies (Hz) ──────────────────────────────────────────────
const NOTE = {
  C4: 261.63, E4: 329.63, G4: 392.00,
  Bb4: 466.16, B4: 493.88,
  C5: 523.25, E5: 659.26, G5: 783.99,
  C6: 1046.50,
};

// ── Clip definitions ──────────────────────────────────────────────────────────
// Each clip is an array of { freq, dur (s), vol? } notes played in sequence.
// type: 'square' gives the classic 8-bit GameBoy sound.
const CLIPS = {
  poke:   [{ freq: NOTE.C6, dur: 0.05 }],
  feed:   [{ freq: NOTE.C5, dur: 0.08 }, { freq: NOTE.E5, dur: 0.12 }],
  play:   [{ freq: NOTE.C5, dur: 0.06 }, { freq: NOTE.E5, dur: 0.06 }, { freq: NOTE.G5, dur: 0.12 }],
  rest:   [{ freq: NOTE.G4, dur: 0.12 }, { freq: NOTE.E4, dur: 0.12 }, { freq: NOTE.C4, dur: 0.18 }],
  refuse: [{ freq: NOTE.B4, dur: 0.06 }, { freq: NOTE.Bb4, dur: 0.10 }],
  evolve: [
    { freq: NOTE.C5, dur: 0.08 },
    { freq: NOTE.E5, dur: 0.08 },
    { freq: NOTE.G5, dur: 0.08 },
    { freq: NOTE.C6, dur: 0.28 },
  ],
};

// ── AudioContext (lazy) ───────────────────────────────────────────────────────
let ctx = null;

function getCtx() {
  if (!ctx) {
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch {
      return null;
    }
  }
  // Resume if suspended (Chrome policy after page load)
  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }
  return ctx;
}

// ── Public API ────────────────────────────────────────────────────────────────

/** Called at module load — now a no-op (kept so main.jsx import doesn't break). */
export function preloadAudio() {}

export function isMuted() {
  const raw = localStorage.getItem(STORAGE_KEY_MUTED);
  if (raw === null) return true; // default muted on first visit
  try {
    return JSON.parse(raw) === true;
  } catch {
    return true;
  }
}

export function setMuted(value) {
  localStorage.setItem(STORAGE_KEY_MUTED, JSON.stringify(!!value));
}

export function playClip(key) {
  if (isMuted()) return;
  const notes = CLIPS[key];
  if (!notes) return;

  const context = getCtx();
  if (!context) return;

  let t = context.currentTime;

  notes.forEach(({ freq, dur, vol = 0.18 }) => {
    // Master gain with fast attack + release to avoid clicks
    const gain = context.createGain();
    gain.connect(context.destination);
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(vol, t + 0.005);          // 5ms attack
    gain.gain.setValueAtTime(vol, t + dur - 0.01);
    gain.gain.linearRampToValueAtTime(0, t + dur);              // 10ms release

    const osc = context.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(freq, t);
    osc.connect(gain);
    osc.start(t);
    osc.stop(t + dur);

    t += dur;
  });
}

# Roadmap

Ordered feature list for the Tiny Tamagotchi MVP.
Each item is a self-contained spec folder. Mark items `[x]` when implementation + validation pass.

---

## Features

### [ ] 1. Living Vitals
**Folder:** `/living-vitals/`

Auto-decreasing Hunger, Happiness, and Energy meters that tick down on a fixed interval.
Stats are clamped to [0, 100]. Persisted to localStorage on every change.

**Done when:**
- Three stat bars render with correct current values.
- Stats decrease automatically every 30 seconds by the defined amounts.
- Stats never go below 0 or above 100.
- State is saved to and restored from localStorage.
- Elapsed-time catch-up applies missed ticks on app mount based on `lastSavedAt`.

---

### [ ] 2. Care Loop
**Folder:** `/care-loop/`

Feed, Play, and Rest action buttons that replenish the corresponding stat.

**Done when:**
- Feed button increases Hunger by 20 (capped at 100).
- Play button increases Happiness by 15 (capped at 100).
- Rest button increases Energy by 25 (capped at 100).
- Each action affects exactly one stat. There are no secondary stat side effects.
- Each action provides immediate visual feedback (button state change or stat bar animation).
- Actions work correctly when a stat is already at or near 100.

---

### [ ] 3. Dynamic States
**Folder:** `/dynamic-states/`

Pet transitions between Normal, Sick, and Evolved states based on stat thresholds.

**Done when:**
- Pet enters a visual attention pulse when any stat drops below 30 (warning state, not yet Sick).
- Pet is Sick when any stat drops below 20.
- Pet recovers to Normal when all stats are ≥ 50 after being Sick.
- Pet Evolves when all stats remain above 80 for 9 consecutive minutes (18 ticks at the default 30-second cadence); the timer resets if any stat drops below 80.
- Each state has a distinct visual indicator (sprite or emoji + label).
- Stat decay is paused while the pet is in the Evolved state.

---

### [ ] 4. Personality
**Folder:** `/personality/`

Pet naming on first visit, stat-driven idle animations, unique reactions, Easter eggs, and expressive companion features.

**Done when:**
- Naming screen appears on first load (no localStorage name).
- Pet name persists across refreshes.
- Pet displays at least 3 different idle animation states based on stat ranges (bouncy / neutral / droopy).
- Pet occasionally refuses food when Hunger > 80 (shake animation, no stat change).
- A poop indicator appears after 5 minutes of no interaction; cleared by the Play action, which grants a +3 Happiness bonus on top of its normal +15 (so Play = +18 while poop is present).
- At least 1 Easter egg: if pet evolves after recovering from Sick, show alternate evolved sprite + "Resilient" badge.
- Retro pixel art visual style is applied consistently.
- Every care action (Feed, Play, Rest, Refuse) triggers a 2-second speech bubble with a message from an action-specific pool; rapid taps restart the timer.
- The pet sprite is directly tappable/clickable — triggers a jiggle animation, a poke sound, and a random reaction message with no stat change.
- The pet mutters unprompted idle-chatter messages every 20–40 seconds, tuned to its current mood.
- A care-streak counter (`🔥 N`) appears in the header on consecutive healthy days, persisted in `localStorage` under `tamagotchi_streak`.

---

## Completion Gate

Before submitting, confirm:

> "Can a user name the pet, keep it alive with Feed/Play/Rest, see Normal/Sick/Evolved
> states, and feel like it's a real game?"

If yes → record the Loom video and submit.

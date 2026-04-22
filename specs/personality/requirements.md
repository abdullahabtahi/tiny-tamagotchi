# Requirements — Personality

## Behavioral Requirements

### R1 — Naming Screen Trigger
The naming screen is shown on first load when `localStorage` has no saved state, or when the saved state has no pet name. The pet screen is shown when a valid name exists.

### R2 — Name Constraints
- Minimum length: **1 character** (after trimming whitespace).
- Maximum length: **12 characters**.
- Confirm button is disabled while the input is empty or whitespace-only (`aria-disabled="true"`).
- Name is trimmed before saving.
- Input field is **auto-focused on mount** — no click required to begin typing.
- Pressing **Enter** when input is valid submits the form (same behavior as clicking HATCH).
- A character counter (e.g., `0/12`) is displayed beneath or inside the input field.

### R3 — Name Persistence
The pet name is saved in `localStorage` as part of `tamagotchi_state`. It survives page refresh and tab close/reopen.

### R4 — Idle Animation Tiers
The pet sprite shows one of three animation tiers, determined by the lowest current stat:
- **Happy** (`pet--happy`): all stats ≥ 60 — `translateY(0 → -4px → 0)`, 1.6s, infinite (slow, breathing-like).
- **Neutral** (`pet--neutral`): any stat in [30, 59] — `rotate(-2deg → 2deg → -2deg)`, 1.8s, infinite.
- **Droopy** (`pet--droopy`): any stat < 30 — `translateY(0 → 3px → 0)`, 2.4s, infinite.

`.pet--breathing` (scale 1 → 1.02 → 1, 3s, infinite) is always applied as a base layer underneath the idle tier.

Priority when multiple conditions apply: Droopy > Neutral > Happy. Idle tier and `.pet--pulse` (from Dynamic States) are independent — both classes can be active simultaneously on different elements.

Full keyframe contracts are defined in `specs/tech-stack.md` — CSS Animation Spec table.

### R5 — Food Refusal
When Feed is clicked and `hunger > 80`:
- **30% probability**: the feed action is cancelled. The pet plays a shake animation for ~500ms and `/sounds/refuse.ogg` plays (subject to mute). `hunger` does not change. `lastInteractedAt` updates.
- **70% probability**: the feed action executes normally.

When Feed is clicked and `hunger ≤ 80`: the refusal logic does not apply; action always executes.

### R6 — Poop Indicator
When `Date.now() - lastInteractedAt >= 300_000` (5 minutes of no interaction), a poop emoji 💩 is displayed near the pet. The indicator is computed from `lastInteractedAt` — it is not a stored state field.

### R7 — Poop Clearance
When the **Play** button is clicked while the poop indicator is showing:
- Poop indicator disappears (because `lastInteractedAt` updates, resetting the timer).
- Happiness increases by **18** (standard +15 plus +3 poop-clear bonus), capped at 100.

When Play is clicked while poop is NOT showing: standard +15 applies, no bonus.

### R8 — Easter Egg: "Resilient" Badge
When the pet transitions to `state === "evolved"` and `recoveredFromSick === true`:
- An alternate evolved sprite is shown.
- A "Resilient" badge overlay is displayed.

When `recoveredFromSick === false` at evolution: standard evolved sprite, no badge.

### R9 — Visual Style
- All pet sprites use `image-rendering: pixelated`.
- Font: `Press Start 2P` (Google Fonts). 16px for title/pet name; 8px for all other text. Line-height: 2.
- Retro border style: `2px solid var(--color-accent)` on stat bars, buttons, and outer container. Box-shadow: `2px 2px 0 var(--color-accent)` (hard pixel shadow, no blur).
- Background: `var(--color-bg)` (`#0d0d1a`). Surface: `var(--color-surface)` (`#1a1a2e`). All tokens defined in `specs/tech-stack.md` — Design Tokens section.

### R10 — Speech Bubble: Action Feedback
After every care action (Feed, Play, Rest, Refuse) a speech bubble appears above the pet for **2 seconds**, then disappears automatically. The message is randomly chosen from an action-specific pool:

| Action | Example messages |
|---|---|
| Feed (accepted) | "yum yum!", "so tasty!", "nom nom!", "thank you!" |
| Play (no poop) | "wheee!", "so fun!", "again!", "yay!" |
| Play (poop present) | "ew, finally!", "much better!", "so fresh now!" |
| Rest | "zzz...", "so comfy~", "sleepy...", "💤" |
| Refuse | "i'm full!", "no thanks!", "too much!", "burp!" |

If a new action fires while a bubble is already showing, the timer restarts with the new message (no stacking, no queue).

### R11 — Speech Bubble: State Transitions
Automatic state changes also trigger a speech bubble with no user action required:

| Trigger | Example messages |
|---|---|
| Transition to `sick` | "i feel awful...", "ouch...", "help me..." |
| Transition to `evolved` | "i evolved!", "look at me!", "i'm glowing!", "✨" |

### R12 — Speech Bubble: Accessibility
The speech bubble element carries `role="status"` and `aria-live="polite"`. Its text is announced to screen readers without interrupting other content.

### R13 — Clickable Pet (Poke Interaction)
The pet sprite is interactive at all times:
- The pet has `role="button"` and `tabIndex=0` so it is keyboard-reachable.
- Clicking, tapping, or pressing Enter/Space while focused triggers a **poke**:
  - A short high blip sound plays (subject to mute): single `C6` square-wave oscillator, ~50ms.
  - A random message from the poke pool is shown in the speech bubble: "hehe!", "stop it!", "again!", "ooo!", "tickles!", "😆".
  - The pet plays `pet--tap` animation (400ms scale + rotate bounce).
- While `pet--tap` is active it is the **only** animation class on the pet element — all idle/state animations are suppressed until the 400ms completes, then resume normally.
- No stat values change from poking.

### R14 — Idle Chatter
The pet emits unprompted mood-appropriate messages using the same `SpeechBubble` component:
- Fires on a random interval between **20 000 ms and 40 000 ms** using a recursive `setTimeout` (not `setInterval`).
- Mood key is derived from current pet state using this priority order:
  1. `sick` → pool: "i don't feel good...", "*cough*", "ouch..."
  2. `evolved` → pool: "look how i glow!", "i'm fabulous!", "still glowing ✨"
  3. Lowest stat < 50 and that stat is Hunger → pool: "my tummy grumbles...", "feed me?", "so hungry..."
  4. Lowest stat < 50 and that stat is Happiness → pool: "so bored...", "play with me!", "i need fun..."
  5. Lowest stat < 50 and that stat is Energy → pool: "so tired...", "zzz...?", "need sleep..."
  6. All stats ≥ 70 → pool: "i'm thriving!", "life is good!", "feeling great!"
  7. Default → pool: "...", "la la la~", "hmm~", "just chillin"
- The timer is reset correctly on component unmount (no memory leaks).

### R15 — Care Streak Counter
A care streak tracks consecutive calendar days the pet is kept healthy:
- **Healthy** means: all three stats ≥ 50 AND `state !== 'sick'`.
- Streak is displayed as `🔥 N` in the app header when `count > 0`; hidden when `count === 0`.
- Streak logic (`computeStreak`) runs on every state change (same `useEffect` as `saveState`):
  - If `lastDay === today`: no change (already evaluated today).
  - If pet is healthy AND `lastDay === yesterday`: increment `count` by 1.
  - If pet is healthy AND gap > 1 day (or no prior record): reset `count` to 1.
  - If pet is **not** healthy: reset `count` to 0.
- Persisted in `localStorage` under key `tamagotchi_streak` as `{ count: number, lastDay: 'YYYY-MM-DD' }`.
- Streak counter is **not** a pressure mechanic — it is never surfaced as a warning or loss condition.

### R16 — Egg Reveal Stages
The naming screen egg sprite has 3 visually distinct stages driven by input length:
- **Intact** (`egg--intact`): 0–3 characters typed.
- **Cracked** (`egg--cracked`): 4–8 characters typed.
- **Hatching** (`egg--hatching`): 9–12 characters typed.

On submission (HATCH click or Enter), an egg burst animation plays (~600ms) before transitioning to the Pet Care Screen.

### R17 — Mute Toggle
A mute toggle is rendered as an icon button in the pet-screen header.
- Icons: `🔇` when muted, `🔈` when unmuted.
- State persisted in `localStorage` under key `tamagotchi_muted` (boolean).
- **Default on first visit: `true` (muted).** A calm companion never startles the user with unexpected sound.
- Toggling updates `tamagotchi_muted` immediately; no confirmation dialog.
- When muted, all `audio.play()` calls throughout the app are short-circuited — no audio plays, including the Evolved chime.
- Accessibility: button has `aria-pressed` attribute reflecting mute state and `aria-label="Mute sounds"` / `"Unmute sounds"`.

See `specs/tech-stack.md` — Audio Stack for master gain, file list, and preload strategy.

### R18 — Copy & Tone
All player-facing text adheres to the calm-companion tone:
- **Naming screen title:** `your pet is hatching` (lowercase).
- **Naming screen helper text:** `choose a name` (lowercase, 8px, `--color-text` at 60% opacity).
- **Character counter:** `0/12` format, 8px, 60% opacity.
- **Primary button:** `HATCH` (uppercase for button-affordance convention; no exclamation mark).
- **State badges:** `NORMAL`, `SICK 🤒`, `EVOLVED ✨`, `RESILIENT 🏅` (short, factual; emojis are badges, not decoration).
- **No exclamation marks anywhere in body copy.** Exclamation marks feel urgent; calm companions do not shout.
- **No emojis in body text** — emojis appear only inside state/status badges and the poop indicator.

## Edge Cases

| Scenario | Expected Behavior |
|---|---|
| User types spaces only in name field | Confirm button stays disabled (whitespace trimmed = empty) |
| User types 13 characters | Input capped at 12 characters (maxLength attribute) |
| Feed clicked when hunger = 81 (> 80) | 30% chance of refusal |
| Feed clicked when hunger = 80 (= 80) | No refusal — always executes |
| Play clicked when poop showing and happiness = 95 | Happiness = 100 (95 + 18 = 113, clamped to 100) |
| Play clicked when poop showing and happiness = 100 | Happiness stays 100, poop clears |
| Pet evolved without ever being sick | Standard evolved sprite, no Resilient badge |
| Pet sick, then evolved WITHOUT recovering (not possible per R3 of dynamic-states — recovery always reaches Normal before evolution) | recoveredFromSick = false; standard evolved sprite |

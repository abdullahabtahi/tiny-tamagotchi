# Mission

## What & Why

Tiny Tamagotchi is a single-page virtual pet web app where one user cares for one pet — a
**Lumi** — by managing three stats (Hunger, Happiness, Energy) through three actions
(Feed, Play, Rest). One Lumi per user. One user per browser. It hatches from a name.

**Vision:** a calm companion you keep open in a background tab — a small, quiet presence
that rewards occasional attention, never demands it, and never punishes you permanently.

**Meta-purpose:** the submission also demonstrates spec-driven development; the specs in this
repository are the primary judged deliverable, and the code is the artifact they produce.

## Target Audience

A single curious developer, designer, or student who wants a low-stakes, low-pressure digital
pet to glance at between tasks. The player is assumed to be comfortable with a browser tab and
opinionated about being left alone — no sign-up, no onboarding tutorial, no notifications.

Out of scope for the audience: children under 13 (no COPPA compliance), users expecting
multi-device sync, and anyone looking for a full-feature virtual pet (battling, breeding,
social). This is deliberately a party of one.

## Core Constraints

| Allowed | Not Allowed |
|---|---|
| One pet, one user, pet naming | Auth, multiple users or pets |
| Stats 0–100: Hunger, Happiness, Energy | Inventories, currencies, shops |
| Actions: Feed, Play, Rest | Mini-games, social features, push notifications |
| States: Normal, Sick, Evolved (one path) | Admin features, complex multi-stage evolutions |
| Easter eggs and personality quirks | Permanent death (unrecoverable state) |
| Stats auto-tick down over time | Timed FOMO events, streak pressure, daily reset anxiety |

### Why These "Not Allowed" Items Are Out

- **Auth, multiple users or pets** — this is a personal companion, not a social product. The pet belongs to the tab.
- **Inventories, currencies, shops** — the care loop is Feed / Play / Rest. Adding economies trades warmth for optimisation.
- **Mini-games, social features, push notifications** — we optimise for *less* demand on the user, not more. A background-tab companion that pings you isn't a companion.
- **Complex multi-stage evolutions** — one evolution, one reward, one story arc. Enough.
- **Permanent death** — sadness is not the reward. A pet that dies forever betrays the trust of leaving a tab open.
- **Timed FOMO, streaks, daily resets** — the pacing is 30 seconds per tick. The tone is *calm*. Those patterns are the opposite.

## User Flows

1. **First visit:** User lands on the app, enters a name for their pet, and begins caring for it.
2. **Care loop:** User observes stat bars decreasing over time and taps Feed/Play/Rest to replenish them. Each action triggers a speech bubble reaction from the pet (e.g. "yum yum!", "wheee!", "zzz...").
3. **Tap / poke:** User can click or tap the pet sprite directly at any time — the pet jiggles and blurts a random reaction ("hehe!", "stop it!", etc.).
4. **Idle chatter:** Between actions the pet mutters unprompted mood-appropriate lines every 20–40 seconds — creating the sense of a living companion even when the user is doing nothing.
5. **State change:** If any stat falls below 20, the pet becomes Sick. Recovery happens when all stats are brought back to ≥ 50 through any combination of Feed, Play, and Rest.
6. **Evolution:** When all stats stay above 80 for 9 consecutive minutes (18 ticks at the default 30-second cadence), the pet evolves — visual change + a personality message appears.
7. **Return visit:** Stats are restored from localStorage; the pet is in whatever state it was left in.
8. **Streak:** A care-streak counter (`🔥 N`) in the header tracks consecutive calendar days the pet was kept healthy. It is a low-key reward, never a pressure mechanic.

## Success Criteria

- A user can name their pet on first load.
- On first load (no saved state), all three stats initialize to 80.
- Stats decrease automatically without user interaction.
- The pet's stats decay in real time even when the browser tab is closed; on return, missed ticks are applied at load time.
- Feed, Play, and Rest each increase the corresponding stat by a defined amount.
- Each care action shows a speech bubble reaction from the pet for 2 seconds.
- Clicking or tapping the pet sprite directly triggers a jiggle animation and a random reaction message.
- The pet mutters unprompted idle-chatter messages every 20–40 seconds, tuned to its current mood.
- A care-streak counter appears in the header after at least one day of healthy care.
- The pet transitions visibly between Normal, Sick, and Evolved states based on stat thresholds.
- At least one personality Easter egg is discoverable.
- The app runs in a modern browser with no backend and no auth.
- All three spec files and all four feature folders are present and internally consistent.

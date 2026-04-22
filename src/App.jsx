import { useEffect, useRef, useState } from 'react';
import {
  STORAGE_KEY_STATE,
  STORAGE_KEY_STREAK,
  TICK_INTERVAL_MS,
  NAME_MAX,
  createInitialState,
  applyCatchUp,
  applyDecay,
  evaluateState,
  feed,
  play,
  rest,
  validateName,
  getIdleAnimationTier,
  shouldRefuseFood,
  isPoopShowing,
  getHeartColorClass,
  getStateBadge,
  getPetFace,
  getEggStage,
  POOP_PLAY_BONUS,
  ACTION_GAIN,
  clamp,
} from './petLogic.js';
import { playClip, isMuted, setMuted } from './audio.js';

// ── Persistence — pet state ───────────────────────────────────────────────────
function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_STATE);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || !parsed.name) return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY_STATE, JSON.stringify({ ...state, lastSavedAt: Date.now() }));
  } catch { /* quota / privacy mode */ }
}

// ── Persistence — streak ─────────────────────────────────────────────────────
function getToday() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

function loadStreak() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_STREAK);
    if (!raw) return { count: 0, lastDay: null };
    return JSON.parse(raw);
  } catch {
    return { count: 0, lastDay: null };
  }
}

function saveStreak(streak) {
  try {
    localStorage.setItem(STORAGE_KEY_STREAK, JSON.stringify(streak));
  } catch { /* ignore */ }
}

function computeStreak(current, petState) {
  const today = getToday();
  if (current.lastDay === today) return current; // already evaluated today

  const petHealthy =
    petState.state !== 'sick' &&
    petState.hunger >= 50 &&
    petState.happiness >= 50 &&
    petState.energy >= 50;

  let isConsecutive = false;
  if (current.lastDay) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    isConsecutive = yesterday.toISOString().slice(0, 10) === current.lastDay;
  }

  const newCount = petHealthy ? (isConsecutive ? current.count + 1 : 1) : 0;
  return { count: newCount, lastDay: today };
}

// ── Messages ─────────────────────────────────────────────────────────────────
const MESSAGES = {
  // Action feedback
  feed:          ['yum yum!', 'so tasty!', 'nom nom!', 'thank you!'],
  play:          ['wheee!', 'so fun!', 'again!', 'yay!'],
  rest:          ['zzz...', 'so comfy~', 'sleepy...', '💤'],
  refuse:        ["i'm full!", 'no thanks!', 'too much!', 'burp!'],
  poop:          ['ew, finally!', 'much better!', 'so fresh now!'],
  sick:          ['i feel awful...', 'ouch...', 'help me...'],
  evolved:       ['i evolved!', 'look at me!', "i'm glowing!", '✨'],
  // Tap reactions (feature: clickable pet)
  poke:          ['hehe!', 'stop it!', 'again!', 'ooo!', 'tickles!', '😆'],
  // Idle mood chatter (feature: idle chatter)
  idle_hungry:   ['my tummy grumbles...', 'feed me?', 'so hungry...'],
  idle_unhappy:  ['so bored...', 'play with me!', 'i need fun...'],
  idle_tired:    ['so tired...', 'zzz...?', 'need sleep...'],
  idle_thriving: ["i'm thriving!", 'life is good!', 'feeling great!'],
  idle_sick:     ["i don't feel good...", '*cough*', 'ouch...'],
  idle_evolved:  ['look how i glow!', "i'm fabulous!", 'still glowing ✨'],
  idle_normal:   ['...', 'la la la~', 'hmm~', 'just chillin'],
};

function pickMessage(key) {
  const pool = MESSAGES[key];
  return pool[Math.floor(Math.random() * pool.length)];
}

function getIdleMessageKey(petState) {
  if (petState.state === 'sick') return 'idle_sick';
  if (petState.state === 'evolved') return 'idle_evolved';
  const min = Math.min(petState.hunger, petState.happiness, petState.energy);
  if (petState.hunger < 50 && petState.hunger <= min) return 'idle_hungry';
  if (petState.happiness < 50 && petState.happiness <= min) return 'idle_unhappy';
  if (petState.energy < 50 && petState.energy <= min) return 'idle_tired';
  if (min >= 70) return 'idle_thriving';
  return 'idle_normal';
}

// ── Sub-components ────────────────────────────────────────────────────────────
function SpeechBubble({ message }) {
  if (!message) return null;
  return (
    <div className="bubble" role="status" aria-live="polite">
      {message}
    </div>
  );
}

function StatBar({ label, value }) {
  const filled = Math.floor(value / 10);
  const colorClass = getHeartColorClass(value);
  return (
    <div className="stat" aria-label={`${label} ${value} of 100`}>
      <div className="stat__row">
        <span className="stat__label">{label}</span>
        <span className="stat__value">{value}</span>
      </div>
      <div
        className="stat__hearts"
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        {Array.from({ length: 10 }).map((_, i) => (
          <span
            key={i}
            className={`heart ${i < filled ? `heart--filled ${colorClass}` : 'heart--empty'}`}
            aria-hidden="true"
          >
            {i < filled ? '♥' : '♡'}
          </span>
        ))}
      </div>
    </div>
  );
}

function MuteToggle({ muted, onToggle }) {
  return (
    <button
      type="button"
      className="mute"
      aria-pressed={muted}
      aria-label={muted ? 'Unmute sounds' : 'Mute sounds'}
      onClick={onToggle}
    >
      {muted ? '🔇' : '🔈'}
    </button>
  );
}

// ── Naming screen ─────────────────────────────────────────────────────────────
function NamingScreen({ onHatch }) {
  const [name, setName] = useState('');
  const [bursting, setBursting] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const valid = validateName(name);
  const trimmed = name.trim();
  const eggStage = getEggStage(trimmed.length);

  function handleSubmit(e) {
    e?.preventDefault?.();
    if (!valid || bursting) return;
    setBursting(true);
    setTimeout(() => onHatch(trimmed), 600);
  }

  return (
    <main className="screen screen--naming" aria-labelledby="naming-title">
      <h1 id="naming-title" className="screen__title">your pet is hatching</h1>
      <div className={`egg ${bursting ? 'egg--burst' : eggStage}`} aria-hidden="true">
        🥚
      </div>
      <form className="naming__form" onSubmit={handleSubmit}>
        <label htmlFor="pet-name" className="naming__label">choose a name</label>
        <input
          id="pet-name"
          ref={inputRef}
          className="naming__input"
          type="text"
          value={name}
          maxLength={NAME_MAX}
          onChange={(e) => setName(e.target.value)}
          autoComplete="off"
          aria-describedby="name-counter"
        />
        <div className="naming__counter" id="name-counter">{trimmed.length}/{NAME_MAX}</div>
        <button
          type="submit"
          className="btn btn--primary"
          disabled={!valid}
          aria-disabled={!valid}
        >
          HATCH
        </button>
      </form>
    </main>
  );
}

// ── Pet screen ────────────────────────────────────────────────────────────────
function PetScreen({ state, setState, muted, onToggleMute, streak }) {
  const [refusing, setRefusing] = useState(false);
  const [burstPoop, setBurstPoop] = useState(false);
  const [tapping, setTapping] = useState(false);
  const [message, setMessage] = useState(null);
  const msgTimerRef = useRef(null);
  const prevStateRef = useRef(state.state);

  // Always-fresh idle action ref (avoids stale closure in recursive setTimeout)
  const idleActionRef = useRef(null);
  idleActionRef.current = () => showMessage(getIdleMessageKey(state));

  function showMessage(key) {
    if (msgTimerRef.current) clearTimeout(msgTimerRef.current);
    setMessage(pickMessage(key));
    msgTimerRef.current = setTimeout(() => setMessage(null), 2000);
  }

  // Cleanup on unmount
  useEffect(() => () => clearTimeout(msgTimerRef.current), []);

  // Idle chatter: fires every 20–40s
  useEffect(() => {
    let timerId;
    function schedule() {
      timerId = setTimeout(() => {
        idleActionRef.current?.();
        schedule();
      }, 20_000 + Math.random() * 20_000);
    }
    schedule();
    return () => clearTimeout(timerId);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // State-change messages (evolved / sick)
  useEffect(() => {
    if (prevStateRef.current !== 'evolved' && state.state === 'evolved') {
      playClip('evolve');
      showMessage('evolved');
    } else if (prevStateRef.current !== 'sick' && state.state === 'sick') {
      showMessage('sick');
    }
    prevStateRef.current = state.state;
  }, [state.state]);

  const poop = isPoopShowing(state.lastInteractedAt);
  const tier = getIdleAnimationTier(state.hunger, state.happiness, state.energy);
  const pulsing =
    state.state === 'normal' &&
    (state.hunger < 30 || state.happiness < 30 || state.energy < 30);

  // ── Action handlers ──────────────────────────────────────────────────────
  function handleFeed() {
    if (shouldRefuseFood(state.hunger)) {
      playClip('refuse');
      showMessage('refuse');
      setRefusing(true);
      setTimeout(() => setRefusing(false), 500);
      setState((s) => ({ ...s, lastInteractedAt: Date.now() }));
      return;
    }
    playClip('feed');
    showMessage('feed');
    setState((s) => evaluateState(feed(s), TICK_INTERVAL_MS));
  }

  function handlePlay() {
    playClip('play');
    setState((s) => {
      const poopActive = isPoopShowing(s.lastInteractedAt);
      const gain = poopActive ? ACTION_GAIN.play + POOP_PLAY_BONUS : ACTION_GAIN.play;
      return evaluateState(
        { ...s, happiness: clamp(s.happiness + gain, 0, 100), lastInteractedAt: Date.now() },
        TICK_INTERVAL_MS,
      );
    });
    if (poop) {
      showMessage('poop');
      setBurstPoop(true);
      setTimeout(() => setBurstPoop(false), 500);
    } else {
      showMessage('play');
    }
  }

  function handleRest() {
    playClip('rest');
    showMessage('rest');
    setState((s) => evaluateState(rest(s), TICK_INTERVAL_MS));
  }

  // ── Clickable pet (feature: tap interaction) ─────────────────────────────
  function handlePetClick() {
    playClip('poke');
    showMessage('poke');
    setTapping(true);
    setTimeout(() => setTapping(false), 400);
  }

  // ── CSS classes ──────────────────────────────────────────────────────────
  const petClasses = ['pet'];
  if (tapping) {
    petClasses.push('pet--tap'); // exclusive — suppresses other anims for 400ms
  } else {
    petClasses.push('pet--breathing');
    if (state.state === 'sick') petClasses.push('pet--sick');
    else if (state.state === 'evolved') petClasses.push('pet--evolved');
    else petClasses.push(`pet--${tier}`);
    if (pulsing) petClasses.push('pet--pulse');
    if (refusing) petClasses.push('pet--refuse');
  }

  const badge = getStateBadge(state.state, state.recoveredFromSick);
  const face = getPetFace(state.state, state.recoveredFromSick);

  return (
    <main className="screen screen--pet">
      <header className="header">
        <h1 className="header__title">{state.name}</h1>
        {streak.count > 0 && (
          <span className="streak" title={`${streak.count} day streak!`}>
            🔥{streak.count}
          </span>
        )}
        <MuteToggle muted={muted} onToggle={onToggleMute} />
      </header>

      <div className="badge" aria-live="polite">{badge}</div>

      <div className="pet-container">
        <SpeechBubble message={message} />
        <div
          className={petClasses.join(' ')}
          aria-label="pet — click to poke"
          role="button"
          tabIndex={0}
          onClick={handlePetClick}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handlePetClick(); }}
        >
          {face}
        </div>
        {poop && !burstPoop && (
          <div className="poop" aria-label="poop — play to clear">💩</div>
        )}
      </div>

      <section className="stats" aria-label="stats">
        <StatBar label="Hunger" value={state.hunger} />
        <StatBar label="Happiness" value={state.happiness} />
        <StatBar label="Energy" value={state.energy} />
      </section>

      <section className="actions" aria-label="care actions">
        <button className="btn" onClick={handleFeed}>Feed 🍖</button>
        <button className="btn" onClick={handlePlay}>Play 🎮</button>
        <button className="btn" onClick={handleRest}>Rest 💤</button>
      </section>
    </main>
  );
}

// ── Top-level App ─────────────────────────────────────────────────────────────
export default function App() {
  const [state, setState] = useState(() => {
    const loaded = loadState();
    if (!loaded) return null;
    const caughtUp = applyCatchUp(loaded, Date.now(), TICK_INTERVAL_MS);
    return evaluateState(caughtUp, TICK_INTERVAL_MS);
  });
  const [muted, setMutedState] = useState(() => isMuted());
  const [streak, setStreak] = useState(() => {
    const loaded = loadState();
    const s = loadStreak();
    if (!loaded) return s;
    return computeStreak(s, loaded);
  });

  // Tick loop
  useEffect(() => {
    if (!state) return;
    const id = setInterval(() => {
      setState((s) => {
        if (!s) return s;
        return evaluateState(applyDecay(s), TICK_INTERVAL_MS);
      });
    }, TICK_INTERVAL_MS);
    return () => clearInterval(id);
  }, [state !== null]); // eslint-disable-line react-hooks/exhaustive-deps

  // Persist + update streak on every state change
  useEffect(() => {
    if (!state) return;
    saveState(state);
    setStreak((s) => {
      const next = computeStreak(s, state);
      saveStreak(next);
      return next;
    });
  }, [state]);

  function handleHatch(name) {
    setState(createInitialState(name));
  }

  function handleToggleMute() {
    const next = !muted;
    setMuted(next);
    setMutedState(next);
  }

  if (!state) return <NamingScreen onHatch={handleHatch} />;

  return (
    <PetScreen
      state={state}
      setState={setState}
      muted={muted}
      onToggleMute={handleToggleMute}
      streak={streak}
    />
  );
}

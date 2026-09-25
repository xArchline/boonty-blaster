// Procedural music + SFX for Boonty Blaster. Web Audio API only, no files.
// Graph: [voices] -> musicBus / sfxBus -> compressor -> master (mute) -> destination.
// Every voice stops its sources and disconnects all its nodes on 'ended' (no leaks).

export type Sfx = 'fire' | 'gate' | 'pop' | 'bigPop' | 'castleHit' | 'heart' | 'win' | 'lose' | 'click' | 'newTwist';

const MUTE_KEY = 'boonty-blaster-muted';
const MUSIC_VOL = 0.18;
const MENU_VOL = 0.15;
const SFX_VOL = 0.35;
const LOOKAHEAD = 0.1; // seconds scheduled ahead
const TICK_MS = 25;

// ---------- music data ----------
type Chord = { bass: number; tones: number[] };
const CH: Record<string, Chord> = {
  C: { bass: 48, tones: [60, 64, 67] },
  G: { bass: 43, tones: [59, 62, 67] },
  Am: { bass: 45, tones: [57, 60, 64] },
  F: { bass: 41, tones: [57, 60, 65] },
  Em: { bass: 40, tones: [59, 64, 67] },
  Dm: { bass: 38, tones: [57, 62, 65] },
};

type NoteEv = { step: number; midi: number; len: number };
type Bar = { chord: Chord; mel: NoteEv[] };
type Pattern = { bpm: number; swing: number; bars: Bar[]; game: boolean };

// Melody strings: 16 chars per bar (16th notes). c..b = octave 5, C..B = octave 6,
// '.' = hold previous note, '-' = rest.
const SEMI: Record<string, number> = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 };
function parseBar(s: string): NoteEv[] {
  const out: NoteEv[] = [];
  let cur: NoteEv | null = null;
  for (let i = 0; i < 16; i++) {
    const ch = s[i] ?? '-';
    if (ch === '.') {
      if (cur) cur.len++;
      continue;
    }
    cur = null;
    if (ch === '-') continue;
    const lower = ch.toLowerCase();
    const semi = SEMI[lower];
    if (semi === undefined) continue;
    cur = { step: i, midi: (ch === lower ? 72 : 84) + semi, len: 1 };
    out.push(cur);
  }
  return out;
}
function song(rows: [string, string][]): Bar[] {
  return rows.map(([c, m]) => ({ chord: CH[c], mel: parseBar(m) }));
}

// Game track: A (C G Am F C G F G) + B (Am F C G Am F G C) = 16 bars, ~31 s at 124 BPM.
const GAME: Pattern = {
  bpm: 124,
  swing: 0.1,
  game: true,
  bars: song([
    ['C', 'g.e.g.C...b.C.g.'],
    ['G', 'd.b.d.g...f.e.d.'],
    ['Am', 'e.c.e.a...g.a.C.'],
    ['F', 'a...g.f.e...c...'],
    ['C', 'g.e.g.C...b.C.E.'],
    ['G', 'D...C.b.g...d...'],
    ['F', 'c.f.a.C.a.f.a.C.'],
    ['G', 'D...b...g..-----'],
    ['Am', 'e...e.a.C...a.e.'],
    ['F', 'f...f.a.C...D.C.'],
    ['C', 'E...D.C.g...e.g.'],
    ['G', 'b.a.g.b.D.......'],
    ['Am', 'C.b.a.e.a.b.C.E.'],
    ['F', 'F...E.D.C...a...'],
    ['G', 'b.C.D.b.g.a.b.D.'],
    ['C', 'C...g.e.c..-----'],
  ]),
};

// Menu track: calmer, sparse, no kick. 8 bars at 96 BPM.
const MENU: Pattern = {
  bpm: 96,
  swing: 0.12,
  game: false,
  bars: song([
    ['C', 'e...g...C.......'],
    ['Em', 'b...g...e.......'],
    ['F', 'a...C...a.......'],
    ['G', 'g.......d.......'],
    ['C', 'e...g...C...E...'],
    ['Am', 'C...a...e.......'],
    ['Dm', 'f...a...D.......'],
    ['G', 'b...a...g.......'],
  ]),
};

const mtof = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

// ---------- engine state ----------
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let musicBus: GainNode | null = null;
let sfxBus: GainNode | null = null;
let noise: AudioBuffer | null = null;

let muted = false;
try {
  muted = typeof localStorage !== 'undefined' && localStorage.getItem(MUTE_KEY) === '1';
} catch {
  muted = false;
}

let pattern: Pattern = GAME;
let wanted: 'game' | 'menu' | null = null; // music requested (may be before unlock)
let timer: ReturnType<typeof setInterval> | null = null;
let stopTimer: ReturnType<typeof setTimeout> | null = null;
let stepIndex = 0;
let nextTime = 0;
let intensity = 0;
let targetIntensity = 0;
const lastPlayed: Partial<Record<Sfx, number>> = {};

// ---------- voice helpers ----------
type Voice = { srcs: AudioScheduledSourceNode[]; nodes: AudioNode[] };

function newVoice(): Voice {
  return { srcs: [], nodes: [] };
}
/** Start all sources at t, stop at end, disconnect everything once the voice ends. */
function launch(v: Voice, t: number, end: number) {
  let left = v.srcs.length;
  const done = () => {
    if (--left > 0) return;
    for (const s of v.srcs) s.disconnect();
    for (const n of v.nodes) n.disconnect();
  };
  for (const s of v.srcs) {
    s.onended = done;
    s.start(t);
    s.stop(end);
  }
}
function gain(v: Voice, c: AudioContext, dest: AudioNode, value = 0): GainNode {
  const g = c.createGain();
  g.gain.value = value;
  g.connect(dest);
  v.nodes.push(g);
  return g;
}
function filt(v: Voice, c: AudioContext, dest: AudioNode, type: BiquadFilterType, freq: number, q = 0.7): BiquadFilterNode {
  const f = c.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  f.connect(dest);
  v.nodes.push(f);
  return f;
}
function osc(v: Voice, c: AudioContext, dest: AudioNode, type: OscillatorType, freq: number, detune = 0): OscillatorNode {
  const o = c.createOscillator();
  o.type = type;
  o.frequency.value = freq;
  o.detune.value = detune;
  o.connect(dest);
  v.srcs.push(o);
  return o;
}
function noiseSrc(v: Voice, c: AudioContext, dest: AudioNode): AudioBufferSourceNode {
  const s = c.createBufferSource();
  s.buffer = noise;
  s.loop = true;
  s.loopStart = Math.random() * 0.5;
  s.connect(dest);
  v.srcs.push(s);
  return s;
}
/** Percussive envelope: quick attack then exponential decay. */
function perc(g: GainNode, t: number, peak: number, attack: number, decay: number) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
}

// ---------- instruments ----------
/** Marimba-ish pluck: detuned triangles + a soft 4x "tine" partial, lowpassed. */
function pluck(dest: AudioNode, t: number, midi: number, vel: number, decay: number, bright = 3200) {
  const c = ctx!;
  const v = newVoice();
  const f = mtof(midi);
  const lp = filt(v, c, dest, 'lowpass', bright);
  const g = gain(v, c, lp);
  perc(g, t, vel, 0.004, decay);
  osc(v, c, g, 'triangle', f, -6);
  osc(v, c, g, 'triangle', f, 6);
  const tg = gain(v, c, g);
  perc(tg, t, 0.35, 0.002, 0.06);
  osc(v, c, tg, 'sine', f * 4);
  launch(v, t, t + decay + 0.05);
}
/** Soft chiptune lead layer: filtered square with a gentle filter sweep. */
function chip(dest: AudioNode, t: number, midi: number, vel: number, dur: number) {
  const c = ctx!;
  const v = newVoice();
  const lp = filt(v, c, dest, 'lowpass', 2400, 1);
  lp.frequency.setValueAtTime(2600, t);
  lp.frequency.exponentialRampToValueAtTime(900, t + dur);
  const g = gain(v, c, lp);
  perc(g, t, vel, 0.005, dur);
  osc(v, c, g, 'square', mtof(midi), 4);
  launch(v, t, t + dur + 0.03);
}
function bass(dest: AudioNode, t: number, midi: number, vel: number, dur: number) {
  const c = ctx!;
  const v = newVoice();
  const lp = filt(v, c, dest, 'lowpass', 900, 2);
  lp.frequency.setValueAtTime(1100, t);
  lp.frequency.exponentialRampToValueAtTime(260, t + dur);
  const g = gain(v, c, lp);
  perc(g, t, vel, 0.006, dur);
  osc(v, c, g, 'triangle', mtof(midi));
  const sg = gain(v, c, g, 0.35);
  osc(v, c, sg, 'sawtooth', mtof(midi), 5);
  launch(v, t, t + dur + 0.03);
}
function kick(dest: AudioNode, t: number, vel: number) {
  const c = ctx!;
  const v = newVoice();
  const g = gain(v, c, dest);
  perc(g, t, vel, 0.003, 0.22);
  const o = osc(v, c, g, 'sine', 150);
  o.frequency.setValueAtTime(150, t);
  o.frequency.exponentialRampToValueAtTime(48, t + 0.12);
  launch(v, t, t + 0.26);
}
function hat(dest: AudioNode, t: number, vel: number, decay = 0.035) {
  const c = ctx!;
  const v = newVoice();
  const hp = filt(v, c, dest, 'highpass', 7500);
  const g = gain(v, c, hp);
  perc(g, t, vel, 0.001, decay);
  noiseSrc(v, c, g);
  launch(v, t, t + decay + 0.02);
}
function clap(dest: AudioNode, t: number, vel: number) {
  const c = ctx!;
  const v = newVoice();
  const bp = filt(v, c, dest, 'bandpass', 1700, 0.9);
  const g = gain(v, c, bp);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vel, t + 0.002);
  g.gain.exponentialRampToValueAtTime(vel * 0.3, t + 0.012);
  g.gain.exponentialRampToValueAtTime(vel * 0.8, t + 0.016);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
  noiseSrc(v, c, g);
  launch(v, t, t + 0.16);
}

// ---------- scheduler ----------
function scheduleStep(idx: number, t: number) {
  const bus = musicBus!;
  const p = pattern;
  const nBars = p.bars.length;
  const barIdx = Math.floor(idx / 16);
  const bar = p.bars[barIdx % nBars];
  const pass = Math.floor(barIdx / nBars);
  const s = idx % 16;
  const stepDur = 60 / p.bpm / 4;
  const I = intensity;
  const ch = bar.chord;

  // Melody (lead)
  for (const n of bar.mel) {
    if (n.step !== s) continue;
    const len = Math.min(n.len, 6) * stepDur;
    if (p.game) {
      pluck(bus, t, n.midi, 0.32, 0.18 + len * 0.8);
      chip(bus, t, n.midi, 0.035 + 0.03 * I, Math.min(len, 0.3));
      // Odd passes / high intensity: sparkly octave-up doubling.
      if (pass % 2 === 1 || I > 0.8) pluck(bus, t, n.midi + 12, 0.08 + 0.06 * I, 0.15, 4500);
    } else {
      pluck(bus, t, n.midi, 0.3, 0.5 + len * 0.6, 2400);
    }
  }

  if (!p.game) {
    // Menu: soft chord bloom on beats 1 and 3, gentle bass, light shaker.
    if (s === 0 || s === 8) {
      ch.tones.forEach((m, i) => pluck(bus, t + i * 0.03, m, 0.1, 0.9, 1800));
    }
    if (s === 0) bass(bus, t, ch.bass, 0.3, 0.9);
    if (s === 10) bass(bus, t, ch.bass + 7, 0.18, 0.3);
    if (s % 4 === 2) hat(bus, t, 0.05, 0.03);
    return;
  }

  // Drums
  if (s === 0 || s === 8) kick(bus, t, 0.55 + 0.2 * I);
  if (I > 0.6 && s === 11) kick(bus, t, 0.4);
  if (I > 0.25 && (s === 4 || s === 12)) clap(bus, t, 0.18 + 0.12 * I);
  if (I > 0.12 && s % 4 === 2) hat(bus, t, 0.08 + 0.06 * I);
  if (I > 0.7 && s % 2 === 1) hat(bus, t, 0.035 + 0.03 * (I - 0.7) / 0.3, 0.02);

  // Bass: bouncy root / octave / fifth
  const bassPat: Record<number, number> = I > 0.4 ? { 0: 0, 3: 12, 6: 0, 8: 0, 11: 12, 14: 7 } : { 0: 0, 8: 0, 14: 7 };
  const bn = bassPat[s];
  if (bn !== undefined) bass(bus, t, ch.bass + bn, 0.34 + 0.08 * I, stepDur * 1.8);

  // Chord stabs on off-beats (lighter at low intensity)
  if (s === 2 || s === 10 || (I > 0.3 && (s === 6 || s === 14))) {
    for (const m of ch.tones) pluck(bus, t, m, 0.06 + 0.03 * I, 0.14, 2000);
  }

  // Arp layer at higher intensity: 16th chord tones, two octaves.
  if (I > 0.5) {
    const tones = [...ch.tones, ...ch.tones.map((m) => m + 12)];
    const m = tones[(s * 3 + barIdx) % tones.length] + 12;
    chip(bus, t, m, 0.02 + 0.035 * (I - 0.5) / 0.5, 0.08);
  }
}

function tick() {
  const c = ctx;
  if (!c || c.state !== 'running') return;
  const now = c.currentTime;
  if (nextTime < now) nextTime = now + 0.03; // fell behind (tab throttled): resync
  while (nextTime < now + LOOKAHEAD) {
    const stepDur = 60 / pattern.bpm / 4;
    intensity += (targetIntensity - intensity) * 0.08;
    const swing = stepIndex % 2 === 1 ? pattern.swing * stepDur : 0;
    if (!muted) scheduleStep(stepIndex, nextTime + swing);
    stepIndex++;
    nextTime += stepDur;
  }
}

function busLevel() {
  return wanted === 'menu' ? MENU_VOL : MUSIC_VOL;
}

function ensureRunning() {
  if (!ctx || !musicBus || !wanted) return;
  if (stopTimer) {
    clearTimeout(stopTimer);
    stopTimer = null;
  }
  const t = ctx.currentTime;
  musicBus.gain.cancelScheduledValues(t);
  musicBus.gain.setValueAtTime(musicBus.gain.value, t);
  musicBus.gain.linearRampToValueAtTime(busLevel(), t + 0.3);
  if (!timer) {
    nextTime = ctx.currentTime + 0.05;
    timer = setInterval(tick, TICK_MS);
    tick();
  }
}

function switchPattern(p: Pattern) {
  if (pattern === p) return;
  pattern = p;
  stepIndex = 0;
  intensity = targetIntensity;
  if (ctx && musicBus && timer) {
    const t = ctx.currentTime;
    musicBus.gain.cancelScheduledValues(t);
    musicBus.gain.setValueAtTime(0.0001, t);
    nextTime = t + 0.06;
  }
}

// ---------- SFX ----------
const THROTTLE: Record<Sfx, number> = {
  fire: 0.06,
  pop: 0.05,
  bigPop: 0.08,
  castleHit: 0.085,
  gate: 0.06,
  heart: 0.15,
  click: 0.04,
  win: 0.5,
  lose: 0.5,
  newTwist: 0.4,
};

function sfx(name: Sfx, t: number, p: number) {
  const c = ctx!;
  const bus = sfxBus!;
  switch (name) {
    case 'fire': {
      // Tiny soft "pip"
      const v = newVoice();
      const g = gain(v, c, bus);
      perc(g, t, 0.09, 0.003, 0.035);
      const o = osc(v, c, g, 'sine', 1100 * p);
      const f = 1100 * p * (0.97 + Math.random() * 0.06);
      o.frequency.setValueAtTime(f, t);
      o.frequency.exponentialRampToValueAtTime(f * 1.4, t + 0.03);
      launch(v, t, t + 0.05);
      break;
    }
    case 'pop': {
      // Bubbly blip, slightly randomized
      const v = newVoice();
      const r = p * (0.88 + Math.random() * 0.28);
      const g = gain(v, c, bus);
      perc(g, t, 0.28, 0.002, 0.07);
      const o = osc(v, c, g, 'sine', 420 * r);
      o.frequency.setValueAtTime(420 * r, t);
      o.frequency.exponentialRampToValueAtTime(980 * r, t + 0.045);
      const tg = gain(v, c, bus);
      perc(tg, t, 0.06, 0.001, 0.03);
      osc(v, c, tg, 'triangle', 1800 * r);
      launch(v, t, t + 0.09);
      break;
    }
    case 'bigPop': {
      const v = newVoice();
      const g = gain(v, c, bus);
      perc(g, t, 0.5, 0.003, 0.28);
      const o = osc(v, c, g, 'sine', 320 * p);
      o.frequency.setValueAtTime(320 * p, t);
      o.frequency.exponentialRampToValueAtTime(90 * p, t + 0.25);
      const lp = filt(v, c, bus, 'lowpass', 1400);
      const ng = gain(v, c, lp);
      perc(ng, t, 0.35, 0.002, 0.15);
      noiseSrc(v, c, ng);
      const sg = gain(v, c, bus);
      perc(sg, t + 0.04, 0.12, 0.003, 0.2);
      osc(v, c, sg, 'triangle', 1320 * p);
      launch(v, t, t + 0.33);
      break;
    }
    case 'castleHit': {
      const v = newVoice();
      const g = gain(v, c, bus);
      perc(g, t, 0.22, 0.002, 0.08);
      const o = osc(v, c, g, 'triangle', 200 * p);
      o.frequency.setValueAtTime(220 * p, t);
      o.frequency.exponentialRampToValueAtTime(110 * p, t + 0.07);
      const bp = filt(v, c, bus, 'bandpass', 900 * p, 1.2);
      const ng = gain(v, c, bp);
      perc(ng, t, 0.1, 0.001, 0.035);
      noiseSrc(v, c, ng);
      launch(v, t, t + 0.1);
      break;
    }
    case 'gate': {
      // Sparkly two-note bell ding
      [0, 0.055].forEach((dt, i) => {
        const v = newVoice();
        const f = (i === 0 ? 1318.5 : 1975.5) * p;
        const g = gain(v, c, bus);
        perc(g, t + dt, 0.16, 0.002, 0.35);
        osc(v, c, g, 'sine', f);
        const pg = gain(v, c, bus);
        perc(pg, t + dt, 0.05, 0.001, 0.12);
        osc(v, c, pg, 'sine', f * 2.76);
        launch(v, t + dt, t + dt + 0.4);
      });
      break;
    }
    case 'heart': {
      // Negative buzzy thud
      const v = newVoice();
      const lp = filt(v, c, bus, 'lowpass', 700, 3);
      lp.frequency.setValueAtTime(900, t);
      lp.frequency.exponentialRampToValueAtTime(200, t + 0.35);
      const g = gain(v, c, lp);
      perc(g, t, 0.45, 0.005, 0.38);
      const o = osc(v, c, g, 'sawtooth', 140 * p);
      o.frequency.setValueAtTime(140 * p, t);
      o.frequency.exponentialRampToValueAtTime(65 * p, t + 0.35);
      const o2 = osc(v, c, g, 'sawtooth', 141.5 * p, -30);
      o2.frequency.setValueAtTime(141.5 * p, t);
      o2.frequency.exponentialRampToValueAtTime(66 * p, t + 0.35);
      const tg = gain(v, c, bus);
      perc(tg, t, 0.5, 0.003, 0.2);
      const th = osc(v, c, tg, 'sine', 90 * p);
      th.frequency.setValueAtTime(90 * p, t);
      th.frequency.exponentialRampToValueAtTime(40 * p, t + 0.18);
      launch(v, t, t + 0.42);
      break;
    }
    case 'click': {
      const v = newVoice();
      const g = gain(v, c, bus);
      perc(g, t, 0.18, 0.002, 0.04);
      const o = osc(v, c, g, 'triangle', 1050 * p);
      o.frequency.setValueAtTime(1050 * p, t);
      o.frequency.exponentialRampToValueAtTime(760 * p, t + 0.035);
      launch(v, t, t + 0.06);
      break;
    }
    case 'win': {
      // C E G -> C' chord with sparkles (~1.5 s)
      const seq = [72, 76, 79];
      seq.forEach((m, i) => {
        const tt = t + i * 0.1;
        pluck(bus, tt, m + 12 * Math.log2(p), 0.35, 0.25, 4000);
        chip(bus, tt, m + 12 * Math.log2(p), 0.07, 0.12);
      });
      const tc = t + 0.32;
      [72, 76, 79, 84].forEach((m) => pluck(bus, tc, m + 12 * Math.log2(p), 0.22, 1.1, 3500));
      chip(bus, tc, 84 + 12 * Math.log2(p), 0.08, 0.9);
      [96, 100, 103, 108].forEach((m, i) => pluck(bus, tc + 0.15 + i * 0.07, m, 0.06, 0.3, 6000));
      break;
    }
    case 'lose': {
      // Gentle descending "aww" with vibrato (~1.2 s)
      const v = newVoice();
      const lp = filt(v, c, bus, 'lowpass', 1300, 1);
      const g = gain(v, c, lp);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.28, t + 0.04);
      g.gain.setValueAtTime(0.28, t + 0.7);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 1.2);
      const o1 = osc(v, c, g, 'triangle', mtof(67) * p);
      const sg = gain(v, c, g, 0.25); // saw layer at low level
      const o2 = osc(v, c, sg, 'sawtooth', mtof(67) * p, 8);
      for (const o of [o1, o2]) {
        o.frequency.setValueAtTime(mtof(67) * p, t);
        o.frequency.setValueAtTime(mtof(67) * p, t + 0.22);
        o.frequency.exponentialRampToValueAtTime(mtof(64) * p, t + 0.3);
        o.frequency.setValueAtTime(mtof(64) * p, t + 0.5);
        o.frequency.exponentialRampToValueAtTime(mtof(60) * p, t + 0.58);
        o.frequency.exponentialRampToValueAtTime(mtof(55) * p, t + 1.2);
      }
      // Vibrato
      const depth = c.createGain();
      depth.gain.value = 6;
      depth.connect(o1.frequency);
      depth.connect(o2.frequency);
      v.nodes.push(depth);
      osc(v, c, depth, 'sine', 5.5);
      launch(v, t, t + 1.25);
      break;
    }
    case 'newTwist': {
      // "Ta-da!" sting
      const k = 12 * Math.log2(p);
      pluck(bus, t, 79 + k, 0.3, 0.12, 4000);
      chip(bus, t, 79 + k, 0.07, 0.08);
      const t2 = t + 0.13;
      [84, 88, 91].forEach((m) => pluck(bus, t2, m + k, 0.2, 0.7, 4000));
      chip(bus, t2, 96 + k, 0.05, 0.5);
      const v = newVoice();
      const hp = filt(v, c, bus, 'highpass', 6000);
      const g = gain(v, c, hp);
      perc(g, t2, 0.08, 0.01, 0.5);
      noiseSrc(v, c, g);
      launch(v, t2, t2 + 0.55);
      break;
    }
  }
}

// ---------- public API ----------
function applyMute() {
  if (!ctx || !master) return;
  const t = ctx.currentTime;
  master.gain.cancelScheduledValues(t);
  master.gain.setValueAtTime(master.gain.value, t);
  master.gain.linearRampToValueAtTime(muted ? 0 : 1, t + 0.08);
}

export const audio = {
  unlock(): void {
    try {
      if (!ctx) {
        const AC =
          window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!AC) return;
        ctx = new AC();
        const comp = ctx.createDynamicsCompressor();
        comp.threshold.value = -12;
        comp.knee.value = 8;
        comp.ratio.value = 4;
        comp.attack.value = 0.004;
        comp.release.value = 0.2;
        master = ctx.createGain();
        master.gain.value = muted ? 0 : 1;
        comp.connect(master);
        master.connect(ctx.destination);
        musicBus = ctx.createGain();
        musicBus.gain.value = 0;
        musicBus.connect(comp);
        sfxBus = ctx.createGain();
        sfxBus.gain.value = SFX_VOL;
        sfxBus.connect(comp);
        const len = ctx.sampleRate;
        noise = ctx.createBuffer(1, len, ctx.sampleRate);
        const d = noise.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
        // iOS: play one silent buffer inside the gesture to fully unlock.
        const s = ctx.createBufferSource();
        s.buffer = ctx.createBuffer(1, 1, ctx.sampleRate);
        s.connect(ctx.destination);
        s.onended = () => s.disconnect();
        s.start();
        document.addEventListener('visibilitychange', () => {
          if (!ctx) return;
          if (document.hidden) void ctx.suspend().catch(() => {});
          else void ctx.resume().catch(() => {});
        });
      }
      if (ctx.state !== 'running') void ctx.resume().catch(() => {});
      if (wanted) ensureRunning();
    } catch {
      // Audio unavailable: stay silent.
    }
  },

  play(name: Sfx, opts?: { pitch?: number }): void {
    if (!ctx || muted || ctx.state !== 'running') return;
    const now = ctx.currentTime;
    const last = lastPlayed[name];
    if (last !== undefined && now - last < THROTTLE[name]) return;
    lastPlayed[name] = now;
    const p = opts?.pitch && opts.pitch > 0 ? opts.pitch : 1;
    try {
      sfx(name, now + 0.005, p);
    } catch {
      // ignore
    }
  },

  startMusic(intensityValue?: number): void {
    if (intensityValue !== undefined) audio.setIntensity(intensityValue);
    wanted = 'game';
    switchPattern(GAME);
    ensureRunning();
  },

  setIntensity(v: number): void {
    targetIntensity = Math.max(0, Math.min(1, Number.isFinite(v) ? v : 0));
  },

  stopMusic(): void {
    wanted = null;
    if (!ctx || !musicBus) return;
    const t = ctx.currentTime;
    musicBus.gain.cancelScheduledValues(t);
    musicBus.gain.setValueAtTime(musicBus.gain.value, t);
    musicBus.gain.linearRampToValueAtTime(0, t + 0.4);
    if (stopTimer) clearTimeout(stopTimer);
    stopTimer = setTimeout(() => {
      stopTimer = null;
      if (wanted) return;
      if (timer) clearInterval(timer);
      timer = null;
    }, 450);
  },

  menuMusic(): void {
    wanted = 'menu';
    switchPattern(MENU);
    ensureRunning();
  },

  get muted(): boolean {
    return muted;
  },

  toggleMute(): boolean {
    muted = !muted;
    try {
      localStorage.setItem(MUTE_KEY, muted ? '1' : '0');
    } catch {
      // storage unavailable
    }
    applyMute();
    return muted;
  },
};

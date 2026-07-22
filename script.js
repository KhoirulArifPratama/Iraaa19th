/* =============================================================
   script.js — Birthday Website Logic
   =============================================================
   ⚠️ PENGATURAN LOGIN — GANTI USERNAME & PASSWORD DI SINI:
   ============================================================= */
const CONFIG = {
  username: "humaira",       // ← Ganti username di sini
  password: "23-07-2026",     // ← Ganti password di sini (misalnya tanggal lahir)
};

/* =============================================================
   SURAT CINTA — GANTI ISI SURAT DI SINI:
   ============================================================= */
const LOVE_LETTER = `Happy birthday to the person who makes the world feel a little softer. I pray that this new chapter of your life is paved with clarity, continuous growth, and a love that never makes you question your worth. I’m incredibly proud of who you are.`;

/* =============================================================
   KARTU UCAPAN — GANTI ISI KARTU DI SINI:
   ============================================================= */
const GREETING_CARD_TEXT = `For my dearest Humaira,

Happy birthday to my beautiful girl, you deserve the absolute world an i'il always love you.you never gave up on me an for that i am forever grateful and i will never give up on you i promise you that,i'm thank ful to have a girlfriend like you.

Once again happy birthday, Humaira🤍`;

/* =============================================================
   MASCOT SPEECH QUOTES
   ============================================================= */
const MASCOT_QUOTES = [
  "Hai Sayang! Selamat Ulang Tahun! 🎂💕",
  "Kamu orang tercantik sedunia! 🥰✨",
  "Meow~ Hari ini hari spesialmu! 🌸",
  "Mimi lapar nih, kasih makan dong... 🐟",
  "Semoga bahagia terus ya! 💖",
  "Jangan lupa tiup lilinnya! 🕯️🍰",
  "Mimi sayang kamu! ⭐🐾",
  "Hehe, geli diklik terus! 😸",
];

/* =============================================================
   STATE
   ============================================================= */
let gameScore = 0;
let isFeeding = false;
let blownCandles = new Set();
let isTyping = false;
let envelopeOpened = false;
let countdownActive = false;
let countdownTimer = null;
let typingTimer = null;
let catExpressionTimer = null;

/* ---- GIFT BOX STATE ---- */
let giftClickCount = 0;
let giftAutoMoveInterval = null;

/* ---- KARTU UCAPAN (POPUP) STATE ---- */
let envelopeCardOpened = false;
let isCardTyping = false;

/* ---- FLOWER GARDEN STATE ---- */
let gardenActive = false;
let gardenSpawnInterval = null;
let stemStates = [];
const FLOWER_TYPES = ['🌸', '🌸', '🌸', '🌸', '🌸'];
const TOTAL_STEMS = 15;

/* =============================================================
   WEB AUDIO SYNTHESIZER (BUILT-IN MUSIC BOX)
   ============================================================= */
let audioCtx = null;
let melodyPlaying = false;
let melodyTimer = null;
let melodyTime = 0;
let melodyIdx = 0;

const MELODY = [
  { f: 261.63, d: 0.55 }, { f: 329.63, d: 0.55 },
  { f: 392.00, d: 0.55 }, { f: 493.88, d: 0.55 },
  { f: 523.25, d: 0.55 }, { f: 493.88, d: 0.55 },
  { f: 392.00, d: 0.55 }, { f: 329.63, d: 0.55 },
  { f: 349.23, d: 0.55 }, { f: 440.00, d: 0.55 },
  { f: 523.25, d: 0.55 }, { f: 659.25, d: 0.55 },
  { f: 523.25, d: 0.55 }, { f: 440.00, d: 0.55 },
  { f: 349.23, d: 0.55 }, { f: 440.00, d: 0.55 },
  { f: 392.00, d: 0.55 }, { f: 493.88, d: 0.55 },
  { f: 587.33, d: 0.55 }, { f: 659.25, d: 0.55 },
  { f: 587.33, d: 0.55 }, { f: 493.88, d: 0.55 },
  { f: 392.00, d: 0.55 }, { f: 493.88, d: 0.55 },
  { f: 261.63, d: 0.55 }, { f: 329.63, d: 0.55 },
  { f: 392.00, d: 0.55 }, { f: 523.25, d: 0.55 },
  { f: 659.25, d: 1.1 }, { f: 0, d: 0.55 },
];

function initAudio() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') audioCtx.resume();
}

function playNote(freq, time, dur) {
  if (!audioCtx || freq === 0) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  const filt = audioCtx.createBiquadFilter();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(freq, time);
  filt.type = 'lowpass';
  filt.frequency.setValueAtTime(1400, time);
  gain.gain.setValueAtTime(0, time);
  gain.gain.linearRampToValueAtTime(0.1, time + 0.04);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + dur);
  osc.connect(filt);
  filt.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start(time);
  osc.stop(time + dur);
}

function melodyScheduler() {
  while (melodyTime < audioCtx.currentTime + 0.12) {
    const n = MELODY[melodyIdx];
    playNote(n.f, melodyTime, n.d);
    melodyTime += n.d;
    melodyIdx = (melodyIdx + 1) % MELODY.length;
  }
  melodyTimer = setTimeout(melodyScheduler, 30);
}

function startMelody() {
  initAudio();
  if (melodyPlaying) return;
  melodyPlaying = true;
  melodyTime = audioCtx.currentTime;
  melodyIdx = 0;
  melodyScheduler();
  const btn = document.getElementById('btn-melody-toggle');
  if (btn) { btn.textContent = '⏸️ Pause Melody'; btn.classList.add('playing'); }
}

function stopMelody() {
  if (!melodyPlaying) return;
  melodyPlaying = false;
  clearTimeout(melodyTimer);
  const btn = document.getElementById('btn-melody-toggle');
  if (btn) { btn.textContent = '▶️ Play Melody'; btn.classList.remove('playing'); }
}

function playSfx(type) {
  if (!audioCtx) return;
  initAudio();
  const t = audioCtx.currentTime;
  if (type === 'eat') {
    playNote(523.25, t, 0.15);
    playNote(659.25, t + 0.08, 0.15);
    playNote(783.99, t + 0.16, 0.25);
  } else if (type === 'blow') {
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.frequency.setValueAtTime(120, t);
    o.frequency.exponentialRampToValueAtTime(30, t + 0.25);
    g.gain.setValueAtTime(0.15, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
    o.connect(g); g.connect(audioCtx.destination);
    o.start(t); o.stop(t + 0.25);
  } else if (type === 'win') {
    [523.25, 587.33, 659.25, 698.46, 783.99, 880, 987.77, 1046.5].forEach((f, i) => {
      playNote(f, t + i * 0.08, 0.12);
    });
  } else if (type === 'click') {
    playNote(880, t, 0.08);
  } else if (type === 'keypad') {
    initAudio();
    const notes = [523.25, 587.33, 659.25, 698.46, 783.99, 880];
    const f = notes[Math.floor(Math.random() * notes.length)];
    playNote(f, t, 0.08);
  } else if (type === 'typewriter') {
    const bufferSize = Math.floor(audioCtx.sampleRate * 0.035);
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.25));
    }
    const noise = audioCtx.createBufferSource();
    noise.buffer = buffer;
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(2400 + Math.random() * 600, t);
    filter.Q.setValueAtTime(2.5, t);
    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.035);
    noise.connect(filter); filter.connect(gain); gain.connect(audioCtx.destination);
    noise.start(t); noise.stop(t + 0.035);
  } else if (type === 'bonk') {
    // Soft comedic "bonk" thud for the Mimi Run game's game-over collision
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(220, t);
    o.frequency.exponentialRampToValueAtTime(70, t + 0.22);
    g.gain.setValueAtTime(0.22, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.24);
    o.connect(g); g.connect(audioCtx.destination);
    o.start(t); o.stop(t + 0.24);
  } else if (type === 'jump') {
    // "Twing!" — bright metallic bell sweep that cuts through background music
    // Main pitch sweep: starts high and rises even higher (spring-boing feel)
    const o1 = audioCtx.createOscillator();
    const g1 = audioCtx.createGain();
    o1.type = 'sine';
    o1.frequency.setValueAtTime(900, t);
    o1.frequency.exponentialRampToValueAtTime(1800, t + 0.12);
    o1.frequency.exponentialRampToValueAtTime(1400, t + 0.28);
    g1.gain.setValueAtTime(0, t);
    g1.gain.linearRampToValueAtTime(0.45, t + 0.015);
    g1.gain.exponentialRampToValueAtTime(0.001, t + 0.32);
    o1.connect(g1); g1.connect(audioCtx.destination);
    o1.start(t); o1.stop(t + 0.34);

    // Harmonic shimmer (octave above) — gives the "twing" sparkle
    const o2 = audioCtx.createOscillator();
    const g2 = audioCtx.createGain();
    o2.type = 'triangle';
    o2.frequency.setValueAtTime(1800, t);
    o2.frequency.exponentialRampToValueAtTime(3200, t + 0.10);
    g2.gain.setValueAtTime(0, t);
    g2.gain.linearRampToValueAtTime(0.22, t + 0.012);
    g2.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
    o2.connect(g2); g2.connect(audioCtx.destination);
    o2.start(t); o2.stop(t + 0.24);

    // Tiny metallic click transient at the very start for punch
    const o3 = audioCtx.createOscillator();
    const g3 = audioCtx.createGain();
    o3.type = 'square';
    o3.frequency.setValueAtTime(2200, t);
    o3.frequency.exponentialRampToValueAtTime(400, t + 0.025);
    g3.gain.setValueAtTime(0.18, t);
    g3.gain.exponentialRampToValueAtTime(0.001, t + 0.03);
    o3.connect(g3); g3.connect(audioCtx.destination);
    o3.start(t); o3.stop(t + 0.035);
  }
}

/* =============================================================
   LOADER CHIME — sweet sparkle sound played on page transition
   ============================================================= */
function playLoaderChime() {
  if (!audioCtx) return;
  initAudio();
  const t = audioCtx.currentTime;
  // Rising sparkle arpeggio: C5 → E5 → G5 → B5 → D6
  const notes = [523.25, 659.25, 783.99, 987.77, 1174.66];
  notes.forEach((freq, i) => {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    const when = t + i * 0.09;
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, when);
    gain.gain.setValueAtTime(0, when);
    gain.gain.linearRampToValueAtTime(0.13, when + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + 0.38);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(when);
    osc.stop(when + 0.4);
  });
  // Soft shimmer undertone
  const shimOsc = audioCtx.createOscillator();
  const shimGain = audioCtx.createGain();
  shimOsc.type = 'sine';
  shimOsc.frequency.setValueAtTime(1046.5, t);
  shimOsc.frequency.exponentialRampToValueAtTime(2093, t + 0.55);
  shimGain.gain.setValueAtTime(0, t);
  shimGain.gain.linearRampToValueAtTime(0.07, t + 0.05);
  shimGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
  shimOsc.connect(shimGain);
  shimGain.connect(audioCtx.destination);
  shimOsc.start(t);
  shimOsc.stop(t + 0.6);
}

/* =============================================================
   CANDLE FANFARE — richer "ta-da!" chord + sparkle cascade,
   played once every candle on the cake has been blown out.
   ============================================================= */
function playCandleFanfare() {
  if (!audioCtx) return;
  initAudio();
  const t = audioCtx.currentTime;

  // Two warm chord stabs (a little "ta-da!" swell)
  [523.25, 659.25, 783.99].forEach((f) => playNote(f, t, 0.3));
  [587.33, 739.99, 880.00, 1174.66].forEach((f) => playNote(f, t + 0.26, 0.7));

  // Sparkling ascending cascade landing on top of the chord
  [1046.5, 1174.66, 1318.51, 1567.98, 1760].forEach((f, i) => {
    playNote(f, t + 0.55 + i * 0.075, 0.4);
  });

  // Soft shimmer tail so it settles nicely instead of cutting off
  const shimOsc = audioCtx.createOscillator();
  const shimGain = audioCtx.createGain();
  shimOsc.type = 'sine';
  shimOsc.frequency.setValueAtTime(2093, t + 0.55);
  shimGain.gain.setValueAtTime(0, t + 0.55);
  shimGain.gain.linearRampToValueAtTime(0.05, t + 0.62);
  shimGain.gain.exponentialRampToValueAtTime(0.0001, t + 1.4);
  shimOsc.connect(shimGain);
  shimGain.connect(audioCtx.destination);
  shimOsc.start(t + 0.55);
  shimOsc.stop(t + 1.45);
}
window.playCandleFanfare = playCandleFanfare;

/* =============================================================
   BALLOON POP — quick filtered noise burst + pitch-drop click,
   played each time a balloon on the cake page pops.
   ============================================================= */
function playBalloonPop() {
  if (!audioCtx) return;
  initAudio();
  const t = audioCtx.currentTime;

  // Noisy "pop" body
  const dur = 0.14;
  const bufferSize = Math.floor(audioCtx.sampleRate * dur);
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2);
  }
  const noise = audioCtx.createBufferSource();
  noise.buffer = buffer;
  const bp = audioCtx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.Q.value = 1.1;
  bp.frequency.setValueAtTime(1900 + Math.random() * 400, t);
  bp.frequency.exponentialRampToValueAtTime(450, t + dur);
  const noiseGain = audioCtx.createGain();
  noiseGain.gain.setValueAtTime(0.32, t);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, t + dur);
  noise.connect(bp);
  bp.connect(noiseGain);
  noiseGain.connect(audioCtx.destination);
  noise.start(t);
  noise.stop(t + dur);

  // Bright transient click on top for a satisfying "snap"
  const o = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  o.type = 'triangle';
  o.frequency.setValueAtTime(950 + Math.random() * 250, t);
  o.frequency.exponentialRampToValueAtTime(140, t + 0.09);
  g.gain.setValueAtTime(0.22, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
  o.connect(g);
  g.connect(audioCtx.destination);
  o.start(t);
  o.stop(t + 0.1);
}
window.playBalloonPop = playBalloonPop;

/* =============================================================
   GALAXY TRANSITION WHOOSH — a rising, filtered-noise "whoosh"
   with a sparkling burst at the end, synced to the heart
   exploding into the galaxy spiral on the Galaksi page.
   ============================================================= */
function playGalaxyTransition(duration = 3.2) {
  if (!audioCtx) return;
  initAudio();
  const t = audioCtx.currentTime;

  // Filtered noise sweep — low rumble opening up into a bright whoosh
  const bufferSize = Math.floor(audioCtx.sampleRate * duration);
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
  const noise = audioCtx.createBufferSource();
  noise.buffer = buffer;
  const bp = audioCtx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.Q.value = 0.7;
  bp.frequency.setValueAtTime(180, t);
  bp.frequency.exponentialRampToValueAtTime(3200, t + duration * 0.85);
  const noiseGain = audioCtx.createGain();
  noiseGain.gain.setValueAtTime(0, t);
  noiseGain.gain.linearRampToValueAtTime(0.085, t + duration * 0.55);
  noiseGain.gain.linearRampToValueAtTime(0, t + duration);
  noise.connect(bp);
  bp.connect(noiseGain);
  noiseGain.connect(audioCtx.destination);
  noise.start(t);
  noise.stop(t + duration);

  // Rising sine "riser" underneath, builds anticipation
  const riser = audioCtx.createOscillator();
  const riserGain = audioCtx.createGain();
  riser.type = 'sine';
  riser.frequency.setValueAtTime(170, t);
  riser.frequency.exponentialRampToValueAtTime(1100, t + duration * 0.9);
  riserGain.gain.setValueAtTime(0, t);
  riserGain.gain.linearRampToValueAtTime(0.045, t + duration * 0.6);
  riserGain.gain.linearRampToValueAtTime(0, t + duration);
  riser.connect(riserGain);
  riserGain.connect(audioCtx.destination);
  riser.start(t);
  riser.stop(t + duration);

  // Sparkling chime burst right as the galaxy blooms into view
  const burstTime = t + duration * 0.86;
  [880, 1108.73, 1318.51, 1760, 2217.46].forEach((f, i) => {
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(f, burstTime);
    g.gain.setValueAtTime(0, burstTime);
    g.gain.linearRampToValueAtTime(0.085, burstTime + 0.03 + i * 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, burstTime + 0.9 + i * 0.05);
    o.connect(g);
    g.connect(audioCtx.destination);
    o.start(burstTime);
    o.stop(burstTime + 1.0);
  });
}
window.playGalaxyTransition = playGalaxyTransition;

let particlesInterval = null;

// Star size classes and their base durations (seconds)
const STAR_TYPES = [
  { cls: 'star-tiny', minDur: 9, maxDur: 13, weight: 5 },
  { cls: 'star-sm', minDur: 8, maxDur: 12, weight: 4 },
  { cls: 'star-md', minDur: 11, maxDur: 16, weight: 2 },
  { cls: 'star-lg', minDur: 13, maxDur: 18, weight: 1 },
];

// Build weighted pool for random selection
const STAR_POOL = [];
STAR_TYPES.forEach(t => { for (let i = 0; i < t.weight; i++) STAR_POOL.push(t); });

function spawnStar(container) {
  const type = STAR_POOL[Math.floor(Math.random() * STAR_POOL.length)];
  const el = document.createElement('div');
  el.className = 'particle ' + type.cls;
  el.style.left = (Math.random() * 100) + '%';
  const dur = type.minDur + Math.random() * (type.maxDur - type.minDur);
  el.style.animationDuration = dur.toFixed(1) + 's';
  el.style.animationDelay = -(Math.random() * dur).toFixed(1) + 's'; // random phase start
  // Slight random opacity twinkle via inline animation override
  el.style.setProperty('--twinkle', (0.6 + Math.random() * 0.4).toFixed(2));
  container.appendChild(el);
  // Remove after one full cycle + delay buffer
  setTimeout(() => el.remove(), (dur + 2) * 1000);
}

function initParticles() {
  if (particlesInterval) return;
  const container = document.getElementById('bg-particles');
  if (!container) return;
  // Seed initial batch so screen isn't empty on load
  for (let i = 0; i < 18; i++) spawnStar(container);
  // Continuously spawn new stars
  particlesInterval = setInterval(() => {
    spawnStar(container);
  }, 600);
}

function stopParticles() {
  if (particlesInterval) {
    clearInterval(particlesInterval);
    particlesInterval = null;
  }
  const container = document.getElementById('bg-particles');
  if (container) container.innerHTML = '';
}

/* =============================================================
   PAGE FLOW SYSTEM — Tanggal → Foto → Kartu → Kue → Kucing →
   Galaksi → Ucapan Terakhir → Finish, one page at a time via "Lanjut"
   ============================================================= */
const FLOW_PAGES = [
  'page-tanggal', 'page-kartu', 'page-kue', 'page-video',
  'page-galaksi', 'page-kucing', 'page-ucapan-akhir', 'page-finish'
];
const LOADER_MESSAGES = {
  'page-tanggal': 'Galery... ',
  'page-kartu': 'Greeting card... ',
  'page-kue': 'Cake Birthday... ',
  'page-video': 'Abang Run... ',
  'page-galaksi': 'Galaxy... ',
  'page-kucing': 'Feeding abang... ',
  'page-ucapan-akhir': 'Last message... ',
  'page-finish': 'Last page... '
};

let currentFlowIndex = 0;

function goToFlowPage(index, opts) {
  opts = opts || {};
  if (index < 0 || index >= FLOW_PAGES.length) return;
  currentFlowIndex = index;

  const loader = document.getElementById('page-loader');
  const loaderText = document.getElementById('loader-text');

  function executeTransition() {
    FLOW_PAGES.forEach((id, i) => {
      const el = document.getElementById(id);
      if (el) el.classList.toggle('active-page', i === index);
    });

    document.querySelectorAll('.flow-dot').forEach((dot, i) => {
      dot.classList.toggle('active', i === index);
      dot.classList.toggle('done', i < index);
    });

    if (!opts.silent) window.scrollTo({ top: 0, behavior: 'auto' });

    // Music swap: special music per page, restore original elsewhere
    // Skip entirely when caller sets noMusic (e.g. logout)
    if (!opts.noMusic) {
      const customAudio = document.getElementById('custom-audio');
      const cakeAudio = document.getElementById('cake-audio');
      const galaxyAudio = document.getElementById('galaxy-audio');
      const gameAudio = document.getElementById('game-audio');

      // Helper: stop all special audio
      function stopSpecialAudio() {
        [cakeAudio, galaxyAudio, gameAudio].forEach(a => {
          if (a && !a.paused) { a.pause(); a.currentTime = 0; }
        });
      }

      if (FLOW_PAGES[index] === 'page-kue') {
        // Pause main + galaxy + game, play cake music
        if (customAudio && !customAudio.paused) customAudio.pause();
        if (galaxyAudio && !galaxyAudio.paused) { galaxyAudio.pause(); galaxyAudio.currentTime = 0; }
        if (gameAudio && !gameAudio.paused) { gameAudio.pause(); gameAudio.currentTime = 0; }
        if (cakeAudio) {
          cakeAudio.currentTime = 0;
          cakeAudio.play().catch(err => console.log('Cake music blocked:', err));
        }
      } else if (FLOW_PAGES[index] === 'page-galaksi') {
        // Pause main + cake + game, play galaxy music
        if (customAudio && !customAudio.paused) customAudio.pause();
        if (cakeAudio && !cakeAudio.paused) { cakeAudio.pause(); cakeAudio.currentTime = 0; }
        if (gameAudio && !gameAudio.paused) { gameAudio.pause(); gameAudio.currentTime = 0; }
        if (galaxyAudio) {
          galaxyAudio.currentTime = 0;
          galaxyAudio.play().catch(err => console.log('Galaxy music blocked:', err));
        }
      } else if (FLOW_PAGES[index] === 'page-video') {
        // Pause main + cake + galaxy — game music will start on cover button click
        if (customAudio && !customAudio.paused) customAudio.pause();
        if (cakeAudio && !cakeAudio.paused) { cakeAudio.pause(); cakeAudio.currentTime = 0; }
        if (galaxyAudio && !galaxyAudio.paused) { galaxyAudio.pause(); galaxyAudio.currentTime = 0; }
        // Do NOT auto-play gameAudio here; it starts when user clicks "Klik untuk Main"
      } else {
        // All other pages: stop special audio, restore main music
        stopSpecialAudio();
        if (customAudio && customAudio.paused) {
          customAudio.play().catch(err => console.log('Music restore blocked:', err));
        }
      }
    }

    // Page-specific setup once it becomes visible
    if (FLOW_PAGES[index] === 'page-galaksi') {
      if (typeof initGalaxySceneIfNeeded === 'function') initGalaxySceneIfNeeded();
    } else if (FLOW_PAGES[index] === 'page-video') {
      if (typeof window.initRunGameIfNeeded === 'function') window.initRunGameIfNeeded();
    } else {
      // Pause the Mimi Run game whenever we navigate away from its page
      if (typeof window.pauseRunGame === 'function') window.pauseRunGame();
    }
    if (FLOW_PAGES[index] === 'page-finish' && typeof confetti === 'function') {
      confetti({ particleCount: 140, spread: 90, origin: { y: 0.6 } });
      setTimeout(() => confetti({ particleCount: 100, spread: 120, origin: { y: 0.5 } }), 300);
      playSfx('win');
      if (typeof playCandleFanfare === 'function') playCandleFanfare();
    }
  }

  if (!opts.silent && loader) {
    if (loaderText) {
      loaderText.textContent = LOADER_MESSAGES[FLOW_PAGES[index]] || 'Loading...';
    }
    loader.classList.add('active');
    playLoaderChime();
    setTimeout(() => {
      executeTransition();
      setTimeout(() => {
        loader.classList.remove('active');
      }, 350);
    }, 600);
  } else {
    executeTransition();
  }
}

function goToNextFlowPage() {
  playSfx('click');
  goToFlowPage(currentFlowIndex + 1);
}

function goToPrevFlowPage() {
  playSfx('click');
  goToFlowPage(currentFlowIndex - 1);
}

/* =============================================================
   CALENDAR — builds the "Juli 2026" grid with the 21st highlighted
   ============================================================= */
const CALENDAR_MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

function buildBdayCalendar(year, monthIndex, highlightDay) {
  const grid = document.getElementById('calendar-grid');
  const label = document.getElementById('calendar-month-label');
  if (!grid) return;

  if (label) label.textContent = CALENDAR_MONTH_NAMES[monthIndex] + ' ' + year;

  grid.innerHTML = '';

  const firstDayOfWeek = new Date(year, monthIndex, 1).getDay(); // 0 = Sunday
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

  // Empty leading cells so the 1st lands on the correct weekday
  for (let i = 0; i < firstDayOfWeek; i++) {
    const empty = document.createElement('span');
    empty.className = 'calendar-cell calendar-cell-empty';
    grid.appendChild(empty);
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const cell = document.createElement('span');
    cell.className = 'calendar-cell';
    cell.textContent = d;
    if (d === highlightDay) {
      cell.classList.add('calendar-cell-highlight');
      cell.innerHTML = '<span class="calendar-highlight-ring"></span><span class="calendar-highlight-num">' + d + '</span>';
    }
    grid.appendChild(cell);
  }
}

/* =============================================================
   DOM READY — WIRE EVERYTHING UP
   ============================================================= */
document.addEventListener('DOMContentLoaded', () => {
  buildBdayCalendar(2026, 6, 23); // July (0-indexed = 6) 2026, highlight the 21st

  // Wire every "Lanjut" button (both the plain data-next ones and the
  // gated ones that only appear after finishing that page's activity)
  document.querySelectorAll('.btn-next-page').forEach(btn => {
    btn.addEventListener('click', goToNextFlowPage);
  });

  // Wire every "Back" button to go to the previous page
  document.querySelectorAll('.btn-back-page').forEach(btn => {
    btn.addEventListener('click', goToPrevFlowPage);
  });

  const restartBtn = document.getElementById('btn-restart-flow');
  if (restartBtn) {
    restartBtn.addEventListener('click', () => {
      playSfx('click');
      resetAllState();
      goToFlowPage(0);
    });
  }

  // Lock body scroll initially (login screen is open)
  document.body.classList.add('scroll-locked');

  /* ---- LANDSCAPE ORIENTATION OVERLAY ---- */
  const rotateOverlay = document.getElementById('rotate-device-overlay');
  const dismissRotateBtn = document.getElementById('btn-dismiss-rotate');
  let rotateDismissedManually = false;

  function checkOrientationOverlay() {
    if (!rotateOverlay || rotateDismissedManually) return;

    const isMobileDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || (window.innerWidth <= 950);
    const isPortrait = window.innerHeight > window.innerWidth;

    if (isMobileDevice && isPortrait) {
      rotateOverlay.classList.remove('hidden');
    } else {
      rotateOverlay.classList.add('hidden');
    }
  }

  if (dismissRotateBtn) {
    dismissRotateBtn.addEventListener('click', () => {
      if (typeof playSfx === 'function') playSfx('click');
      rotateDismissedManually = true;
      if (rotateOverlay) rotateOverlay.classList.add('hidden');
    });
  }

  // Initial check on load
  checkOrientationOverlay();

  // Listen for window resize & orientation change
  window.addEventListener('resize', checkOrientationOverlay);
  window.addEventListener('orientationchange', () => {
    setTimeout(checkOrientationOverlay, 200);
  });

  /* ---- LOGIN PIN PAD ---- */
  const loginScreen = document.getElementById('login-screen');
  const mainApp = document.getElementById('main-app');
  const loginError = document.getElementById('login-error');
  const pinDisplay = document.getElementById('pin-display');
  let enteredPin = "";

  function updatePinDots() {
    const dots = document.querySelectorAll('.pin-dot');
    dots.forEach((dot, idx) => {
      if (idx < enteredPin.length) {
        dot.classList.add('filled');
      } else {
        dot.classList.remove('filled');
      }
    });

    const heartBtn = document.querySelector('.heart-decor-btn');
    if (heartBtn) {
      if (enteredPin.length >= 6) {
        heartBtn.classList.add('heart-ready-pulse');
      } else {
        heartBtn.classList.remove('heart-ready-pulse');
      }
    }
  }

  function handleLoginSuccess() {
    loginError.classList.add('hidden');
    loginScreen.classList.add('fade-out');
    mainApp.classList.remove('hidden');
    initAudio();

    // Unlock body scroll now — the page-flow system shows one page at a
    // time, so normal scrolling just lets tall pages be read comfortably.
    document.body.classList.remove('scroll-locked');

    // Confetti burst
    if (typeof confetti === 'function') {
      confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 } });
      setTimeout(() => {
        confetti({ particleCount: 80, angle: 60, spread: 50, origin: { x: 0 } });
        confetti({ particleCount: 80, angle: 120, spread: 50, origin: { x: 1 } });
      }, 400);
    }
    playSfx('win');

    // Play custom music
    const customAudio = document.getElementById('custom-audio');
    if (customAudio) {
      customAudio.play().catch(err => console.log('Music autoplay prevented:', err));
    }

    // Pause the login screen video to free up GPU and CPU resources
    const bgVideo = document.getElementById('bg-video-login');
    if (bgVideo) {
      bgVideo.pause();
    }

    // Initialize floating background particles only after successful login
    initParticles();
  }

  function handleLoginFailure() {
    playSfx('blow');
    loginError.classList.remove('hidden');

    // Shake display
    if (pinDisplay) {
      pinDisplay.style.animation = 'none';
      void pinDisplay.offsetWidth;
      pinDisplay.style.animation = 'shake 0.4s ease';
    }

    // Reset pin with animation delay
    setTimeout(() => {
      enteredPin = "";
      updatePinDots();
    }, 600);
  }

  document.querySelectorAll('.keypad-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      initAudio();
      const val = btn.dataset.val;
      playSfx('keypad');

      if (val === 'delete') {
        enteredPin = enteredPin.slice(0, -1);
        updatePinDots();
        loginError.classList.add('hidden');
      } else if (val === 'heart') {
        // Harus menekan tombol Love (💖) untuk submit PIN!
        if (enteredPin === "23072026" || enteredPin === "230726") {
          setTimeout(handleLoginSuccess, 150);
        } else {
          loginError.textContent = enteredPin.length === 0
            ? "Ketik PIN dulu yaa sayang, lalu tekan tombol Love (💖)!"
            : "PIN salah! Ketik PIN dengan benar lalu tekan Love (💖)";
          setTimeout(handleLoginFailure, 200);
        }
      } else if (enteredPin.length < 8) {
        enteredPin += val;
        updatePinDots();
        loginError.classList.add('hidden');
      }
    });
  });

  /* ---- LOGOUT ---- */
  document.getElementById('logout-btn').addEventListener('click', () => {
    stopMelody();
    const customAudio = document.getElementById('custom-audio');
    if (customAudio) {
      customAudio.pause();
      customAudio.currentTime = 0;
    }
    const cakeAudio = document.getElementById('cake-audio');
    if (cakeAudio) {
      cakeAudio.pause();
      cakeAudio.currentTime = 0;
    }
    const galaxyAudio = document.getElementById('galaxy-audio');
    if (galaxyAudio) {
      galaxyAudio.pause();
      galaxyAudio.currentTime = 0;
    }
    mainApp.classList.add('hidden');
    loginScreen.classList.remove('fade-out');
    enteredPin = '';
    updatePinDots();
    loginError.classList.add('hidden');

    // Resume the login screen background video
    const bgVideo = document.getElementById('bg-video-login');
    if (bgVideo) {
      bgVideo.currentTime = 0;
      bgVideo.play().catch(err => console.log('Login video play blocked:', err));
    }

    // Stop and clear floating background particles on logout
    stopParticles();

    // Lock body scroll again on logout (back to the fixed login screen)
    document.body.classList.add('scroll-locked');

    resetAllState();

    // Reset the page flow back to page 1 — noMusic prevents music from restarting
    goToFlowPage(0, { silent: true, noMusic: true });
  });

  /* ---- MELODY TOGGLE ---- */
  const melodyBtn = document.getElementById('btn-melody-toggle');
  if (melodyBtn) {
    melodyBtn.addEventListener('click', () => {
      initAudio();
      if (melodyPlaying) stopMelody(); else startMelody();
    });
  }

  /* ---- FLOATING MASCOT CLICK ---- */
  const mascotImg = document.getElementById('mascot-float-img');
  const speechBubble = document.getElementById('speech-bubble');
  if (mascotImg) {
    mascotImg.addEventListener('click', () => {
      playSfx('click');
      if (speechBubble) speechBubble.textContent = MASCOT_QUOTES[Math.floor(Math.random() * MASCOT_QUOTES.length)];
      // Random avatar swap
      const avatars = ['assets/mascot_happy.png', 'assets/mascot_love.png', 'assets/mascot_feed.png'];
      mascotImg.src = avatars[Math.floor(Math.random() * avatars.length)];
    });
  }

  /* ---- FEED GAME ---- */
  const foodButtons = document.querySelectorAll('.food-btn');
  const gameCat = document.getElementById('game-cat');
  const btnResetGame = document.getElementById('btn-reset-game');

  if (foodButtons.length && gameCat) {
    foodButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        if (isFeeding || gameScore >= 100) return;
        isFeeding = true;
        btn.classList.add('pressed');

        const points = parseInt(btn.dataset.points, 10) || 10;

        // sfx + chomp animation + mascot love hug
        playSfx('eat');
        gameCat.src = 'assets/mascot_love.png';
        gameCat.classList.add('chomping');

        // confetti burst from the food button towards the cat
        if (typeof confetti === 'function') {
          confetti({ particleCount: 25, spread: 45, origin: { y: 0.75 } });
        }

        setTimeout(() => {
          gameCat.classList.remove('chomping');
          btn.classList.remove('pressed');
          isFeeding = false;

          // Increase score
          gameScore = Math.min(gameScore + points, 100);
          updateMeter();
          updateGameCatStage();

          if (gameScore >= 100) {
            finishFeedGame();
          }
        }, 450);
      });
    });
  }

  if (btnResetGame) {
    btnResetGame.addEventListener('click', () => {
      playSfx('click');
      resetFeedGame();
    });
  }

  /* ---- LOVE LETTER AMPLOP (Ucapan Terakhir — popup surat) ---- */
  const envelope = document.getElementById('envelope');
  if (envelope) {
    envelope.addEventListener('click', () => {
      if (envelopeOpened) return;
      playSfx('win');
      if (typeof playCandleFanfare === 'function') playCandleFanfare();
      envelopeOpened = true;
      envelope.classList.add('opened');
      const hint = document.getElementById('envelope-hint');
      if (hint) hint.classList.add('hidden');
      setTimeout(openLetterPopup, 550);
    });
  }

  const letterPopupOverlay = document.getElementById('letter-popup-overlay');
  const letterPopupClose = document.getElementById('letter-popup-close');
  if (letterPopupClose) letterPopupClose.addEventListener('click', closeLetterPopup);
  if (letterPopupOverlay) {
    letterPopupOverlay.addEventListener('click', (e) => {
      if (e.target === letterPopupOverlay) closeLetterPopup();
    });
  }

  /* ---- CANDLES ----
     The cake is now a 3D Three.js scene (see cake3d.js). Clicking/tapping a
     candle flame there calls blowOutCandle3D(id) below, which reuses the
     same blownCandles / allCandlesBlown logic as before. */

  document.getElementById('btn-reset-candles').addEventListener('click', () => {
    playSfx('click');
    resetCandlesState();
  });

  /* ---- FLOWER GARDEN RESET ---- */
  const btnResetGarden = document.getElementById('btn-reset-garden');
  if (btnResetGarden) {
    btnResetGarden.addEventListener('click', resetGarden);
  }

  /* ---- BIG GIFT BOX (runs away, opens on the 3rd click) ---- */
  const bigGiftBox = document.getElementById('big-gift-box');
  const giftboxWrapper = document.getElementById('home-giftbox-wrapper');
  const celebrationWrapper = document.getElementById('home-celebration-wrapper');
  const giftboxHint = document.getElementById('giftbox-hint');

  const GIFT_TEASES = [
    'Yah, keburu lari! Coba lagi',
    'Dikit lagi tuh, kejar terus!',
    'Hampir dapet, semangat!'
  ];

  function moveGiftRandomly() {
    if (!bigGiftBox) return;
    const left = 14 + Math.random() * 72;  // 14% – 86%
    const top = 12 + Math.random() * 64;   // 12% – 76%
    bigGiftBox.style.left = left + '%';
    bigGiftBox.style.top = top + '%';
  }

  if (bigGiftBox && giftboxWrapper && celebrationWrapper) {
    // Keep the box wandering around on its own so it feels alive
    startGiftAutoMove();

    bigGiftBox.addEventListener('click', () => {
      playSfx('click');
      giftClickCount++;

      if (giftClickCount < 3) {
        // Still teasing — box scurries off to a new spot
        moveGiftRandomly();
        bigGiftBox.classList.remove('gift-wiggle');
        void bigGiftBox.offsetWidth;
        bigGiftBox.classList.add('gift-wiggle');
        setTimeout(() => bigGiftBox.classList.remove('gift-wiggle'), 420);
        if (giftboxHint) giftboxHint.textContent = GIFT_TEASES[giftClickCount - 1] || GIFT_TEASES[0];
        if (speechBubble) speechBubble.textContent = 'Hehe, belum boleh dibuka! 😝';
        return;
      }

      // 3rd click — the box finally lets itself be caught & opened
      stopGiftAutoMove();
      bigGiftBox.style.left = '50%';
      bigGiftBox.style.top = '50%';

      // Play custom background music on user interaction (bypasses browser autoplay block)
      const customAudio = document.getElementById('custom-audio');
      if (customAudio) {
        customAudio.muted = false;
        customAudio.loop = true;
        customAudio.play().catch(err => console.log('Music autoplay blocked:', err));
      }

      // Step 1: Shake + open lid
      bigGiftBox.classList.add('opening');

      // Step 2: After lid opens, fanfare sound + multi-angle confetti burst
      setTimeout(() => {
        if (typeof playCandleFanfare === 'function') {
          playCandleFanfare();
        } else {
          playSfx('win');
        }
        if (typeof confetti === 'function') {
          confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
          setTimeout(() => {
            confetti({ particleCount: 100, angle: 60, spread: 60, origin: { x: 0.1, y: 0.6 } });
            confetti({ particleCount: 100, angle: 120, spread: 60, origin: { x: 0.9, y: 0.6 } });
          }, 250);
        }
      }, 400);

      // Step 3: Fade out gift box wrapper
      setTimeout(() => {
        giftboxWrapper.classList.add('fade-out');
      }, 1100);

      // Step 4: Show celebration gallery screen with 3D reveal animation & staggered photos
      setTimeout(() => {
        const homeInner = document.querySelector('#page-tanggal .section-inner');
        if (homeInner) homeInner.classList.remove('transparent-inner');
        giftboxWrapper.classList.add('hidden');
        celebrationWrapper.classList.remove('hidden');
        celebrationWrapper.classList.add('celebration-reveal-anim');

        const nextBtn = document.getElementById('next-tanggal');
        if (nextBtn) nextBtn.classList.remove('hidden');

        if (typeof confetti === 'function') {
          confetti({ particleCount: 110, spread: 100, origin: { y: 0.4 } });
        }
      }, 1600);
    });
  }

  /* ---- KARTU UCAPAN — envelope click opens a popup with the letter ---- */
  const envelopeCard = document.getElementById('envelope-card');
  if (envelopeCard) {
    envelopeCard.addEventListener('click', () => {
      if (envelopeCardOpened) return;
      playSfx('win');
      if (typeof playCandleFanfare === 'function') playCandleFanfare();
      envelopeCardOpened = true;
      envelopeCard.classList.add('opened');
      const hint = document.getElementById('envelope-card-hint');
      if (hint) hint.classList.add('hidden');
      setTimeout(openCardPopup, 550);
    });
  }

  const cardPopupOverlay = document.getElementById('card-popup-overlay');
  const cardPopupClose = document.getElementById('card-popup-close');
  if (cardPopupClose) cardPopupClose.addEventListener('click', closeCardPopup);
  if (cardPopupOverlay) {
    cardPopupOverlay.addEventListener('click', (e) => {
      if (e.target === cardPopupOverlay) closeCardPopup();
    });
  }


  /* ---- VIDEO BUTTON ---- */
  const btnOpenVideo = document.getElementById('btn-open-video');
  const videoModal = document.getElementById('video-modal');
  const videoCloseBtn = document.getElementById('video-modal-close-btn');
  const birthdayVideo = document.getElementById('birthday-video');

  if (btnOpenVideo && videoModal) {
    btnOpenVideo.addEventListener('click', () => {
      playSfx('click');
      videoModal.classList.remove('hidden');
      if (birthdayVideo) birthdayVideo.play();
    });
  }

  const closeVideo = () => {
    if (videoModal) videoModal.classList.add('hidden');
    if (birthdayVideo) birthdayVideo.pause();
  };

  if (videoCloseBtn) videoCloseBtn.addEventListener('click', closeVideo);
  if (videoModal) {
    videoModal.addEventListener('click', (e) => {
      if (e.target === videoModal) closeVideo();
    });
  }
});

/* =============================================================
   HELPER FUNCTIONS
   ============================================================= */
function showSection(name) {
  const target = document.getElementById('section-' + name);
  if (target) {
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

function updateMeter() {
  document.getElementById('meter-fill').style.width = gameScore + '%';
  document.getElementById('meter-value').textContent = gameScore + '%';
}

/* ---- FEED GAME STAGES ---- */
const GAME_CAT_STAGES = [
  { min: 0, src: 'assets/mascot_feed.png' },
  { min: 20, src: 'assets/mascot_love.png' },
  { min: 40, src: 'assets/mascot_feed.png' },
  { min: 50, src: 'assets/mascot_love.png' },
  { min: 60, src: 'assets/mascot_feed.png' },
  { min: 70, src: 'assets/mascot_love.png' },
  { min: 90, src: 'assets/mascot_feed.png' },
];

function getCatStageSrc(score) {
  let src = GAME_CAT_STAGES[0].src;
  for (const stage of GAME_CAT_STAGES) {
    if (score >= stage.min) src = stage.src;
  }
  return src;
}

function updateGameCatStage() {
  const gameCat = document.getElementById('game-cat');
  if (!gameCat) return;

  if (catExpressionTimer) {
    clearTimeout(catExpressionTimer);
    catExpressionTimer = null;
  }

  // Tunjukkan maskot peluk love saat diberi makanan
  gameCat.src = 'assets/mascot_love.png';
  gameCat.style.transform = 'scale(1.08)';

  if (gameScore < 100) {
    // Selang-seling: setelah 1.2 detik, kembali ke ekspresi awal (mascot_feed.png) agar siap diberi makan lagi
    catExpressionTimer = setTimeout(() => {
      if (gameScore < 100 && gameCat) {
        gameCat.src = 'assets/mascot_feed.png';
        gameCat.style.transform = 'scale(1)';
      }
      catExpressionTimer = null;
    }, 1200);
  } else {
    gameCat.src = 'assets/mascot_belly.png';
    gameCat.style.transform = 'scale(1)';
  }
}

function finishFeedGame() {
  const gameCat = document.getElementById('game-cat');
  const gameWinMsg = document.getElementById('game-win-msg');
  const foodButtons = document.querySelectorAll('.food-btn');

  playSfx('win');
  if (gameCat) gameCat.src = 'assets/mascot_belly.png';
  foodButtons.forEach(btn => btn.classList.add('disabled'));
  if (gameWinMsg) gameWinMsg.classList.remove('hidden');

  const speech = document.getElementById('speech-bubble');
  if (speech) speech.textContent = 'Abang kenyang banget! Makasih udah dikasih makan! 🐾💕';

  if (typeof confetti === 'function') {
    confetti({ particleCount: 100, spread: 80, origin: { y: 0.6 } });
  }

  const nextKucing = document.getElementById('next-kucing');
  if (nextKucing) nextKucing.classList.remove('hidden');
}

function resetFeedGame() {
  gameScore = 0;
  isFeeding = false;
  if (catExpressionTimer) {
    clearTimeout(catExpressionTimer);
    catExpressionTimer = null;
  }
  updateMeter();
  const gameCat = document.getElementById('game-cat');
  if (gameCat) {
    gameCat.src = 'assets/mascot_feed.png';
    gameCat.style.transform = 'scale(1)';
  }
  document.getElementById('game-win-msg').classList.add('hidden');
  document.querySelectorAll('.food-btn').forEach(btn => btn.classList.remove('disabled', 'pressed'));
}

/* =============================================================
   GIFT BOX AUTO-MOVE ("lari-lari" idle wandering)
   ============================================================= */
function startGiftAutoMove() {
  if (giftAutoMoveInterval) return;
  giftAutoMoveInterval = setInterval(() => {
    const box = document.getElementById('big-gift-box');
    if (!box || box.classList.contains('opening')) return;
    const left = 14 + Math.random() * 72;
    const top = 12 + Math.random() * 64;
    box.style.left = left + '%';
    box.style.top = top + '%';
  }, 1700);
}

function stopGiftAutoMove() {
  if (giftAutoMoveInterval) {
    clearInterval(giftAutoMoveInterval);
    giftAutoMoveInterval = null;
  }
}

/* =============================================================
   KARTU UCAPAN — POPUP CARD (typewriter reveal)
   ============================================================= */
function openCardPopup() {
  const overlay = document.getElementById('card-popup-overlay');
  const popup = document.getElementById('card-popup');
  if (!overlay) return;

  overlay.classList.remove('hidden');
  overlay.style.animation = 'none';
  void overlay.offsetWidth;
  overlay.style.animation = '';

  if (popup) {
    popup.style.animation = 'none';
    void popup.offsetWidth;
    popup.style.animation = '';
  }

  playSfx('win');
  if (typeof confetti === 'function') {
    confetti({ particleCount: 60, spread: 70, origin: { y: 0.4 } });
  }

  startCardTypewriter();
}

function closeCardPopup() {
  playSfx('click');
  const overlay = document.getElementById('card-popup-overlay');
  if (overlay) overlay.classList.add('hidden');
}

function startCardTypewriter() {
  if (isCardTyping) return;
  isCardTyping = true;
  const el = document.getElementById('card-popup-text');
  if (!el) { isCardTyping = false; return; }
  el.textContent = '';
  let i = 0;
  function typeChar() {
    if (i < GREETING_CARD_TEXT.length) {
      const ch = GREETING_CARD_TEXT.charAt(i);
      el.innerHTML += (ch === '\n') ? '<br>' : ch;
      if (ch !== ' ' && ch !== '\n') playSfx('typewriter');
      i++;
      setTimeout(typeChar, 55);
    } else {
      isCardTyping = false;
      const nextKartu = document.getElementById('next-kartu');
      if (nextKartu) nextKartu.classList.remove('hidden');
    }
  }
  typeChar();
}

/* =============================================================
   UCAPAN TERAKHIR — POPUP SURAT (typewriter reveal, like Kartu Ucapan)
   ============================================================= */
function openLetterPopup() {
  const overlay = document.getElementById('letter-popup-overlay');
  if (!overlay) return;

  overlay.classList.remove('hidden');
  overlay.style.animation = 'none';
  void overlay.offsetWidth;
  overlay.style.animation = '';

  const wrap = overlay.querySelector('.card-popup-wrap');
  if (wrap) {
    wrap.style.animation = 'none';
    void wrap.offsetWidth;
    wrap.style.animation = '';
  }

  playSfx('win');
  if (typeof confetti === 'function') {
    confetti({ particleCount: 60, spread: 70, origin: { y: 0.4 } });
  }

  startTypewriter();
}

function closeLetterPopup() {
  playSfx('click');
  const overlay = document.getElementById('letter-popup-overlay');
  if (overlay) overlay.classList.add('hidden');
}

function startTypewriter() {
  if (isTyping) return;
  isTyping = true;
  const el = document.getElementById('letter-text');
  el.textContent = '';
  let i = 0;
  function typeChar() {
    if (i < LOVE_LETTER.length) {
      const ch = LOVE_LETTER.charAt(i);
      if (ch === '\n') { el.innerHTML += '<br>'; }
      else { el.innerHTML += ch; }
      if (ch !== ' ' && ch !== '\n') playSfx('typewriter');
      i++;
      const popupBox = document.getElementById('letter-popup');
      if (popupBox) popupBox.scrollTop = popupBox.scrollHeight;
      setTimeout(typeChar, 65);
    } else {
      isTyping = false;
      const nextUcapan = document.getElementById('next-ucapan');
      if (nextUcapan) nextUcapan.classList.remove('hidden');
    }
  }
  typeChar();
}

/* Called by cake3d.js whenever a 3D candle flame is clicked/blown */
function blowOutCandle3D(id) {
  if (blownCandles.has(id)) return;
  playSfx('blow');
  blownCandles.add(id);
  if (blownCandles.size >= 4) {
    allCandlesBlown();
  }
}

function allCandlesBlown() {
  playCandleFanfare();
  if (window.Cake3D && typeof window.Cake3D.celebrate === 'function') {
    window.Cake3D.celebrate();
  }
  const cakeStatus = document.getElementById('cake-status');
  if (cakeStatus) cakeStatus.textContent = 'All the candles have been blown out! 🥳';

  const btnResetCandles = document.getElementById('btn-reset-candles');
  if (btnResetCandles) btnResetCandles.classList.remove('hidden');

  const speechBubble = document.getElementById('speech-bubble');
  if (speechBubble) speechBubble.textContent = 'Happy Birthday, Humaira! 🍰🎈';

  const nextKue = document.getElementById('next-kue');
  if (nextKue) nextKue.classList.remove('hidden');

  if (typeof confetti === 'function') {
    const end = Date.now() + 8000;
    const interval = setInterval(() => {
      if (Date.now() > end) return clearInterval(interval);
      confetti({ particleCount: 40, spread: 360, startVelocity: 25, origin: { x: Math.random(), y: Math.random() * 0.4 } });
    }, 250);
  }
}

function resetAllState() {
  // Feed-the-cat game
  resetFeedGame();

  // Galaksi — close the photo popup if it happened to be open
  const galaxyPopupOverlay = document.getElementById('galaxy-popup-overlay');
  if (galaxyPopupOverlay) galaxyPopupOverlay.classList.add('hidden');


  // Candles
  resetCandlesState();

  // Final letter envelope (page: Ucapan Terakhir)
  envelopeOpened = false;
  isTyping = false;
  const env = document.getElementById('envelope');
  if (env) env.classList.remove('opened');
  const letterTextEl = document.getElementById('letter-text');
  if (letterTextEl) letterTextEl.textContent = '';
  const envelopeHintEl = document.getElementById('envelope-hint');
  if (envelopeHintEl) envelopeHintEl.classList.remove('hidden');
  const letterPopupOverlay = document.getElementById('letter-popup-overlay');
  if (letterPopupOverlay) letterPopupOverlay.classList.add('hidden');

  // Kartu ucapan envelope + popup
  envelopeCardOpened = false;
  isCardTyping = false;
  const envCard = document.getElementById('envelope-card');
  if (envCard) envCard.classList.remove('opened');
  const envCardHint = document.getElementById('envelope-card-hint');
  if (envCardHint) envCardHint.classList.remove('hidden');
  const cardPopupOverlay = document.getElementById('card-popup-overlay');
  if (cardPopupOverlay) cardPopupOverlay.classList.add('hidden');
  const cardPopupText = document.getElementById('card-popup-text');
  if (cardPopupText) cardPopupText.textContent = '';

  // Gift box + calendar screen
  giftClickCount = 0;
  stopGiftAutoMove();
  const homeInner = document.querySelector('#page-tanggal .section-inner');
  if (homeInner) homeInner.classList.add('transparent-inner');
  const giftboxWrapper = document.getElementById('home-giftbox-wrapper');
  const celebrationWrapper = document.getElementById('home-celebration-wrapper');
  const bigGiftBox = document.getElementById('big-gift-box');
  if (giftboxWrapper) giftboxWrapper.classList.remove('hidden', 'fade-out');
  if (celebrationWrapper) celebrationWrapper.classList.add('hidden');
  if (bigGiftBox) {
    bigGiftBox.classList.remove('opening');
    bigGiftBox.style.left = '50%';
    bigGiftBox.style.top = '50%';
  }
  const giftboxHint = document.getElementById('giftbox-hint');
  if (giftboxHint) giftboxHint.textContent = 'Klik Kado nya 🎁';
  if (document.getElementById('main-app') && !document.getElementById('main-app').classList.contains('hidden')) {
    startGiftAutoMove();
  }

  // Mimi Run game
  if (typeof window.resetRunGame === 'function') window.resetRunGame();

  // Hide all the gated "Lanjut" buttons again
  ['next-tanggal', 'next-kartu', 'next-kue', 'next-kucing', 'next-ucapan'].forEach(id => {
    const btn = document.getElementById(id);
    if (btn) btn.classList.add('hidden');
  });
}

function resetCandlesState() {
  blownCandles.clear();
  const btnResetCandles = document.getElementById('btn-reset-candles');
  if (btnResetCandles) btnResetCandles.classList.add('hidden');

  const cakeStatus = document.getElementById('cake-status');
  if (cakeStatus) cakeStatus.textContent = 'Klik lilin untuk meniupnya! 🕯️';

  if (window.Cake3D && typeof window.Cake3D.reset === 'function') {
    window.Cake3D.reset();
  }
}

/* =============================================================
   FLOWER GARDEN HELPER FUNCTIONS
   ============================================================= */
function initGarden() {
  const container = document.getElementById('stems-container');
  if (!container) return;
  container.innerHTML = '';
  stemStates = [];

  const startAngle = -52;
  const endAngle = 52;
  const angleStep = (endAngle - startAngle) / (TOTAL_STEMS - 1);
  const midIndex = (TOTAL_STEMS - 1) / 2;

  for (let i = 0; i < TOTAL_STEMS; i++) {
    const angle = startAngle + i * angleStep;
    // Dome shape: center stems are tallest, side stems are shorter
    const height = 230 - Math.abs(i - midIndex) * 8;

    const wrapper = document.createElement('div');
    wrapper.className = 'stem-wrapper';
    wrapper.style.setProperty('--stem-rot', angle + 'deg');

    const stem = document.createElement('div');
    stem.className = 'stem';
    stem.style.setProperty('--stem-h', height + 'px');

    // Add leaves to the stem
    const leafL = document.createElement('div');
    leafL.className = 'leaf-left';
    leafL.style.bottom = Math.floor(height * 0.35) + 'px';
    stem.appendChild(leafL);

    const leafR = document.createElement('div');
    leafR.className = 'leaf-right';
    leafR.style.bottom = Math.floor(height * 0.65) + 'px';
    stem.appendChild(leafR);

    // Socket positioned exactly at stem tip using JS (no CSS calc needed)
    const socket = document.createElement('div');
    socket.className = 'flower-socket empty';
    socket.style.top = (-height) + 'px';
    socket.style.transform = `translate(-50%, 0) rotate(${-angle}deg)`;

    stem.appendChild(socket);
    wrapper.appendChild(stem);
    container.appendChild(wrapper);

    stemStates.push({
      hasFlower: false,
      emoji: '',
      wrapperEl: wrapper,
      stemEl: stem,
      socketEl: socket
    });
  }
}

function startGardenSpawning() {
  if (gardenActive) return;
  gardenActive = true;
  initGarden();

  const statusEl = document.getElementById('garden-status');
  if (statusEl) {
    statusEl.innerHTML = 'Klik bunga-bunga yang berguguran untuk melengkapi tangkai bunga! 🌸';
    statusEl.style.color = '';
  }

  // Spawn initial flower quickly
  spawnGardenFlower();

  gardenSpawnInterval = setInterval(() => {
    spawnGardenFlower();
  }, 1000);
}

function stopGardenSpawning() {
  gardenActive = false;
  if (gardenSpawnInterval) {
    clearInterval(gardenSpawnInterval);
    gardenSpawnInterval = null;
  }
  const container = document.getElementById('falling-flowers-container');
  if (container) {
    container.innerHTML = '';
  }
}

function spawnGardenFlower() {
  const container = document.getElementById('falling-flowers-container');
  if (!container || !gardenActive) return;

  const flowerEl = document.createElement('div');
  flowerEl.className = 'falling-flower';

  const randomEmoji = FLOWER_TYPES[Math.floor(Math.random() * FLOWER_TYPES.length)];
  flowerEl.textContent = randomEmoji;

  const leftPos = Math.random() * 85 + 5; // 5% to 90%
  flowerEl.style.left = leftPos + '%';

  const duration = Math.random() * 3 + 4.5; // 4.5s to 7.5s
  const drift = (Math.random() * 60 - 30) + 'px';

  flowerEl.style.animationDuration = duration + 's';
  flowerEl.style.setProperty('--drift', drift);

  flowerEl.addEventListener('click', () => {
    attachFlowerToStem(flowerEl);
  });

  container.appendChild(flowerEl);

  flowerEl.addEventListener('animationend', () => {
    flowerEl.remove();
  });
}

function attachFlowerToStem(flowerEl) {
  const emptyStemIndex = stemStates.findIndex(s => !s.hasFlower);
  if (emptyStemIndex === -1) return;

  const stemState = stemStates[emptyStemIndex];
  stemState.hasFlower = true;

  flowerEl.classList.add('flying');

  const stage = document.getElementById('garden-stage');
  const stageRect = stage.getBoundingClientRect();
  const flowerRect = flowerEl.getBoundingClientRect();
  const socketRect = stemState.socketEl.getBoundingClientRect();

  const startLeft = flowerRect.left - stageRect.left;
  const startTop = flowerRect.top - stageRect.top;

  const targetLeft = socketRect.left - stageRect.left + (socketRect.width - flowerRect.width) / 2;
  const targetTop = socketRect.top - stageRect.top + (socketRect.height - flowerRect.height) / 2;

  flowerEl.style.animation = 'none';
  flowerEl.style.left = startLeft + 'px';
  flowerEl.style.top = startTop + 'px';

  void flowerEl.offsetWidth;

  flowerEl.style.transition = 'all 0.6s cubic-bezier(0.25, 1, 0.5, 1)';
  flowerEl.style.left = targetLeft + 'px';
  flowerEl.style.top = targetTop + 'px';
  flowerEl.style.transform = 'scale(1.2) rotate(720deg)';

  playSfx('click');

  flowerEl.addEventListener('transitionend', () => {
    stemState.emoji = flowerEl.textContent;
    stemState.socketEl.classList.remove('empty');
    stemState.socketEl.innerHTML = `<span class="flower-head">${stemState.emoji}</span>`;

    if (typeof confetti === 'function') {
      const xOrigin = (socketRect.left + socketRect.width / 2) / window.innerWidth;
      const yOrigin = (socketRect.top + socketRect.height / 2) / window.innerHeight;
      confetti({
        particleCount: 15,
        spread: 50,
        origin: { x: xOrigin, y: yOrigin }
      });
    }

    playSfx('eat');
    flowerEl.remove();

    checkGardenCompletion();
  });
}

function checkGardenCompletion() {
  const allFilled = stemStates.every(s => s.hasFlower);
  if (allFilled) {
    playSfx('win');

    const statusEl = document.getElementById('garden-status');
    if (statusEl) {
      statusEl.innerHTML = '✨ Wah, taman bungamu mekar dengan sangat indah! Sama seperti cintaku padamu yang mekar setiap hari! 💖🌸';
      statusEl.style.color = '#ff4b72';
    }

    if (typeof confetti === 'function') {
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 }
      });

      setTimeout(() => {
        confetti({ particleCount: 50, angle: 60, spread: 55, origin: { x: 0 } });
        confetti({ particleCount: 50, angle: 120, spread: 55, origin: { x: 1 } });
      }, 300);
    }

    const speech = document.getElementById('speech-bubble');
    if (speech) {
      speech.textContent = 'Indah banget taman bunganya! Makasih sayang! 🌸🥰';
    }
  }
}

function resetGarden() {
  playSfx('click');
  initGarden();

  const statusEl = document.getElementById('garden-status');
  if (statusEl) {
    statusEl.innerHTML = 'Klik bunga-bunga yang berguguran untuk melengkapi tangkai bunga! 🌸';
    statusEl.style.color = '';
  }
}

/* Old CSS-orbit universe system removed — see galaxy.js for the
   Three.js heart→galaxy scene that now powers the Galaksi page. */

/* =============================================================
   LOVE QUIZ & TIMELINE INTERACTIVE LOGIC
   ============================================================= */
const QUIZ_QUESTIONS = [
  {
    q: "Kapan tanggal hari jadian/anniversary kita? 💍",
    o: ["23 Juli 2024", "23 Juli 2025", "23 Juli 2026", "23-07-2026"],
    a: 3
  },
  {
    q: "Siapa nama panggilan kesayangan kucing gendut abang? 🐾",
    o: ["Abang / Mimi", "Meng", "Cimot", "Oyen"],
    a: 0
  },
  {
    q: "Mana panggilan sayang paling manja buat pacarmu? 🥰",
    o: ["Sayang / Cantik", "Beb", "Mas", "Kancil"],
    a: 0
  }
];

let currentQuizIdx = 0;

function initQuiz() {
  const qNumEl = document.getElementById('quiz-q-num');
  const qTextEl = document.getElementById('quiz-question-text');
  const optionsGrid = document.getElementById('quiz-options-grid');
  const errorMsg = document.getElementById('quiz-error-msg');
  const progressFill = document.getElementById('quiz-progress-fill');

  if (!qNumEl || !qTextEl || !optionsGrid) return;

  // Hide error
  if (errorMsg) errorMsg.classList.add('hidden');

  // Load current question
  const currentQ = QUIZ_QUESTIONS[currentQuizIdx];
  qNumEl.textContent = `Pertanyaan ${currentQuizIdx + 1} dari ${QUIZ_QUESTIONS.length}`;
  qTextEl.textContent = currentQ.q;

  // Update progress bar
  const progressPercent = ((currentQuizIdx + 1) / QUIZ_QUESTIONS.length) * 100;
  progressFill.style.width = progressPercent + '%';

  // Render options
  optionsGrid.innerHTML = '';
  currentQ.o.forEach((opt, idx) => {
    const btn = document.createElement('button');
    btn.className = 'quiz-option-btn';
    btn.innerHTML = `<span class="opt-letter">${String.fromCharCode(65 + idx)}</span> <span class="opt-text">${opt}</span>`;
    btn.addEventListener('click', () => {
      checkQuizAnswer(idx, btn);
    });
    optionsGrid.appendChild(btn);
  });
}

function checkQuizAnswer(selectedIdx, optionBtn) {
  const currentQ = QUIZ_QUESTIONS[currentQuizIdx];
  const errorMsg = document.getElementById('quiz-error-msg');

  if (selectedIdx === currentQ.a) {
    // Correct!
    playSfx('eat');
    optionBtn.classList.add('correct');
    if (errorMsg) errorMsg.classList.add('hidden');

    // Confetti burst for correct answer
    if (typeof confetti === 'function') {
      confetti({ particleCount: 30, spread: 50, origin: { y: 0.7 } });
    }

    setTimeout(() => {
      currentQuizIdx++;
      if (currentQuizIdx >= QUIZ_QUESTIONS.length) {
        finishQuiz();
      } else {
        initQuiz();
      }
    }, 600);
  } else {
    // Incorrect!
    playSfx('blow');
    optionBtn.classList.add('wrong');
    if (errorMsg) {
      errorMsg.classList.remove('hidden');
      errorMsg.style.animation = 'none';
      void errorMsg.offsetWidth;
      errorMsg.style.animation = 'shake 0.4s ease';
    }
    setTimeout(() => {
      optionBtn.classList.remove('wrong');
    }, 800);
  }
}

function finishQuiz() {
  playSfx('win');
  const quizContainer = document.getElementById('quiz-container');
  const rewardContainer = document.getElementById('quiz-reward-container');

  if (quizContainer) quizContainer.classList.add('hidden');
  if (rewardContainer) {
    rewardContainer.classList.remove('hidden');
    rewardContainer.style.animation = 'popUp 0.5s ease both';
  }

  // Grand confetti burst
  if (typeof confetti === 'function') {
    confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
  }
}

function resetQuiz() {
  currentQuizIdx = 0;
  const quizContainer = document.getElementById('quiz-container');
  const rewardContainer = document.getElementById('quiz-reward-container');

  if (quizContainer) quizContainer.classList.remove('hidden');
  if (rewardContainer) rewardContainer.classList.add('hidden');

  // Reset claim buttons
  document.querySelectorAll('.btn-claim-voucher').forEach(btn => {
    btn.textContent = 'Klaim Kupon';
    btn.disabled = false;
    btn.style.opacity = '1';
  });

  initQuiz();
}

/* =============================================================
   POLAROID PHOTO GALLERY & LIGHTBOX INTERACTIVITY
   ============================================================= */
function initPhotoGridInteractivity() {
  const items = document.querySelectorAll('.photo-grid-item');
  const overlay = document.getElementById('photo-lightbox-overlay');
  const lightboxImg = document.getElementById('photo-lightbox-img');
  const lightboxCaption = document.getElementById('photo-lightbox-caption');
  const lightboxClose = document.getElementById('photo-lightbox-close');
  const lightboxPrev = document.getElementById('photo-lightbox-prev');
  const lightboxNext = document.getElementById('photo-lightbox-next');
  const lightboxHeartBtn = document.getElementById('photo-lightbox-heart-btn');
  const likesCount = document.getElementById('photo-lightbox-likes');

  // Photo Slider Viewport Arrow Navigation
  const sliderPrevBtn = document.getElementById('celebration-photo-prev');
  const sliderNextBtn = document.getElementById('celebration-photo-next');
  const photoGrid = document.getElementById('celebration-photo-grid');

  if (sliderPrevBtn && photoGrid) {
    sliderPrevBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      photoGrid.scrollBy({ left: -145, behavior: 'smooth' });
    });
  }

  if (sliderNextBtn && photoGrid) {
    sliderNextBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      photoGrid.scrollBy({ left: 145, behavior: 'smooth' });
    });
  }

  if (!items.length) return;

  const photoDataList = [
    { src: 'photos/foto1.jpeg', caption: '"The darkest shade of wrap, the brightest kind of soul."' },
    { src: 'photos/foto2.jpeg', caption: '"Sunkissed and carrying a warmth that rivals the sun."' },
    { src: 'photos/foto3.jpeg', caption: '"My favorite picture of the girl who owns my heart."' },
    { src: 'photos/foto4.jpeg', caption: '"Soft eyes, a gentle smile, and a heart full of grace."' },
    { src: 'photos/foto5.jpeg', caption: '"Her smile is the shortest distance between me and happiness."' },
    { src: 'photos/foto6.jpeg', caption: '"Soft hues and a smile that makes the world stand still."' }
  ];

  let currentPhotoIdx = 0;
  let likes = 1000000;

  function showPhotoLightbox(index) {
    currentPhotoIdx = index;
    const data = photoDataList[index];
    if (!data) return;

    if (lightboxImg) lightboxImg.src = data.src;
    if (lightboxCaption) lightboxCaption.textContent = data.caption;
    if (overlay) overlay.classList.remove('hidden');

    // Confetti burst
    if (typeof confetti === 'function') {
      confetti({
        particleCount: 40,
        spread: 70,
        origin: { y: 0.5 },
        colors: ['#ff4b72', '#ffe5ec', '#ffcad4', '#ffffff']
      });
    }

    if (typeof playSfx === 'function') playSfx('click');
  }

  function closePhotoLightbox() {
    if (overlay) overlay.classList.add('hidden');
    if (typeof playSfx === 'function') playSfx('click');
  }

  function spawnFloatingHeartAt(x, y) {
    const heart = document.createElement('div');
    heart.className = 'click-floating-heart';
    heart.innerHTML = ['💖', '✨', '🌸', '💗', '⭐'][Math.floor(Math.random() * 5)];
    heart.style.left = x + 'px';
    heart.style.top = y + 'px';
    document.body.appendChild(heart);

    setTimeout(() => {
      heart.remove();
    }, 900);
  }

  items.forEach((item, idx) => {
    // Click to open lightbox + spawn heart
    item.addEventListener('click', (e) => {
      spawnFloatingHeartAt(e.clientX, e.clientY);
      showPhotoLightbox(idx);
    });

    // 3D Parallax Tilt on Mouse Move
    item.addEventListener('mousemove', (e) => {
      const rect = item.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      const rotX = (-y / (rect.height / 2)) * 14;
      const rotY = (x / (rect.width / 2)) * 14;
      item.style.transform = `perspective(600px) rotateX(${rotX.toFixed(2)}deg) rotateY(${rotY.toFixed(2)}deg) scale(1.18) translateY(-10px)`;
      item.style.zIndex = '60';
    });

    item.addEventListener('mouseleave', () => {
      item.style.transform = '';
      item.style.zIndex = '';
    });
  });

  if (lightboxClose) lightboxClose.addEventListener('click', closePhotoLightbox);

  if (overlay) {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closePhotoLightbox();
    });
  }

  if (lightboxPrev) {
    lightboxPrev.addEventListener('click', () => {
      currentPhotoIdx = (currentPhotoIdx - 1 + photoDataList.length) % photoDataList.length;
      showPhotoLightbox(currentPhotoIdx);
    });
  }

  if (lightboxNext) {
    lightboxNext.addEventListener('click', () => {
      currentPhotoIdx = (currentPhotoIdx + 1) % photoDataList.length;
      showPhotoLightbox(currentPhotoIdx);
    });
  }

  if (lightboxHeartBtn) {
    lightboxHeartBtn.addEventListener('click', () => {
      likes++;
      if (likesCount) {
        if (likes >= 1000000) {
          const extra = likes - 1000000;
          likesCount.textContent = extra > 0 ? `1JT+${extra}` : '1JT';
        } else {
          likesCount.textContent = likes;
        }
      }

      if (typeof confetti === 'function') {
        confetti({
          particleCount: 25,
          spread: 50,
          origin: { y: 0.5 }
        });
      }
      if (typeof playSfx === 'function') playSfx('eat');
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initPhotoGridInteractivity();
});

/* =================================================================
   MIMI RUN — a small "Chrome dino"-style endless runner where Mimi
   the cat sprints across the screen, jumping and ducking obstacles.
   Self-contained: only touches DOM inside #page-video and exposes
   window.initRunGameIfNeeded / window.pauseRunGame / window.resetRunGame
   for script.js to call from the page-flow lifecycle.

   Flow: cover screen (title + "klik untuk main") -> loading -> ready
   overlay ("tekan spasi/tap") -> playing -> game over overlay (retry
   instantly) OR quit button (back to cover screen).
   ================================================================= */
(function () {
  'use strict';

  const GROUND_Y = 34;          // matches .rungame-ground height in CSS
  const GRAVITY = 2000;         // px/s^2
  const JUMP_SPEED = 620;       // px/s, initial upward velocity

  // Difficulty: Normal slow start (140 px/s), ramps up after hitting score thresholds
  const BASE_SPEED = 140;       // px/s initial normal slow obstacle speed
  const MAX_SPEED = 480;        // px/s max speed cap
  const START_SPAWN_GAP = 2000; // ms gap between obstacles at start (very generous!)
  const MIN_SPAWN_GAP = 720;     // ms min gap floor at high score
  const FLYING_UNLOCK_SCORE = 30; // no flying obstacles until score 30

  // Approximate hitboxes (px), tuned to feel fair against the art
  const CHAR_HITBOX = { left: 56, width: 32, standHeight: 48, duckHeight: 24 };
  const GROUND_OBS = { insetX: 5, width: 24, height: 28 };
  const FLYING_OBS = { insetX: 4, width: 24, height: 24, bottom: 90 };

  const GROUND_EMOJIS = ['🧶', '🦴', '🐟', '🍥', '🌵', '🥎'];
  const FLYING_EMOJIS = ['🦋', '🐝', '🕊️'];

  // Pastel skyline palette for the parallax house/building layer
  const BUILDING_COLORS = [
    { wall: '#ff9db8', roof: '#d93b58' },
    { wall: '#ffc2d6', roof: '#ff85a1' },
    { wall: '#c9b6ff', roof: '#a685e0' },
    { wall: '#bcdcff', roof: '#7fb3f0' },
    { wall: '#ffdca8', roof: '#f2b25c' },
  ];

  const MILESTONES = [
    { score: 15, msg: 'Level 2: Wih makin ngebut! 💨' },
    { score: 35, msg: 'Level 3: Cepet banget larinya! 🔥' },
    { score: 70, msg: 'Level 4: Mimi jadi kilat! ⚡' },
    { score: 120, msg: 'Level Max: Mode Super Speed! 🚀' },
  ];

  let dom = null;
  let inited = false;
  let listenersBound = false;
  let buildingsBuilt = false;
  let toastTimer = null;
  let loadingTimer = null;

  const state = {
    running: false,
    rafId: null,
    lastTime: 0,
    score: 0,
    best: 0,
    speed: BASE_SPEED,
    charY: 0,          // px above ground (0 = grounded)
    velY: 0,
    isJumping: false,
    isDucking: false,
    obstacles: [],      // {el, x, width, type}
    spawnTimer: 0,
    spawnGap: START_SPAWN_GAP,
    distance: 0,
    dustTimer: 0,
    buildingX: 0,
    shownMilestones: new Set(),
    decorTimer: 0,
  };

  function cacheDom() {
    dom = {
      wrap: document.getElementById('rungame-wrap'),
      character: document.getElementById('rungame-character'),
      shadow: document.getElementById('rungame-shadow'),
      ground: document.getElementById('rungame-ground'),
      scoreEl: document.getElementById('rungame-score'),
      bestEl: document.getElementById('rungame-best'),
      overlay: document.getElementById('rungame-overlay'),
      overlayTitle: document.getElementById('rungame-overlay-title'),
      overlaySub: document.getElementById('rungame-overlay-sub'),
      startBtn: document.getElementById('rungame-start-btn'),
      jumpBtn: document.getElementById('rungame-jump-btn'),
      duckBtn: document.getElementById('rungame-duck-btn'),
      quitBtn: document.getElementById('rungame-quit-btn'),
      cover: document.getElementById('rungame-cover'),
      coverBtn: document.getElementById('rungame-cover-btn'),
      loading: document.getElementById('rungame-loading'),
      loadingBarFill: document.getElementById('rungame-loading-bar-fill'),
      loadingText: document.getElementById('rungame-loading-text'),
      buildingsTrack: document.getElementById('rungame-buildings-track'),
      toast: document.getElementById('rungame-toast'),
    };
    return !!dom.wrap;
  }

  function isPageActive() {
    const page = document.getElementById('page-video');
    return !!page && page.classList.contains('active-page');
  }

  function loadBest() {
    try {
      if (!localStorage.getItem('mimirun-reset-done-v1')) {
        localStorage.removeItem('mimirun-best');
        localStorage.setItem('mimirun-reset-done-v1', 'true');
      }
      return parseInt(localStorage.getItem('mimirun-best') || '0', 10) || 0;
    } catch (e) {
      return 0;
    }
  }

  function saveBest(val) {
    try { localStorage.setItem('mimirun-best', String(val)); } catch (e) { /* ignore */ }
  }

  /* ---------------- Parallax skyline (built once, purely decorative) ---------------- */

  function buildBuildingSet() {
    const frag = document.createDocumentFragment();
    const count = 9;
    for (let i = 0; i < count; i++) {
      const palette = BUILDING_COLORS[i % BUILDING_COLORS.length];
      const w = 26 + Math.round(Math.sin(i * 1.7) * 8 + 8);   // 26-42px, deterministic "random"
      const h = 30 + Math.round(Math.abs(Math.cos(i * 1.3)) * 34); // 30-64px
      const hasRoof = i % 3 === 0;

      const b = document.createElement('div');
      b.className = 'rungame-building';
      b.style.width = w + 'px';
      b.style.height = h + 'px';
      b.style.background = palette.wall;

      if (hasRoof) {
        const roof = document.createElement('span');
        roof.className = 'rungame-roof';
        roof.style.borderBottom = '12px solid ' + palette.roof;
        roof.style.borderLeftWidth = (w / 2 + 3) + 'px';
        roof.style.borderRightWidth = (w / 2 + 3) + 'px';
        b.appendChild(roof);
      }

      const winCols = w > 32 ? 2 : 1;
      const winRows = Math.max(1, Math.floor((h - 12) / 14));
      for (let r = 0; r < winRows; r++) {
        for (let c = 0; c < winCols; c++) {
          const win = document.createElement('span');
          win.className = 'rungame-win';
          win.style.left = (winCols === 2 ? (c === 0 ? '20%' : '65%') : '38%');
          win.style.bottom = (8 + r * 14) + 'px';
          b.appendChild(win);
        }
      }
      frag.appendChild(b);
    }
    return frag;
  }

  function buildBuildingsOnce() {
    if (buildingsBuilt || !dom.buildingsTrack) return;
    buildingsBuilt = true;
    // Two identical sets placed back to back so the -50% loop is seamless.
    dom.buildingsTrack.appendChild(buildBuildingSet());
    dom.buildingsTrack.appendChild(buildBuildingSet());
  }

  /* ---------------- Input handling ---------------- */

  function doJump() {
    if (!state.running || state.isJumping || state.isDucking) return;
    state.isJumping = true;
    state.velY = JUMP_SPEED;
    if (typeof window.playSfx === 'function') window.playSfx('jump');
  }

  function startDuck() {
    if (!state.running || state.isJumping) return;
    state.isDucking = true;
  }

  function endDuck() {
    state.isDucking = false;
  }

  function handleKeydown(e) {
    if (!isPageActive()) return;
    if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'ArrowDown') {
      e.preventDefault();
    }
    if (!dom.cover.classList.contains('hidden')) return;   // must click "Klik untuk Main" first
    if (!dom.loading.classList.contains('hidden')) return; // ignore keys while loading
    if (e.code === 'Space' || e.code === 'ArrowUp') {
      if (!state.running) startGame(); else doJump();
    } else if (e.code === 'ArrowDown') {
      startDuck();
    }
  }

  function handleKeyup(e) {
    if (e.code === 'ArrowDown') endDuck();
  }

  function bindListenersOnce() {
    if (listenersBound) return;
    listenersBound = true;

    dom.coverBtn.addEventListener('click', (e) => { e.stopPropagation(); beginLoadingSequence(); });
    dom.startBtn.addEventListener('click', (e) => { e.stopPropagation(); startGame(); });
    dom.quitBtn.addEventListener('pointerdown', (e) => { e.stopPropagation(); e.preventDefault(); quitToCover(); });

    dom.wrap.addEventListener('pointerdown', (e) => {
      if (e.target.closest('#rungame-start-btn') || e.target.closest('#rungame-cover-btn') || e.target.closest('#rungame-quit-btn')) return;
      if (!dom.cover.classList.contains('hidden')) return;   // cover screen handles its own click
      if (!dom.loading.classList.contains('hidden')) return; // ignore taps while loading
      if (!dom.overlay.classList.contains('hidden')) return; // let the ready-screen button handle it
      e.preventDefault();
      if (!state.running) { startGame(); return; }
      doJump();
    });

    dom.jumpBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); if (!state.running) startGame(); else doJump(); });
    dom.duckBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); startDuck(); });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach((evt) => {
      dom.duckBtn.addEventListener(evt, endDuck);
    });

    document.addEventListener('keydown', handleKeydown);
    document.addEventListener('keyup', handleKeyup);
  }

  /* ---------------- Cover / loading / quit flow ---------------- */

  function showCover() {
    if (!dom) return;
    dom.loading.classList.add('hidden');
    dom.overlay.classList.add('hidden');
    dom.cover.classList.remove('hidden');
    dom.wrap.classList.remove('rungame-fast');
    hideToast(true);
  }

  function beginLoadingSequence() {
    dom.cover.classList.add('hidden');
    dom.overlay.classList.add('hidden');
    dom.loading.classList.remove('hidden');
    dom.loadingBarFill.style.width = '0%';

    // Start game music now that user has interacted (browser autoplay policy satisfied)
    const gameAudio = document.getElementById('game-audio');
    if (gameAudio) {
      gameAudio.currentTime = 0;
      gameAudio.volume = 0.8;
      gameAudio.play().catch(() => {});
    }

    const texts = ['Menyiapkan arena lari...', 'Memanaskan kaki Abang...', 'Menata gedung-gedung...', 'Hampir siap...'];
    let step = 0;
    dom.loadingText.textContent = texts[0];

    let pct = 0;
    if (loadingTimer) clearInterval(loadingTimer);
    loadingTimer = setInterval(() => {
      pct += 14 + Math.random() * 16;
      if (pct >= 100) {
        pct = 100;
        dom.loadingBarFill.style.width = pct + '%';
        clearInterval(loadingTimer);
        loadingTimer = null;
        setTimeout(() => {
          dom.loading.classList.add('hidden');
          dom.overlay.classList.remove('hidden');
        }, 220);
        return;
      }
      dom.loadingBarFill.style.width = pct + '%';
      step = Math.min(texts.length - 1, Math.floor(pct / 30));
      dom.loadingText.textContent = texts[step];
    }, 160);
  }

  function quitToCover() {
    if (state.rafId) cancelAnimationFrame(state.rafId);
    state.rafId = null;
    state.running = false;
    if (typeof window.playSfx === 'function') window.playSfx('click');
    // Restore full game-music volume when returning to cover screen
    const gameAudio = document.getElementById('game-audio');
    if (gameAudio && !gameAudio.paused) gameAudio.volume = 0.55;
    clearObstacles();
    resetRoundState();
    showCover();
  }

  /* ---------------- Milestone toast ---------------- */

  function hideToast(instant) {
    if (!dom || !dom.toast) return;
    dom.toast.classList.remove('show');
    if (toastTimer) { clearTimeout(toastTimer); toastTimer = null; }
    if (instant) dom.toast.textContent = '';
  }

  function maybeShowMilestone() {
    // Level notifications disabled as requested
    return;
  }

  /* ---------------- Running "footwork" — dust puffs + bouncy shadow ---------------- */

  function spawnDust() {
    const el = document.createElement('span');
    el.className = 'rungame-dust';
    const jitter = Math.random() * 6 - 3;
    el.style.left = (40 + jitter) + 'px';
    dom.wrap.appendChild(el);
    setTimeout(() => el.remove(), 480);
  }

  function updateShadowAndCharAnim() {
    // Shadow shrinks/fades the higher Mimi jumps — reads as depth without a leg sprite.
    if (state.isJumping) {
      const lift = Math.min(1, state.charY / 140);
      dom.shadow.style.opacity = String(Math.max(0.12, 0.5 - lift * 0.4));
      dom.shadow.style.transform = `scaleX(${Math.max(0.4, 1 - lift * 0.55)})`;
    } else if (state.isDucking) {
      dom.shadow.style.opacity = '0.4';
      dom.shadow.style.transform = 'scaleX(1.15)';
    } else {
      dom.shadow.style.opacity = '0.5';
      dom.shadow.style.transform = 'scaleX(1)';
    }

    // Faster legs = faster bob. Cheap trick that reads as "running harder" since
    // the art is a single static sprite rather than a walk-cycle sheet.
    const bobDuration = Math.max(0.13, 0.28 * (BASE_SPEED / state.speed));
    dom.character.style.animationDuration = bobDuration + 's';
  }

  /* ---------------- Game lifecycle ---------------- */

  function clearObstacles() {
    state.obstacles.forEach((o) => o.el.remove());
    state.obstacles = [];
  }

  function resetRoundState() {
    state.running = false;
    state.score = 0;
    state.speed = BASE_SPEED;
    state.charY = 0;
    state.velY = 0;
    state.isJumping = false;
    state.isDucking = false;
    state.spawnTimer = 0;
    state.spawnGap = START_SPAWN_GAP;
    state.distance = 0;
    state.dustTimer = 0;
    state.buildingX = 0;
    state.decorTimer = 0;
    state.shownMilestones = new Set();
    clearObstacles();
    if (dom) {
      dom.character.style.transform = '';
      dom.character.style.animationDuration = '';
      dom.character.classList.remove('running');
      dom.scoreEl.textContent = '0';
      dom.bestEl.textContent = String(state.best);
      dom.wrap.classList.remove('rungame-fast');
      hideToast(true);
      if (dom.buildingsTrack) dom.buildingsTrack.style.transform = 'translateX(0px)';
    }
  }

  function resetVisualState() {
    resetRoundState();
    if (dom) {
      dom.overlayTitle.textContent = 'Siap lari bareng Abang?';
      dom.overlaySub.textContent = 'Tekan Spasi / tap layar buat lompat, tekan panah bawah / tombol nunduk buat nunduk.';
      dom.startBtn.textContent = 'Mulai Lari';
      showCover();
    }
  }

  function startGame() {
    if (state.running) return;
    clearObstacles();
    state.running = true;
    state.score = 0;
    state.speed = BASE_SPEED;
    state.charY = 0;
    state.velY = 0;
    state.isJumping = false;
    state.isDucking = false;
    state.spawnTimer = 0;
    state.spawnGap = START_SPAWN_GAP;
    state.distance = 0;
    state.dustTimer = 0;
    state.shownMilestones = new Set();
    dom.cover.classList.add('hidden');
    dom.loading.classList.add('hidden');
    dom.overlay.classList.add('hidden');
    dom.character.classList.add('running');
    // Restore game music volume to full if it was lowered on game over
    const gameAudio = document.getElementById('game-audio');
    if (gameAudio) {
      gameAudio.volume = 0.8;
      if (gameAudio.paused) gameAudio.play().catch(() => {});
    }
    state.lastTime = performance.now();
    if (state.rafId) cancelAnimationFrame(state.rafId);
    state.rafId = requestAnimationFrame(loop);
  }

  function endGame() {
    state.running = false;
    if (state.rafId) cancelAnimationFrame(state.rafId);
    state.rafId = null;
    dom.character.classList.remove('running');
    dom.character.style.transform = '';
    dom.wrap.classList.remove('rungame-fast');
    hideToast(true);

    // Lower game music volume on game over for dramatic effect
    const gameAudio = document.getElementById('game-audio');
    if (gameAudio && !gameAudio.paused) {
      gameAudio.volume = 0.2;
    }

    const isNewBest = state.score > state.best;
    if (isNewBest) {
      state.best = state.score;
      saveBest(state.best);
    }
    dom.bestEl.textContent = String(state.best);

    if (typeof window.playSfx === 'function') window.playSfx('bonk');
    if (isNewBest && typeof window.playCandleFanfare === 'function') {
      setTimeout(() => window.playCandleFanfare(), 280);
    }

    dom.overlay.classList.remove('hidden');
    dom.overlayTitle.textContent = isNewBest ? 'Wah, rekor baru! 🎉' : 'Aduh, Abang kesandung!';
    dom.overlaySub.textContent = `Skor kamu: ${state.score}${isNewBest ? ' — rekor terbaik baru!' : ` (rekor: ${state.best})`}`;
    dom.startBtn.textContent = 'Lari Lagi 🐾';
  }

  /* ---------------- Spawning ---------------- */

  function spawnObstacle(wrapWidth) {
    const isFlying = state.score > FLYING_UNLOCK_SCORE && Math.random() < 0.28;
    const el = document.createElement('div');
    el.className = 'rungame-obstacle' + (isFlying ? ' flying' : '');
    el.textContent = isFlying
      ? FLYING_EMOJIS[Math.floor(Math.random() * FLYING_EMOJIS.length)]
      : GROUND_EMOJIS[Math.floor(Math.random() * GROUND_EMOJIS.length)];
    el.style.left = wrapWidth + 'px';
    if (isFlying) el.style.bottom = FLYING_OBS.bottom + 'px';
    dom.wrap.appendChild(el);
    state.obstacles.push({ el, x: wrapWidth, width: 28, type: isFlying ? 'flying' : 'ground' });
  }

  /* ---------------- Main loop ---------------- */

  function loop(now) {
    if (!state.running) return;
    let dt = (now - state.lastTime) / 1000;
    state.lastTime = now;
    dt = Math.min(dt, 0.05); // clamp to avoid huge jumps after tab-switch lag

    const wrapWidth = dom.wrap.clientWidth;

    // Difficulty ramp: Normal slow start (140 px/s), ramps up after hitting score thresholds
    // Score < 15: Normal slow & easy (140 px/s)
    // Score 15-35: Ramps to 200 px/s
    // Score 35-70: Ramps to 290 px/s
    // Score 70-120: Ramps to 380 px/s
    // Score > 120: Max speed cap (480 px/s)
    let currentSpeed = BASE_SPEED;
    if (state.score < 15) {
      currentSpeed = BASE_SPEED;
    } else if (state.score < 35) {
      const p = (state.score - 15) / 20;
      currentSpeed = 140 + p * 60;
    } else if (state.score < 70) {
      const p = (state.score - 35) / 35;
      currentSpeed = 200 + p * 90;
    } else if (state.score < 120) {
      const p = (state.score - 70) / 50;
      currentSpeed = 290 + p * 90;
    } else {
      const p = Math.min(1, (state.score - 120) / 60);
      currentSpeed = 380 + p * 100;
    }

    state.speed = currentSpeed;
    
    // Spawn gap adjusts based on speed ratio
    const speedRatio = state.speed / BASE_SPEED;
    state.spawnGap = Math.max(MIN_SPAWN_GAP, START_SPAWN_GAP / speedRatio);

    // Real-time Parallax background building scroll synchronized with game pace
    if (dom.buildingsTrack) {
      const halfWidth = (dom.buildingsTrack.scrollWidth / 2) || 300;
      const parallaxSpeed = state.speed * 0.38; // 38% of player run speed for 3D depth
      state.buildingX -= parallaxSpeed * dt;
      if (state.buildingX <= -halfWidth) {
        state.buildingX += halfWidth;
      }
      dom.buildingsTrack.style.transform = `translateX(${state.buildingX.toFixed(2)}px)`;
    }

    const isFast = state.speed > 250;
    if (isFast) dom.wrap.classList.add('rungame-fast');
    else dom.wrap.classList.remove('rungame-fast');

    // Distance / score
    state.distance += state.speed * dt;
    state.score = Math.floor(state.distance / 12);
    dom.scoreEl.textContent = String(state.score);
    maybeShowMilestone();

    // Character physics
    if (state.isJumping) {
      state.velY -= GRAVITY * dt;
      state.charY += state.velY * dt;
      if (state.charY <= 0) {
        state.charY = 0;
        state.velY = 0;
        state.isJumping = false;
      }
    }

    if (state.isJumping) {
      dom.character.classList.remove('running');
      dom.character.style.transform = `translateY(${-state.charY}px)`;
    } else if (state.isDucking) {
      dom.character.classList.remove('running');
      dom.character.style.transform = 'scaleY(0.55)';
    } else {
      dom.character.classList.add('running');
      dom.character.style.transform = '';
    }

    updateShadowAndCharAnim();

    // Dust kicks up under Mimi's feet while she's actually sprinting on the ground
    if (!state.isJumping) {
      state.dustTimer += dt * 1000;
      const dustGap = Math.max(70, 170 - (state.speed - BASE_SPEED) * 0.25);
      if (state.dustTimer >= dustGap) {
        state.dustTimer = 0;
        spawnDust();
      }
    }

    // Throttled decor updates (buildings scroll speed) — no need to touch every frame
    state.decorTimer += dt * 1000;
    if (state.decorTimer >= 180) {
      state.decorTimer = 0;
      if (dom.buildingsTrack) {
        const dur = Math.max(5, 22 * (BASE_SPEED / state.speed));
        dom.buildingsTrack.style.animationDuration = dur.toFixed(2) + 's';
      }
    }

    // Spawn obstacles
    state.spawnTimer += dt * 1000;
    if (state.spawnTimer >= state.spawnGap) {
      state.spawnTimer = 0;
      spawnObstacle(wrapWidth);
    }

    // Move + collide + cleanup obstacles
    const charHeight = state.isDucking ? CHAR_HITBOX.duckHeight : CHAR_HITBOX.standHeight;
    const charBottom = GROUND_Y + state.charY;
    const charTop = charBottom + charHeight;
    const charLeft = CHAR_HITBOX.left;
    const charRight = charLeft + CHAR_HITBOX.width;

    for (let i = state.obstacles.length - 1; i >= 0; i--) {
      const o = state.obstacles[i];
      o.x -= state.speed * dt;
      o.el.style.left = o.x + 'px';

      if (o.x + o.width < 0) {
        o.el.remove();
        state.obstacles.splice(i, 1);
        continue;
      }

      const cfg = o.type === 'flying' ? FLYING_OBS : GROUND_OBS;
      const obsLeft = o.x + cfg.insetX;
      const obsRight = obsLeft + cfg.width;
      const obsBottom = o.type === 'flying' ? FLYING_OBS.bottom : GROUND_Y;
      const obsTop = obsBottom + cfg.height;

      const overlapX = charLeft < obsRight && charRight > obsLeft;
      const overlapY = charBottom < obsTop && charTop > obsBottom;
      if (overlapX && overlapY) {
        endGame();
        return;
      }
    }

    state.rafId = requestAnimationFrame(loop);
  }

  /* ---------------- Public API ---------------- */

  window.initRunGameIfNeeded = function initRunGameIfNeeded() {
    if (!inited) {
      if (!cacheDom()) return;
      state.best = loadBest();
      buildBuildingsOnce();
      bindListenersOnce();
      inited = true;
    }
    if (!state.running) resetVisualState();
  };

  window.pauseRunGame = function pauseRunGame() {
    if (state.running) {
      state.running = false;
      if (state.rafId) cancelAnimationFrame(state.rafId);
      state.rafId = null;
    }
    // Stop game music when leaving the game page
    const gameAudio = document.getElementById('game-audio');
    if (gameAudio && !gameAudio.paused) {
      gameAudio.pause();
      gameAudio.currentTime = 0;
    }
  };

  window.resetRunGame = function resetRunGame() {
    if (!dom) return;
    // Stop game music on full reset
    const gameAudio = document.getElementById('game-audio');
    if (gameAudio && !gameAudio.paused) {
      gameAudio.pause();
      gameAudio.currentTime = 0;
    }
    resetVisualState();
  };
})();

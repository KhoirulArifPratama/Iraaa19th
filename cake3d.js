/* =============================================================
   cake3d.js — 3D Birthday Cake (Three.js)
   =============================================================
   Kue 3D interaktif untuk halaman "Tiup Lilin!".
   Terinspirasi dari VIDAKHOSHPEY22/3D-Birthday-Cake (Three.js +
   konsep "tiup lilin"), tapi dibangun ulang dari nol supaya cocok
   dengan struktur project ini (pakai Three.js r128 + OrbitControls
   yang sudah dimuat untuk halaman Galaksi, dan terhubung ke logic
   lama: blownCandles / allCandlesBlown / playSfx di script.js).

   Klik / tap nyala lilin untuk meniupnya satu per satu. Geser kue
   untuk memutarnya.
   ============================================================= */

(function () {
  const MOUNT_ID = 'cake3d-mount';

  const PALETTE = {
    plate: 0xf5f2ec,
    plateEdge: 0xffcad4,
    tierBottom: 0xfff0f3,
    tierMid: 0xffeef2,
    tierTop: 0xffffff,
    icing: 0xff4b72,
    icingDeep: 0xd93b58,
    candle: 0xff9ebb,
    candleStripe: 0xffffff,
    wick: 0x5a4636,
    flameCore: 0xfff3b0,
    flameMid: 0xffd54f,
    sparkle: 0xffd54f,
  };

  let renderer, scene, camera, controls, mount;
  let clock;
  const candles = [];      // { id, group, flame, light, blown, blowProgress }
  const particles = [];    // free-floating smoke / sparkle particles
  const balloons = [];     // floating 3D balloons around the cake
  let raycaster, pointer;
  let ready = false;

  function init() {
    mount = document.getElementById(MOUNT_ID);
    if (!mount || typeof THREE === 'undefined') return;

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0710);
    scene.fog = new THREE.Fog(0x0a0710, 4.5, 11);

    camera = new THREE.PerspectiveCamera(42, 320 / 300, 0.1, 60);
    camera.position.set(0, 2.35, 4.6);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(320, 300, false);
    renderer.setClearColor(0x0a0710, 1);
    mount.appendChild(renderer.domElement);

    // ---- Lighting: warm spotlight on the cake, dim moody surroundings ----
    scene.add(new THREE.AmbientLight(0x30222a, 0.55));
    const key = new THREE.SpotLight(0xffe3c2, 1.5, 12, Math.PI / 5, 0.55, 1.2);
    key.position.set(1.4, 4.2, 2.4);
    key.target.position.set(0, 1, 0);
    scene.add(key);
    scene.add(key.target);
    const rim = new THREE.DirectionalLight(0xff9ecb, 0.4);
    rim.position.set(-3, 2, -2);
    scene.add(rim);
    const fill = new THREE.PointLight(0xffc266, 0.5, 8, 2);
    fill.position.set(-1.5, 1.6, 1.8);
    scene.add(fill);

    buildTable();
    buildCake();
    buildConfetti();
    buildBalloons();

    // ---- Controls: drag to rotate, scroll/pinch to zoom, gentle auto-spin ----
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 1.05, 0);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enableZoom = true;
    controls.minDistance = 2.2;
    controls.maxDistance = 8.5;
    controls.zoomSpeed = 0.8;
    controls.enablePan = false;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.9;
    controls.minPolarAngle = Math.PI * 0.18;
    controls.maxPolarAngle = Math.PI * 0.5;
    controls.update();

    raycaster = new THREE.Raycaster();
    pointer = new THREE.Vector2();

    renderer.domElement.addEventListener('pointerdown', onPointerDown, { passive: true });
    renderer.domElement.addEventListener('pointerdown', () => { controls.autoRotate = false; }, { passive: true });

    addHint();

    // Keep the canvas matching its (CSS-driven) container size, including
    // the moment it goes from display:none -> visible when its flow page
    // becomes active.
    if ('ResizeObserver' in window) {
      const ro = new ResizeObserver(() => resizeToContainer());
      ro.observe(mount);
    } else {
      window.addEventListener('resize', resizeToContainer);
    }
    resizeToContainer();

    clock = new THREE.Clock();
    ready = true;
    animate();
  }

  function addHint() {
    const p = document.createElement('p');
    p.className = 'cake3d-hint';
    p.textContent = '';
    mount.parentNode.insertBefore(p, mount.nextSibling);
  }

  function resizeToContainer() {
    if (!mount || !renderer) return;
    const w = mount.clientWidth || 320;
    const h = mount.clientHeight || 300;
    if (w <= 0 || h <= 0) return;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  }

  /* ---------------------------------------------------------
     BUILD TABLE — round wooden tabletop the cake sits on
     --------------------------------------------------------- */
  function buildTable() {
    const woodTexture = createWoodTexture();

    const top = new THREE.Mesh(
      new THREE.CylinderGeometry(6.5, 6.6, 0.28, 48),
      new THREE.MeshStandardMaterial({ map: woodTexture, roughness: 0.75, metalness: 0.05 })
    );
    top.position.y = -0.14;
    scene.add(top);

    const rim = new THREE.Mesh(
      new THREE.TorusGeometry(6.5, 0.06, 8, 48),
      new THREE.MeshStandardMaterial({ color: 0x2a1a10, roughness: 0.6 })
    );
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 0.0;
    scene.add(rim);
  }

  function createWoodTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#4a2f1c';
    ctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 40; i++) {
      const y = Math.random() * 512;
      ctx.strokeStyle = `rgba(${20 + Math.random() * 30}, ${12 + Math.random() * 15}, ${6 + Math.random() * 8}, ${0.25 + Math.random() * 0.3})`;
      ctx.lineWidth = 1 + Math.random() * 3;
      ctx.beginPath();
      ctx.moveTo(0, y);
      for (let x = 0; x <= 512; x += 32) {
        ctx.lineTo(x, y + Math.sin(x * 0.02 + i) * 10 + (Math.random() - 0.5) * 6);
      }
      ctx.stroke();
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(2, 2);
    return tex;
  }

  /* ---------------------------------------------------------
     BUILD CONFETTI — continuously falling paper pieces
     --------------------------------------------------------- */
  const confettiPieces = [];
  const CONFETTI_COLORS = [0xff4b72, 0xffd54f, 0x4fd6ff, 0xa06bff, 0xff9f43, 0x4fffa0, 0xff6bcb];

  function buildConfetti() {
    const count = 70;
    for (let i = 0; i < count; i++) {
      const color = CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)];
      const geo = Math.random() < 0.5
        ? new THREE.PlaneGeometry(0.09, 0.16)
        : new THREE.PlaneGeometry(0.1, 0.1);
      const mat = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide });
      const mesh = new THREE.Mesh(geo, mat);
      resetConfettiPiece(mesh, true);
      scene.add(mesh);
      confettiPieces.push({
        mesh,
        vy: 0,
        spin: new THREE.Vector3(),
        sway: Math.random() * Math.PI * 2,
      });
    }
  }

  function resetConfettiPiece(mesh, randomHeight) {
    mesh.position.set(
      (Math.random() - 0.5) * 7,
      randomHeight ? Math.random() * 8 : 6 + Math.random() * 2,
      (Math.random() - 0.5) * 5 + 0.5
    );
    mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
  }

  /* ---------------------------------------------------------
     BUILD BALLOONS — floating 3D balloons around the cake so the
     scene doesn't feel empty. Placed in a ring around the table,
     each bobbing/swaying independently, string trailing down.
     --------------------------------------------------------- */
  const BALLOON_COLORS = [0xff6ba9, 0xffd166, 0x8ecae6, 0xb185ff, 0xff8fab, 0x8affc1, 0xffa8e8];

  function buildBalloons() {
    const count = 7;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.35;
      const radius = 2.5 + Math.random() * 1.1;
      const baseY = 1.85 + Math.random() * 0.85;
      const color = BALLOON_COLORS[i % BALLOON_COLORS.length];
      const scale = 0.85 + Math.random() * 0.35;

      const group = new THREE.Group();
      group.position.set(Math.cos(angle) * radius, baseY, Math.sin(angle) * radius);
      group.scale.setScalar(scale);

      // Balloon body (slightly egg-shaped sphere)
      const body = new THREE.Mesh(
        new THREE.SphereGeometry(0.26, 20, 20),
        new THREE.MeshStandardMaterial({ color, roughness: 0.25, metalness: 0.05 })
      );
      body.scale.set(0.92, 1.18, 0.92);
      group.add(body);

      // Glossy highlight
      const highlight = new THREE.Mesh(
        new THREE.SphereGeometry(0.06, 10, 10),
        new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55 })
      );
      highlight.position.set(-0.09, 0.15, 0.2);
      group.add(highlight);

      // Knot at the bottom
      const knot = new THREE.Mesh(
        new THREE.ConeGeometry(0.045, 0.08, 8),
        new THREE.MeshStandardMaterial({ color, roughness: 0.3 })
      );
      knot.position.y = -0.31;
      knot.rotation.x = Math.PI;
      group.add(knot);

      // Curly string trailing down toward the table
      const stringGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, -0.35, 0),
        new THREE.Vector3(0.05, -0.75, -0.03),
        new THREE.Vector3(-0.04, -1.1, 0.04),
        new THREE.Vector3(0.03, -1.4, -0.02),
      ]);
      const stringMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.45 });
      const string = new THREE.Line(stringGeo, stringMat);
      group.add(string);

      scene.add(group);

      balloons.push({
        group,
        baseY,
        bobOffset: Math.random() * Math.PI * 2,
        bobSpeed: 0.45 + Math.random() * 0.35,
        bobAmount: 0.1 + Math.random() * 0.06,
        swayOffset: Math.random() * Math.PI * 2,
        swaySpeed: 0.3 + Math.random() * 0.25,
        popped: false,
      });
    }
  }

  /* ---------------------------------------------------------
     BUILD CAKE
     --------------------------------------------------------- */
  function buildCake() {
    const cake = new THREE.Group();

    // Plate
    const plate = new THREE.Mesh(
      new THREE.CylinderGeometry(1.55, 1.6, 0.1, 40),
      new THREE.MeshStandardMaterial({ color: PALETTE.plate, roughness: 0.6 })
    );
    plate.position.y = 0.05;
    cake.add(plate);
    const plateEdge = new THREE.Mesh(
      new THREE.TorusGeometry(1.575, 0.03, 10, 40),
      new THREE.MeshStandardMaterial({ color: PALETTE.plateEdge, roughness: 0.5 })
    );
    plateEdge.rotation.x = Math.PI / 2;
    plateEdge.position.y = 0.1;
    cake.add(plateEdge);

    // Tiers (bottom -> top)
    const tiers = [
      { r: 1.18, h: 0.62, color: PALETTE.tierBottom, y: 0.1 },
      { r: 0.9, h: 0.56, color: PALETTE.tierMid, y: 0 },
      { r: 0.62, h: 0.48, color: PALETTE.tierTop, y: 0 },
    ];

    let currentY = 0.1;
    tiers.forEach((t, i) => {
      const mesh = new THREE.Mesh(
        new THREE.CylinderGeometry(t.r, t.r * 1.03, t.h, 36),
        new THREE.MeshStandardMaterial({ color: t.color, roughness: 0.55 })
      );
      mesh.position.y = currentY + t.h / 2;
      cake.add(mesh);

      // Icing trim ring at the top edge of each tier
      const trim = new THREE.Mesh(
        new THREE.TorusGeometry(t.r * 0.98, 0.045, 10, 36),
        new THREE.MeshStandardMaterial({ color: PALETTE.icing, roughness: 0.4 })
      );
      trim.rotation.x = Math.PI / 2;
      trim.position.y = currentY + t.h;
      cake.add(trim);

      // A few icing drips hanging from the trim (skip the smallest, top tier)
      if (i < 2) {
        const dripCount = 6;
        for (let d = 0; d < dripCount; d++) {
          const angle = (d / dripCount) * Math.PI * 2 + i;
          const dripH = 0.12 + Math.random() * 0.1;
          const drip = new THREE.Mesh(
            new THREE.SphereGeometry(0.045, 8, 8),
            new THREE.MeshStandardMaterial({ color: PALETTE.icingDeep, roughness: 0.45 })
          );
          drip.scale.set(1, dripH / 0.09, 1);
          drip.position.set(
            Math.cos(angle) * t.r * 0.98,
            currentY + t.h - dripH / 2,
            Math.sin(angle) * t.r * 0.98
          );
          cake.add(drip);
        }
      }

      currentY += t.h;
    });

    // Little decorative sugar-pearl dots on the top tier
    const topY = currentY;
    const pearlCount = 10;
    for (let p = 0; p < pearlCount; p++) {
      const angle = (p / pearlCount) * Math.PI * 2;
      const rad = 0.42;
      const pearl = new THREE.Mesh(
        new THREE.SphereGeometry(0.035, 10, 10),
        new THREE.MeshStandardMaterial({ color: PALETTE.icing, roughness: 0.3 })
      );
      pearl.position.set(Math.cos(angle) * rad, topY + 0.02, Math.sin(angle) * rad);
      cake.add(pearl);
    }

    cake.position.y = 0;
    scene.add(cake);

    // Candles arranged in a small diamond on top of the cake
    const candleSpots = [
      { x: -0.24, z: 0 },
      { x: 0.24, z: 0 },
      { x: 0, z: 0.26 },
      { x: 0, z: -0.26 },
    ];
    candleSpots.forEach((spot, i) => buildCandle(String(i + 1), spot.x, topY, spot.z));
  }

  function buildCandle(id, x, y, z) {
    const group = new THREE.Group();
    group.position.set(x, y, z);

    // Body (candy-stripe: base pink cylinder + a white stripe wrap)
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(0.045, 0.05, 0.34, 14),
      new THREE.MeshStandardMaterial({ color: PALETTE.candle, roughness: 0.4 })
    );
    body.position.y = 0.17;
    group.add(body);

    for (let s = 0; s < 3; s++) {
      const stripe = new THREE.Mesh(
        new THREE.CylinderGeometry(0.047, 0.047, 0.035, 14),
        new THREE.MeshStandardMaterial({ color: PALETTE.candleStripe, roughness: 0.4 })
      );
      stripe.position.y = 0.06 + s * 0.11;
      group.add(stripe);
    }

    // Wick
    const wick = new THREE.Mesh(
      new THREE.CylinderGeometry(0.008, 0.008, 0.05, 6),
      new THREE.MeshStandardMaterial({ color: PALETTE.wick })
    );
    wick.position.y = 0.36;
    group.add(wick);

    // Flame (cone + glow light)
    const flame = new THREE.Mesh(
      new THREE.ConeGeometry(0.05, 0.15, 12),
      new THREE.MeshBasicMaterial({ color: PALETTE.flameMid })
    );
    flame.position.y = 0.47;
    flame.userData.candleId = id;
    group.add(flame);

    const flameCore = new THREE.Mesh(
      new THREE.ConeGeometry(0.025, 0.08, 10),
      new THREE.MeshBasicMaterial({ color: PALETTE.flameCore })
    );
    flameCore.position.y = 0.44;
    flameCore.userData.candleId = id;
    flame.add(flameCore);

    const light = new THREE.PointLight(0xffaa55, 0.9, 1.6, 2);
    light.position.y = 0.47;
    group.add(light);

    scene.add(group);

    candles.push({
      id,
      group,
      flame,
      light,
      blown: false,
      blowT: 0,
      baseY: 0.47,
    });
  }

  /* ---------------------------------------------------------
     INTERACTION
     --------------------------------------------------------- */
  function onPointerDown(event) {
    if (!ready) return;
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(pointer, camera);
    const flameMeshes = candles.filter(c => !c.blown).map(c => c.flame);
    const hits = raycaster.intersectObjects(flameMeshes, true);
    if (hits.length === 0) return;

    let obj = hits[0].object;
    while (obj && !obj.userData.candleId) obj = obj.parent;
    if (!obj) return;

    blowOutCandle(obj.userData.candleId);
  }

  function blowOutCandle(id) {
    const candle = candles.find(c => c.id === id);
    if (!candle || candle.blown) return;
    candle.blown = true;
    spawnSmoke(candle);

    // Hook back into the page's existing state machine
    if (typeof window.blowOutCandle3D === 'function') {
      window.blowOutCandle3D(id);
    }
  }

  function spawnSmoke(candle) {
    const worldPos = new THREE.Vector3();
    candle.flame.getWorldPosition(worldPos);
    for (let i = 0; i < 5; i++) {
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.05 + Math.random() * 0.02, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0xcccccc, transparent: true, opacity: 0.5 })
      );
      mesh.position.copy(worldPos);
      mesh.position.x += (Math.random() - 0.5) * 0.05;
      mesh.position.z += (Math.random() - 0.5) * 0.05;
      scene.add(mesh);
      particles.push({
        mesh,
        vy: 0.35 + Math.random() * 0.2,
        life: 1,
        decay: 0.6 + Math.random() * 0.3,
      });
    }
  }

  /* ---------------------------------------------------------
     CELEBRATION — once every candle has been blown out, each
     balloon pops one after another and bursts into small flat
     confetti-like shards, so the scene stays lively instead of
     going empty/static.
     --------------------------------------------------------- */
  function popBalloon(b) {
    if (b.popped) return;
    b.popped = true;
    if (typeof window.playBalloonPop === 'function') window.playBalloonPop();
    const worldPos = new THREE.Vector3();
    b.group.getWorldPosition(worldPos);
    b.group.visible = false;

    const shardCount = 12 + Math.floor(Math.random() * 6);
    for (let i = 0; i < shardCount; i++) {
      const color = CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)];
      const geo = Math.random() < 0.5
        ? new THREE.PlaneGeometry(0.08, 0.14)
        : new THREE.PlaneGeometry(0.09, 0.09);
      const mat = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, transparent: true, opacity: 1 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(worldPos);
      scene.add(mesh);

      const dir = new THREE.Vector3((Math.random() - 0.5), Math.random() * 0.6 + 0.25, (Math.random() - 0.5)).normalize();
      const speed = 1.8 + Math.random() * 1.7;
      particles.push({
        mesh,
        kind: 'shard',
        vx: dir.x * speed,
        vy: dir.y * speed,
        vz: dir.z * speed,
        spin: new THREE.Vector3((Math.random() - 0.5) * 7, (Math.random() - 0.5) * 7, (Math.random() - 0.5) * 7),
        life: 1,
        decay: 0.32 + Math.random() * 0.22,
      });
    }
  }

  let celebrateTimers = [];
  function celebrate() {
    celebrateTimers.forEach(clearTimeout);
    celebrateTimers = [];
    balloons.forEach((b, i) => {
      const tId = setTimeout(() => popBalloon(b), i * 110 + Math.random() * 140);
      celebrateTimers.push(tId);
    });
  }

  /* ---------------------------------------------------------
     PUBLIC API — used by script.js (resetCandlesState)
     --------------------------------------------------------- */
  window.Cake3D = {
    reset() {
      candles.forEach(c => {
        c.blown = false;
        c.blowT = 0;
        c.flame.visible = true;
        c.flame.scale.set(1, 1, 1);
        c.light.intensity = 0.9;
      });
      particles.forEach(p => scene && scene.remove(p.mesh));
      particles.length = 0;
      balloons.forEach(b => {
        b.popped = false;
        b.group.visible = true;
      });
      celebrateTimers.forEach(clearTimeout);
      celebrateTimers = [];
      if (controls) controls.autoRotate = true;
    },
    celebrate,
  };

  /* ---------------------------------------------------------
     RENDER LOOP
     --------------------------------------------------------- */
  function animate() {
    requestAnimationFrame(animate);
    const dt = clock.getDelta();
    const t = clock.getElapsedTime();

    candles.forEach(c => {
      if (!c.blown) {
        // gentle flicker
        const flick = 1 + Math.sin(t * 14 + c.group.position.x * 10) * 0.06;
        c.flame.scale.set(flick, flick * (1 + Math.sin(t * 9) * 0.08), flick);
        c.light.intensity = 0.8 + Math.sin(t * 16) * 0.15;
      } else if (c.flame.visible) {
        c.blowT += dt * 4;
        const s = Math.max(0, 1 - c.blowT);
        c.flame.scale.set(s, s, s);
        c.light.intensity = Math.max(0, 0.9 * (1 - c.blowT));
        if (s <= 0.01) c.flame.visible = false;
      }
    });

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      if (p.kind === 'shard') {
        p.vy -= dt * 2.0; // gravity pulls the shard back down
        p.mesh.position.x += p.vx * dt;
        p.mesh.position.y += p.vy * dt;
        p.mesh.position.z += p.vz * dt;
        p.mesh.rotation.x += p.spin.x * dt;
        p.mesh.rotation.y += p.spin.y * dt;
        p.mesh.rotation.z += p.spin.z * dt;
        p.life -= dt * p.decay;
        p.mesh.material.opacity = Math.max(0, p.life);
      } else {
        p.life -= dt * p.decay;
        p.mesh.position.y += p.vy * dt;
        p.mesh.scale.multiplyScalar(1 + dt * 0.6);
        p.mesh.material.opacity = Math.max(0, p.life * 0.5);
      }
      if (p.life <= 0) {
        scene.remove(p.mesh);
        particles.splice(i, 1);
      }
    }

    balloons.forEach(b => {
      if (!b.group.visible) return;
      b.group.position.y = b.baseY + Math.sin(t * b.bobSpeed + b.bobOffset) * b.bobAmount;
      b.group.rotation.z = Math.sin(t * b.swaySpeed + b.swayOffset) * 0.08;
      b.group.rotation.x = Math.cos(t * b.swaySpeed * 0.7 + b.swayOffset) * 0.05;
    });

    confettiPieces.forEach(cp => {
      cp.mesh.position.y -= (0.7 + (cp.mesh.position.y % 1) * 0.2) * dt;
      cp.sway += dt * 1.5;
      cp.mesh.position.x += Math.sin(cp.sway) * 0.15 * dt;
      cp.mesh.rotation.x += dt * 1.8;
      cp.mesh.rotation.y += dt * 1.3;
      cp.mesh.rotation.z += dt * 0.9;
      if (cp.mesh.position.y < -0.3) {
        resetConfettiPiece(cp.mesh, false);
      }
    });

    if (controls) controls.update();
    if (renderer && scene && camera) renderer.render(scene, camera);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

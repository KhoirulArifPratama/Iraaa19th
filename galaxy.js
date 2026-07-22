
(function () {
  const DATA_FOTO = [
    { title: 'Celebrating achievements with that proud, confident posture, a precursor to all the accomplishments yet to come.', url: 'photos/foto7.jpeg' },
    { title: 'From a precious portrait to the extraordinary woman you are today.', url: 'photos/foto8.jpeg' },
    { title: 'Side by side, its clear whos always the family favorite the undeniable charm says it all.', url: 'photos/foto9.jpeg' },
    { title: 'Just a little girl with big dreams, resting ever so peacefully.', url: 'photos/foto10.jpeg' },
    { title: 'Captured by the lens, she was already destined for big things, as seen in her wide smile.', url: 'photos/foto11.jpeg' },
    { title: 'Even back then, you could already see that sparkling gaze of hers.', url: 'photos/foto12.jpeg' },
  ];

  let galaxyBuilt = false;

  window.initGalaxySceneIfNeeded = function () {
    if (galaxyBuilt) {
      // Sudah pernah dibangun — cukup putar ulang intro tiap kali halaman ini dibuka lagi
      if (typeof window.__galaxyReplayIntro === 'function') window.__galaxyReplayIntro();
      return;
    }
    if (typeof THREE === 'undefined') return; // CDN gagal dimuat (mis. offline)
    galaxyBuilt = true;
    // Tunggu 2 frame supaya container sudah benar-benar berukuran penuh (display:flex sudah diterapkan)
    requestAnimationFrame(() => requestAnimationFrame(buildGalaxyScene));
  };

  function buildGalaxyScene() {
    const container = document.getElementById('galaxy-webgl-container');
    const pageEl = document.getElementById('page-galaksi');
    if (!container || !pageEl) return;

    let W = container.clientWidth || window.innerWidth;
    let H = container.clientHeight || window.innerHeight;

    // --- TIMELINE INTRO (dalam detik, dihitung sejak intro dimulai) ---
    const T_FADE_IN_END = 1.0;
    const T_FORM_START = 1.0;
    const T_FORM_END = 3.6;
    const T_PULSE_END = 3.6; // Langsung transisi ke galaksi tanpa jeda diam
    const T_EXPLODE_END = 6.8;

    let animState = { phase: 'scatter', elapsed: 0, finished: false };
    let introStartTime = 0;
    let transitionSoundPlayed = false;
    let heartClicked = false;
    let explodeStartTime = null;

    // --- Efek Parallax & interaksi kursor ---
    let parallaxTargetX = 0, parallaxTargetY = 0;
    let parallaxCurX = 0, parallaxCurY = 0;
    let hoverMouseX = null, hoverMouseY = null;
    let sunGlowFactor = 0;

    function easeInOutCubic(x) { return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; }
    function easeOutCubic(x) { return 1 - Math.pow(1 - x, 3); }
    // Gentler start + gentler landing than cubic — used for the heart-to-galaxy
    // explosion so it eases into motion and settles instead of snapping.
    function easeInOutQuint(x) { return x < 0.5 ? 16 * x * x * x * x * x : 1 - Math.pow(-2 * x + 2, 5) / 2; }


    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x000000, 0.0024);

    function createNebulaBackground() {
      const size = 1024;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      // Base: deep space radial gradient
      const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2 * 1.4);
      grad.addColorStop(0, '#120320');
      grad.addColorStop(1, '#020106');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, size, size);
      // Tiny baked-in stars for extra depth behind the particle systems
      for (let i = 0; i < 500; i++) {
        const x = Math.random() * size;
        const y = Math.random() * size;
        const r = Math.random() * 1.2;
        ctx.globalAlpha = 0.2 + Math.random() * 0.7;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace || THREE.sRGBEncoding;
      return texture;
    }
    scene.background = createNebulaBackground();

    const camera = new THREE.PerspectiveCamera(60, W / H, 0.1, 1000);
    camera.position.set(0, 0, 70);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    if (THREE.ACESFilmicToneMapping) {
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.4;
    }
    container.appendChild(renderer.domElement);

    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxDistance = 260;
    controls.minDistance = 12;
    controls.enabled = false;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.55);
    scene.add(ambientLight);
    const hemiLight = new THREE.HemisphereLight(0xffc0e8, 0x2a1040, 0.6);
    scene.add(hemiLight);
    const keyLight = new THREE.DirectionalLight(0xffe4f0, 0.6);
    keyLight.position.set(40, 60, 50);
    scene.add(keyLight);
    const fillLight = new THREE.DirectionalLight(0xda70d6, 0.4);
    fillLight.position.set(-50, -20, -30);
    scene.add(fillLight);
    const violetLight = new THREE.PointLight(0xb060ff, 2, 260, 1.3);
    violetLight.position.set(0, 40, -90);
    scene.add(violetLight);

    // --- Nebula Glow (Cahaya Soft di Belakang Galaksi Utama) ---
    const nebulaGroup = new THREE.Group();
    const nebulaTexPink = createGlowHaloTexture('rgba(255, 75, 114, 0.14)', 512);
    const nebulaTexViolet = createGlowHaloTexture('rgba(176, 96, 255, 0.14)', 512);

    const nebulaPink = new THREE.Sprite(new THREE.SpriteMaterial({
      map: nebulaTexPink,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    }));
    nebulaPink.scale.set(160, 160, 1);
    nebulaGroup.add(nebulaPink);

    const nebulaViolet = new THREE.Sprite(new THREE.SpriteMaterial({
      map: nebulaTexViolet,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    }));
    nebulaViolet.scale.set(220, 220, 1);
    nebulaViolet.position.set(-15, 8, -5);
    nebulaGroup.add(nebulaViolet);

    scene.add(nebulaGroup);

    // --- Helper to build 3D Astronaut out of standard primitives ---
    function create3DAstronaut() {
      const astronaut = new THREE.Group();
      const whiteMat = new THREE.MeshPhongMaterial({ color: 0xffffff, roughness: 0.4, shininess: 30 });
      const redMat = new THREE.MeshPhongMaterial({ color: 0xff4b72, roughness: 0.4, shininess: 30 });

      // Helmet (White Sphere)
      const helmetGeom = new THREE.SphereGeometry(1.6, 16, 16);
      const helmet = new THREE.Mesh(helmetGeom, whiteMat);
      helmet.position.y = 1.4;
      astronaut.add(helmet);

      // Visor (Shiny blue/gold glass)
      const visorGeom = new THREE.SphereGeometry(0.9, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.5);
      const visorMat = new THREE.MeshPhongMaterial({ color: 0x00d2ff, shininess: 80, opacity: 0.9, transparent: true });
      const visor = new THREE.Mesh(visorGeom, visorMat);
      visor.rotation.x = Math.PI * 0.5;
      visor.position.set(0, 1.4, 0.85);
      astronaut.add(visor);

      // Body (White Cylinder)
      const bodyGeom = new THREE.CylinderGeometry(1.0, 1.2, 2.4, 16);
      const body = new THREE.Mesh(bodyGeom, whiteMat);
      body.position.y = -0.6;
      astronaut.add(body);

      // Red collar detail
      const collarGeom = new THREE.CylinderGeometry(1.15, 1.15, 0.2, 16);
      const collar = new THREE.Mesh(collarGeom, redMat);
      collar.position.y = 0.5;
      astronaut.add(collar);

      // Oxygen Tank (Backpack)
      const tankGeom = new THREE.BoxGeometry(1.6, 2.0, 0.8);
      const tank = new THREE.Mesh(tankGeom, whiteMat);
      tank.position.set(0, -0.6, -1.1);
      astronaut.add(tank);

      // Left Arm (White Cylinder)
      const armGeom = new THREE.CylinderGeometry(0.35, 0.35, 1.5, 8);
      const leftArm = new THREE.Mesh(armGeom, whiteMat);
      leftArm.position.set(-1.4, -0.2, 0);
      leftArm.rotation.z = Math.PI * 0.2;
      astronaut.add(leftArm);

      // Right Arm (White Cylinder - waving slightly!)
      const rightArm = new THREE.Mesh(armGeom, whiteMat);
      rightArm.position.set(1.4, 0.2, 0);
      rightArm.rotation.z = -Math.PI * 0.4;
      astronaut.add(rightArm);

      // Left Leg (White Cylinder)
      const legGeom = new THREE.CylinderGeometry(0.4, 0.35, 1.6, 8);
      const leftLeg = new THREE.Mesh(legGeom, whiteMat);
      leftLeg.position.set(-0.55, -2.4, 0);
      astronaut.add(leftLeg);

      // Right Leg (White Cylinder)
      const rightLeg = new THREE.Mesh(legGeom, whiteMat);
      rightLeg.position.set(0.55, -2.4, 0);
      astronaut.add(rightLeg);

      // Cute balloon attached to the hand!
      const stringGeom = new THREE.CylinderGeometry(0.02, 0.02, 5.0, 4);
      const stringMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const string = new THREE.Mesh(stringGeom, stringMat);
      string.position.set(2.0, 2.4, 0);
      string.rotation.z = -Math.PI * 0.15;
      astronaut.add(string);

      const balloonGeom = new THREE.SphereGeometry(1.2, 16, 16);
      const balloonMat = new THREE.MeshPhongMaterial({ color: 0xff85a1, roughness: 0.3, shininess: 40 });
      const balloon = new THREE.Mesh(balloonGeom, balloonMat);
      balloon.position.set(2.7, 5.2, 0);
      astronaut.add(balloon);

      astronaut.scale.set(0.001, 0.001, 0.001); // Initial scale for intro lerp
      return astronaut;
    }

    // --- Helper to build 3D Rocket ---
    function create3DRocket() {
      const rocket = new THREE.Group();
      const silverMat = new THREE.MeshPhongMaterial({ color: 0xffffff, roughness: 0.4, shininess: 40 });
      const redMat = new THREE.MeshPhongMaterial({ color: 0xff4b72, roughness: 0.4, shininess: 40 });

      // Rocket Body (Cylinder)
      const bodyGeom = new THREE.CylinderGeometry(1.2, 1.4, 4.5, 16);
      const body = new THREE.Mesh(bodyGeom, silverMat);
      rocket.add(body);

      // Rocket Nose Cone (Red Cone)
      const coneGeom = new THREE.ConeGeometry(1.25, 2.0, 16);
      const nose = new THREE.Mesh(coneGeom, redMat);
      nose.position.y = 3.25;
      rocket.add(nose);

      // Window (Circular shape on the body)
      const windowGeom = new THREE.CylinderGeometry(0.55, 0.55, 0.1, 16);
      const windowMat = new THREE.MeshPhongMaterial({ color: 0x00d2ff, shininess: 70 });
      const rWindow = new THREE.Mesh(windowGeom, windowMat);
      rWindow.rotation.x = Math.PI * 0.5;
      rWindow.position.set(0, 0.8, 1.3);
      rocket.add(rWindow);

      // Window border ring
      const ringGeom = new THREE.CylinderGeometry(0.65, 0.65, 0.08, 16);
      const ringMat = new THREE.MeshPhongMaterial({ color: 0xdcdcdc });
      const ring = new THREE.Mesh(ringGeom, ringMat);
      ring.rotation.x = Math.PI * 0.5;
      ring.position.set(0, 0.8, 1.28);
      rocket.add(ring);

      // Rocket Fin Left
      const finGeom = new THREE.BoxGeometry(0.2, 1.8, 1.2);
      const finLeft = new THREE.Mesh(finGeom, redMat);
      finLeft.position.set(-1.8, -1.8, 0);
      finLeft.rotation.z = Math.PI * 0.15;
      rocket.add(finLeft);

      // Rocket Fin Right
      const finRight = new THREE.Mesh(finGeom, redMat);
      finRight.position.set(1.8, -1.8, 0);
      finRight.rotation.z = -Math.PI * 0.15;
      rocket.add(finRight);

      // Rocket Fin Back
      const finBack = new THREE.Mesh(finGeom, redMat);
      finBack.position.set(0, -1.8, -1.8);
      finBack.rotation.x = Math.PI * 0.15;
      rocket.add(finBack);

      // Rocket Engine
      const engineGeom = new THREE.CylinderGeometry(0.8, 0.6, 0.6, 8);
      const darkMat = new THREE.MeshPhongMaterial({ color: 0x404040, shininess: 20 });
      const engine = new THREE.Mesh(engineGeom, darkMat);
      engine.position.y = -2.55;
      rocket.add(engine);

      // Flame Glow (pulsing cone)
      const flameGeom = new THREE.ConeGeometry(0.7, 1.8, 8);
      const flameMat = new THREE.MeshBasicMaterial({ color: 0xffa500, transparent: true, opacity: 0.85 });
      const flame = new THREE.Mesh(flameGeom, flameMat);
      flame.position.y = -3.7;
      flame.rotation.x = Math.PI;
      rocket.add(flame);

      rocket.userData = { flame };
      rocket.scale.set(0.001, 0.001, 0.001); // Initial scale for intro lerp
      return rocket;
    }

    // --- Helper to build 3D UFO ---
    function create3DUfo() {
      const ufo = new THREE.Group();
      
      const silverMat = new THREE.MeshPhongMaterial({ color: 0xd8d8d8, shininess: 80, metalness: 0.8 });
      const glassMat = new THREE.MeshPhongMaterial({ color: 0x00ffff, transparent: true, opacity: 0.6, shininess: 100 });
      const alienMat = new THREE.MeshPhongMaterial({ color: 0x39ff14, roughness: 0.2 });
      const eyeMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
      const rimLightMat = new THREE.MeshBasicMaterial({ color: 0x00ffff });

      // Main Saucer Body (Flattened Sphere)
      const bodyGeom = new THREE.SphereGeometry(2.2, 16, 16);
      const body = new THREE.Mesh(bodyGeom, silverMat);
      body.scale.set(1, 0.32, 1);
      ufo.add(body);

      // Middle ring bumper
      const ringGeom = new THREE.CylinderGeometry(2.35, 2.35, 0.15, 16);
      const ring = new THREE.Mesh(ringGeom, new THREE.MeshPhongMaterial({ color: 0xff4b72, shininess: 50 }));
      ufo.add(ring);

      // Cockpit Dome (Glass half-sphere)
      const domeGeom = new THREE.SphereGeometry(0.95, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.5);
      const dome = new THREE.Mesh(domeGeom, glassMat);
      dome.position.y = 0.32;
      ufo.add(dome);

      // Tiny Alien inside
      const alienGroup = new THREE.Group();
      alienGroup.position.set(0, 0.32, 0);
      
      // Alien Head (Green Sphere)
      const headGeom = new THREE.SphereGeometry(0.32, 8, 8);
      const head = new THREE.Mesh(headGeom, alienMat);
      alienGroup.add(head);

      // Alien Eyes (Two small black spheres)
      const eyeGeom = new THREE.SphereGeometry(0.05, 6, 6);
      const leftEye = new THREE.Mesh(eyeGeom, eyeMat);
      leftEye.position.set(-0.1, 0.08, 0.25);
      const rightEye = leftEye.clone();
      rightEye.position.x = 0.1;
      alienGroup.add(leftEye);
      alienGroup.add(rightEye);
      ufo.add(alienGroup);

      // UFO Lights (6 small bulbs around the rim)
      const lights = [];
      const numLights = 6;
      const lightGeom = new THREE.SphereGeometry(0.18, 8, 8);
      for (let i = 0; i < numLights; i++) {
        const angle = (i / numLights) * Math.PI * 2;
        const lMesh = new THREE.Mesh(lightGeom, new THREE.MeshBasicMaterial({ color: 0x00ffff }));
        lMesh.position.set(Math.cos(angle) * 2.1, 0, Math.sin(angle) * 2.1);
        ufo.add(lMesh);
        lights.push(lMesh);
      }

      // Abduction Beam (Transparent cone pointing down)
      const beamGeom = new THREE.ConeGeometry(1.4, 3.2, 16, 1, true); // open bottom
      const beamMat = new THREE.MeshBasicMaterial({
        color: 0x00ffcc,
        transparent: true,
        opacity: 0.12,
        side: THREE.DoubleSide
      });
      const beam = new THREE.Mesh(beamGeom, beamMat);
      beam.position.y = -1.75;
      ufo.add(beam);

      ufo.userData = { lights, beam };
      ufo.scale.set(0.001, 0.001, 0.001); // Initial scale for intro lerp
      return ufo;
    }

    // Instantiate and add to scene
    const astronaut = create3DAstronaut();
    astronaut.position.set(-32, 18, -10);
    scene.add(astronaut);

    const rocket = create3DRocket();
    rocket.position.set(32, -18, 5);
    scene.add(rocket);

    const ufo = create3DUfo();
    ufo.position.set(26, 26, -15);
    scene.add(ufo);

    function createCircleTexture(color, size) {
      const matCanvas = document.createElement('canvas');
      matCanvas.width = size;
      matCanvas.height = size;
      const matCtx = matCanvas.getContext('2d');
      const gradient = matCtx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
      gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
      gradient.addColorStop(0.2, color);
      gradient.addColorStop(0.5, color.replace('1)', '0.25)'));
      gradient.addColorStop(1, 'rgba(0,0,0,0)');
      matCtx.fillStyle = gradient;
      matCtx.fillRect(0, 0, size, size);
      const texture = new THREE.Texture(matCanvas);
      texture.needsUpdate = true;
      return texture;
    }

    function getHeartPoint(t, phi, scale = 1.2) {
      const x = 16 * Math.pow(Math.sin(t), 3);
      const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
      const z = Math.sin(phi) * Math.abs(x) * 0.4;
      return new THREE.Vector3(x * scale, y * scale, z * scale);
    }

    function getScatterPoint(spread = 140) {
      const r = spread * (0.5 + Math.random() * 0.5);
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      return new THREE.Vector3(r * Math.sin(phi) * Math.cos(theta), r * Math.sin(phi) * Math.sin(theta), r * Math.cos(phi));
    }

    const bgStarsCount = 3500;
    const bgGeometry = new THREE.BufferGeometry();
    const currentPositions = new Float32Array(bgStarsCount * 3);
    const scatterPositions = new Float32Array(bgStarsCount * 3);
    const heartPositions = new Float32Array(bgStarsCount * 3);
    const galaxyPositions = new Float32Array(bgStarsCount * 3);

    for (let i = 0; i < bgStarsCount; i++) {
      const sPoint = getScatterPoint(190);
      scatterPositions[i * 3] = sPoint.x;
      scatterPositions[i * 3 + 1] = sPoint.y;
      scatterPositions[i * 3 + 2] = sPoint.z;

      const t = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI * 2;
      const hPoint = getHeartPoint(t, phi, 1.35);
      
      // 72% particles on a tight 2D outline for a crisp, clean silhouette,
      // 28% volumetric scattering for soft ambient depth glow.
      if (Math.random() > 0.28) {
        heartPositions[i * 3] = hPoint.x + (Math.random() - 0.5) * 0.22;
        heartPositions[i * 3 + 1] = hPoint.y + (Math.random() - 0.5) * 0.22;
        heartPositions[i * 3 + 2] = (Math.random() - 0.5) * 0.32;
      } else {
        heartPositions[i * 3] = hPoint.x + (Math.random() - 0.5) * 1.8;
        heartPositions[i * 3 + 1] = hPoint.y + (Math.random() - 0.5) * 1.8;
        heartPositions[i * 3 + 2] = hPoint.z + (Math.random() - 0.5) * 1.8;
      }

      const r = 17 + Math.pow(Math.random(), 2.0) * 99;
      const arms = 2;
      const armOffset = (i % arms) * ((2 * Math.PI) / arms);
      const theta = r * 0.1 + armOffset + (Math.random() - 0.5) * 0.5;
      galaxyPositions[i * 3] = Math.cos(theta) * r + (Math.random() - 0.5) * 1.5;
      galaxyPositions[i * 3 + 1] = (Math.random() - 0.5) * (16 / (r + 2));
      galaxyPositions[i * 3 + 2] = Math.sin(theta) * r + (Math.random() - 0.5) * 1.5;

      currentPositions[i * 3] = scatterPositions[i * 3];
      currentPositions[i * 3 + 1] = scatterPositions[i * 3 + 1];
      currentPositions[i * 3 + 2] = scatterPositions[i * 3 + 2];
    }
    bgGeometry.setAttribute('position', new THREE.BufferAttribute(currentPositions, 3));

    // The main particle system glows a warm rose while it's shaped like a
    // heart, then smoothly cools into pure white as it blooms into the
    // starry galaxy spiral — makes the "love" moment feel distinct from
    // the "galaxy" moment instead of both looking identically white.
    const HEART_COLOR = new THREE.Color(0xff7aa0);
    const GALAXY_COLOR = new THREE.Color(0xffffff);
    const bgMaterial = new THREE.PointsMaterial({
      size: 1.0,
      map: createCircleTexture('rgba(255, 255, 255, 1)', 16),
      color: HEART_COLOR.clone(),
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const bgGalaxy = new THREE.Points(bgGeometry, bgMaterial);

    // A softer, larger, dimmer duplicate of the same points behind the sharp
    // ones — a cheap "glow"/bloom layer so the spiral reads much brighter.
    const bgGlowMaterial = new THREE.PointsMaterial({
      size: 2.6,
      map: createCircleTexture('rgba(255, 255, 255, 1)', 16),
      color: HEART_COLOR.clone(),
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const bgGlow = new THREE.Points(bgGeometry, bgGlowMaterial);

    const galaxyCore = new THREE.Group();
    galaxyCore.add(bgGlow);
    galaxyCore.add(bgGalaxy);
    scene.add(galaxyCore);

    const farStarsCount = 1200;
    const groupCount = Math.floor(farStarsCount / 3);

    // Group 1
    const farStarsGeom1 = new THREE.BufferGeometry();
    const farStarsPos1 = new Float32Array(groupCount * 3);
    for (let i = 0; i < groupCount; i++) {
      const p = getScatterPoint(460);
      farStarsPos1[i * 3] = p.x;
      farStarsPos1[i * 3 + 1] = p.y;
      farStarsPos1[i * 3 + 2] = p.z;
    }
    farStarsGeom1.setAttribute('position', new THREE.BufferAttribute(farStarsPos1, 3));
    const farStarsMat1 = new THREE.PointsMaterial({
      size: 0.8,
      map: createCircleTexture('rgba(255, 255, 255, 1)', 16),
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const farStars1 = new THREE.Points(farStarsGeom1, farStarsMat1);
    scene.add(farStars1);

    // Group 2
    const farStarsGeom2 = new THREE.BufferGeometry();
    const farStarsPos2 = new Float32Array(groupCount * 3);
    for (let i = 0; i < groupCount; i++) {
      const p = getScatterPoint(460);
      farStarsPos2[i * 3] = p.x;
      farStarsPos2[i * 3 + 1] = p.y;
      farStarsPos2[i * 3 + 2] = p.z;
    }
    farStarsGeom2.setAttribute('position', new THREE.BufferAttribute(farStarsPos2, 3));
    const farStarsMat2 = new THREE.PointsMaterial({
      size: 1.0,
      map: createCircleTexture('rgba(255, 255, 255, 1)', 16),
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const farStars2 = new THREE.Points(farStarsGeom2, farStarsMat2);
    scene.add(farStars2);

    // Group 3
    const farStarsGeom3 = new THREE.BufferGeometry();
    const farStarsPos3 = new Float32Array(groupCount * 3);
    for (let i = 0; i < groupCount; i++) {
      const p = getScatterPoint(460);
      farStarsPos3[i * 3] = p.x;
      farStarsPos3[i * 3 + 1] = p.y;
      farStarsPos3[i * 3 + 2] = p.z;
    }
    farStarsGeom3.setAttribute('position', new THREE.BufferAttribute(farStarsPos3, 3));
    const farStarsMat3 = new THREE.PointsMaterial({
      size: 0.9,
      map: createCircleTexture('rgba(255, 255, 255, 1)', 16),
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const farStars3 = new THREE.Points(farStarsGeom3, farStarsMat3);
    scene.add(farStars3);

    // --- 3D GLOWING STARS BACKGROUND (Extruded 3D Stars with glowing halos) ---
    function create5PointStarShape(outerRadius = 1.0, innerRadius = 0.48) {
      const shape = new THREE.Shape();
      const points = 5;
      for (let i = 0; i < points * 2; i++) {
        const r = (i % 2 === 0) ? outerRadius : innerRadius;
        const a = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
        const x = Math.cos(a) * r;
        const y = Math.sin(a) * r;
        if (i === 0) shape.moveTo(x, y); else shape.lineTo(x, y);
      }
      shape.closePath();
      return shape;
    }

    const glowing3DStarsGroup = new THREE.Group();
    const star3DShape = create5PointStarShape(1.25, 0.52);
    const star3DGeom = new THREE.ExtrudeGeometry(star3DShape, {
      depth: 0.3,
      bevelEnabled: true,
      bevelSegments: 3,
      steps: 1,
      bevelSize: 0.12,
      bevelThickness: 0.12,
    });
    star3DGeom.center();

    const starGlowTex = createGlowHaloTexture('rgba(255, 245, 215, 0.95)', 256);
    const starColors = [0xffea79, 0xff7da7, 0x70f3ff, 0xffffff, 0xffb5e8, 0xffbe76];
    const glowing3DStarsData = [];

    const num3DStars = 100;
    for (let i = 0; i < num3DStars; i++) {
      const starMeshGroup = new THREE.Group();
      const colorHex = starColors[i % starColors.length];
      
      const starMat = new THREE.MeshStandardMaterial({
        color: colorHex,
        emissive: colorHex,
        emissiveIntensity: 0.85,
        roughness: 0.2,
        metalness: 0.4,
      });

      const starMesh = new THREE.Mesh(star3DGeom, starMat);
      starMeshGroup.add(starMesh);

      // Glowing aura halo sprite around each 3D star
      const glowSpriteMat = new THREE.SpriteMaterial({
        map: starGlowTex,
        color: colorHex,
        transparent: true,
        blending: THREE.AdditiveBlending,
        opacity: 0.8,
        depthWrite: false,
      });
      const glowSprite = new THREE.Sprite(glowSpriteMat);
      const glowSize = 3.6 + Math.random() * 2.8;
      glowSprite.scale.set(glowSize, glowSize, 1);
      starMeshGroup.add(glowSprite);

      // Random position scattered in 3D space surrounding the galaxy
      const spread = 280;
      const x = (Math.random() - 0.5) * spread * 1.5;
      const y = (Math.random() - 0.5) * spread * 1.1;
      const z = (Math.random() - 0.5) * spread * 1.3 - 20;
      starMeshGroup.position.set(x, y, z);

      const baseScale = 0.5 + Math.random() * 1.5;
      starMeshGroup.scale.set(baseScale, baseScale, baseScale);

      glowing3DStarsGroup.add(starMeshGroup);

      glowing3DStarsData.push({
        group: starMeshGroup,
        mesh: starMesh,
        glow: glowSprite,
        rotSpeedX: (Math.random() - 0.5) * 0.02,
        rotSpeedY: (Math.random() - 0.5) * 0.025,
        rotSpeedZ: (Math.random() - 0.5) * 0.015,
        baseY: y,
        floatPhase: Math.random() * Math.PI * 2,
        floatSpeed: 0.6 + Math.random() * 1.2,
        baseScale: baseScale,
        twinkleSpeed: 1.4 + Math.random() * 2.6,
        twinklePhase: Math.random() * Math.PI * 2,
      });
    }
    scene.add(glowing3DStarsGroup);

    const interactiveStars = [];
    const starGroup = new THREE.Group();
    scene.add(starGroup);

    DATA_FOTO.forEach((foto, index) => {
      const singleStarObj = new THREE.Group();
      const phi = (1 + Math.sqrt(5)) / 2;
      const theta = index * ((2 * Math.PI) / (phi * phi));
      const r = Math.sqrt(index / DATA_FOTO.length) * 55 + 18;
      const y = (Math.random() - 0.5) * 1.5;
      const targetGalaksiPos = new THREE.Vector3(Math.cos(theta) * r, y, Math.sin(theta) * r);

      const heartTheta = (index / DATA_FOTO.length) * Math.PI * 2;
      const hPoint = getHeartPoint(heartTheta, Math.random() * Math.PI, 1.4);
      const scatterPoint = getScatterPoint(160);

      singleStarObj.position.copy(scatterPoint);
      starGroup.add(singleStarObj);

      const mat = new THREE.PointsMaterial({
        size: 8,
        map: createCircleTexture('rgba(255, 255, 255, 1)', 64),
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const pointsGeom = new THREE.BufferGeometry();
      pointsGeom.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, 0, 0]), 3));
      const starVisual = new THREE.Points(pointsGeom, mat);
      singleStarObj.add(starVisual);

      const geom = new THREE.SphereGeometry(1.5, 16, 16);
      const clickMeshMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 });
      const clickMesh = new THREE.Mesh(geom, clickMeshMat);
      singleStarObj.add(clickMesh);

      interactiveStars.push({
        group: singleStarObj, visual: starVisual, photoData: foto, pulse: Math.random() * 10,
        clickMesh, scatterPos: scatterPoint, heartPos: hPoint, galaxyPos: targetGalaksiPos,
      });
    });

    const textureLoader = new THREE.TextureLoader();

    function createGlowHaloTexture(color, size = 256) {
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
      grad.addColorStop(0, color);
      grad.addColorStop(0.55, color.replace('1)', '0.35)'));
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, size, size);
      return new THREE.CanvasTexture(canvas);
    }

    /* ---------------------------------------------------------
       HEART SHAPE — reuses the exact same curve as getHeartPoint()
       so every heart-shaped object in the scene matches the same
       orientation/proportions as the particle heart.
       --------------------------------------------------------- */
    function createHeartShape2D(scale = 1) {
      const shape = new THREE.Shape();
      const steps = 64;
      for (let i = 0; i <= steps; i++) {
        const a = (i / steps) * Math.PI * 2;
        const x = 16 * Math.pow(Math.sin(a), 3) * scale;
        const y = (13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a)) * scale;
        if (i === 0) shape.moveTo(x, y); else shape.lineTo(x, y);
      }
      return shape;
    }

    /* ---------------------------------------------------------
       CENTER HEART — the first photo becomes the glowing 3D heart
       at the middle of the galaxy. It's clickable just like the
       orbiting planets, and everything else orbits around it.
       --------------------------------------------------------- */
    const CENTER_FOTO = DATA_FOTO[0];
    const ORBIT_FOTOS = DATA_FOTO.slice(1); // the other 5 photos orbit around the center

    function createCenterHeart(fotoData) {
      const group = new THREE.Group();
      const spinGroup = new THREE.Group();
      group.add(spinGroup);

      const scale = 0.46;
      const heartShape = createHeartShape2D(scale);
      const depth = scale * 10;

      const bodyGeo = new THREE.ExtrudeGeometry(heartShape, {
        depth, bevelEnabled: true, bevelThickness: depth * 0.3, bevelSize: depth * 0.24, bevelSegments: 4, curveSegments: 28,
      });
      bodyGeo.center();
      const core = new THREE.Mesh(bodyGeo, new THREE.MeshStandardMaterial({
        color: 0xff85a1, emissive: 0xff5c8a, emissiveIntensity: 0.6, roughness: 0.45, metalness: 0.1,
      }));
      spinGroup.add(core);

      const faceGeo = new THREE.ShapeGeometry(heartShape, 28);
      faceGeo.center();
      const texture = textureLoader.load(fotoData.url);
      if (THREE.sRGBEncoding) texture.encoding = THREE.sRGBEncoding;
      const faceMat = new THREE.MeshStandardMaterial({
        map: texture, emissive: 0xffffff, emissiveMap: texture, emissiveIntensity: 0.35,
        roughness: 0.65, side: THREE.DoubleSide,
      });
      const face = new THREE.Mesh(faceGeo, faceMat);
      face.position.z = depth / 2 + 0.06;
      spinGroup.add(face);
      const backFace = new THREE.Mesh(faceGeo, faceMat);
      backFace.position.z = -depth / 2 - 0.06;
      backFace.rotation.y = Math.PI;
      spinGroup.add(backFace);

      const coronaTex = createGlowHaloTexture('rgba(255, 179, 198, 1)', 512);
      const halo1 = new THREE.Sprite(new THREE.SpriteMaterial({
        map: coronaTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.95,
      }));
      halo1.scale.set(20, 20, 1);
      group.add(halo1);

      const halo2 = new THREE.Sprite(new THREE.SpriteMaterial({
        map: coronaTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.55,
      }));
      halo2.scale.set(36, 36, 1);
      group.add(halo2);

      const sunLight = new THREE.PointLight(0xffb3c6, 7, 480, 1.6);
      group.add(sunLight);

      const clickGeom = new THREE.SphereGeometry(9, 16, 16);
      const clickMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 });
      const clickMesh = new THREE.Mesh(clickGeom, clickMat);
      group.add(clickMesh);

      scene.add(group);
      return { group, spinGroup, halo1, halo2, clickMesh, sunLight, photoData: fotoData };
    }
    const sun = createCenterHeart(CENTER_FOTO);

    // --- Central Glowing Pearl Orb for Intro ---
    const pearlGeo = new THREE.SphereGeometry(2.2, 32, 32);
    const pearlMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.1,
      metalness: 0.1,
      emissive: 0xffeef4,
      emissiveIntensity: 0.4,
      transparent: true,
      opacity: 1
    });
    const centralOrb = new THREE.Mesh(pearlGeo, pearlMat);
    scene.add(centralOrb);

    /* ---------------------------------------------------------
       PLANETS — the other 5 photos become heart-shaped "planets":
       a plush 3D heart body with the photo cut into a heart on the
       front face, orbiting the center heart like a little solar
       system. All hearts share the same pink palette.
       --------------------------------------------------------- */
    const PLANET_BODY_COLORS = [0xff85a1, 0xff85a1, 0xff85a1, 0xff85a1, 0xff85a1];
    const PLANET_ATMO_COLORS = ['rgba(255, 133, 161, 1)', 'rgba(255, 133, 161, 1)', 'rgba(255, 133, 161, 1)', 'rgba(255, 133, 161, 1)', 'rgba(255, 133, 161, 1)'];

    const photoPlanets = [];
    ORBIT_FOTOS.forEach((foto, idx) => {
      const group = new THREE.Group();
      const spinGroup = new THREE.Group();
      group.add(spinGroup);

      const scale = 0.16 + (idx % 3) * 0.032;
      const heartShape = createHeartShape2D(scale);
      const depth = scale * 10;

      // Plush 3D heart body — same pink as the center heart
      const bodyGeo = new THREE.ExtrudeGeometry(heartShape, {
        depth, bevelEnabled: true, bevelThickness: depth * 0.32, bevelSize: depth * 0.26, bevelSegments: 3, curveSegments: 24,
      });
      bodyGeo.center();
      const bodyMat = new THREE.MeshStandardMaterial({
        color: 0xff85a1,
        emissive: 0xff5c8a,
        emissiveIntensity: 0.55,
        roughness: 0.45,
        metalness: 0.1,
      });
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      spinGroup.add(body);

      // Photo cut into the same heart silhouette, sitting just in front
      const faceGeo = new THREE.ShapeGeometry(heartShape, 24);
      faceGeo.center();
      const texture = textureLoader.load(foto.url);
      if (THREE.sRGBEncoding) texture.encoding = THREE.sRGBEncoding;
      const faceMat = new THREE.MeshStandardMaterial({
        map: texture, emissive: 0xffffff, emissiveMap: texture, emissiveIntensity: 0.32,
        roughness: 0.7, side: THREE.DoubleSide,
      });
      const face = new THREE.Mesh(faceGeo, faceMat);
      face.position.z = depth / 2 + 0.04;
      spinGroup.add(face);
      // ...and mirrored on the back so it still reads nicely from behind
      const backFace = new THREE.Mesh(faceGeo, faceMat);
      backFace.position.z = -depth / 2 - 0.04;
      backFace.rotation.y = Math.PI;
      spinGroup.add(backFace);

      // Soft pink atmosphere glow behind the heart
      const heartSpan = 32 * scale;
      const atmosphere = new THREE.Sprite(new THREE.SpriteMaterial({
        map: createGlowHaloTexture(PLANET_ATMO_COLORS[idx % PLANET_ATMO_COLORS.length]),
        transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.5,
      }));
      atmosphere.scale.set(heartSpan * 1.9, heartSpan * 1.9, 1);
      spinGroup.add(atmosphere);

      // A couple of the planets get a decorative ring for variety
      if (idx === 1 || idx === 3) {
        const ringGeom = new THREE.RingGeometry(heartSpan * 0.62, heartSpan * 0.82, 48);
        const ringMat = new THREE.MeshBasicMaterial({
          color: idx === 1 ? 0xffcfe2 : 0xff8fb8, side: THREE.DoubleSide, transparent: true, opacity: 0.55,
        });
        const ring = new THREE.Mesh(ringGeom, ringMat);
        ring.rotation.x = Math.PI / 2.3;
        ring.rotation.z = 0.3;
        spinGroup.add(ring);
      }

      // Invisible click hitbox — use a large fixed radius (10 units) so planets
      // are easy to click regardless of their scale or orbital distance.
      const clickGeom = new THREE.SphereGeometry(10, 12, 12);
      const clickMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });
      const clickMesh = new THREE.Mesh(clickGeom, clickMat);
      group.add(clickMesh);

      scene.add(group);

      // Faint orbit path ring so the "solar system" layout reads clearly
      const orbitRadius = 46 + idx * 22 + (Math.random() - 0.5) * 20; // Spread out more
      const orbitPts = [];
      for (let a = 0; a <= 72; a++) {
        const ang = (a / 72) * Math.PI * 2;
        orbitPts.push(new THREE.Vector3(Math.cos(ang) * orbitRadius, 0, Math.sin(ang) * orbitRadius));
      }
      const orbitLine = new THREE.LineLoop(
        new THREE.BufferGeometry().setFromPoints(orbitPts),
        new THREE.LineBasicMaterial({ color: 0xffb3d1, transparent: true, opacity: 0.03 })
      );
      scene.add(orbitLine);

      const orbitSpeed = 0.05 + 0.025 * idx + Math.random() * 0.03;
      const startAngle = (idx / ORBIT_FOTOS.length) * Math.PI * 2 + (Math.random() - 0.5) * 1.5;
      const orbitTiltOffset = (idx % 2 === 0 ? 1 : -1) * (5 + idx * 2) + (Math.random() - 0.5) * 15;
      const spinSpeed = 0.12 + Math.random() * 0.22;

      photoPlanets.push({
        group, spinGroup, clickMesh, photoData: foto,
        radius: orbitRadius, speed: orbitSpeed, angle: startAngle, tiltOffset: orbitTiltOffset, spinSpeed,
      });
      group.scale.set(0.001, 0.001, 0.001);
    });

    function createGlowingHeartTexture(size = 128) {
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `${size * 0.62}px "Segoe UI Symbol", "Segoe UI Emoji", sans-serif`;
      ctx.shadowColor = 'rgba(255, 20, 147, 1)';
      ctx.shadowBlur = size * 0.45;
      ctx.fillStyle = 'rgba(255, 105, 180, 1)';
      ctx.fillText('❤', size / 2, size / 2 + size * 0.04);
      ctx.fillText('❤', size / 2, size / 2 + size * 0.04);
      ctx.shadowBlur = size * 0.15;
      ctx.fillStyle = 'rgba(255, 210, 235, 1)';
      ctx.fillText('❤', size / 2, size / 2 + size * 0.04);
      return new THREE.CanvasTexture(canvas);
    }

    const heartGlowTexture = createGlowingHeartTexture();
    const floatingEmojis = [];
    const emojiCount = 140;
    for (let i = 0; i < emojiCount; i++) {
      const emojiMat = new THREE.SpriteMaterial({ map: heartGlowTexture, transparent: true, depthWrite: false, opacity: 0, blending: THREE.AdditiveBlending });
      const sprite = new THREE.Sprite(emojiMat);
      const orbitR = 40 + Math.random() * 105;
      const startA = Math.random() * Math.PI * 2;
      const baseY = (Math.random() - 0.5) * 50;
      const scaleV = 1.2 + Math.random() * 2.4;
      sprite.scale.set(scaleV, scaleV, 1);
      sprite.position.set(Math.cos(startA) * orbitR, baseY, Math.sin(startA) * orbitR);
      scene.add(sprite);
      floatingEmojis.push({
        sprite, radius: orbitR, angle: startA, baseY,
        orbitSpeed: 0.03 + Math.random() * 0.07, bobSpeed: 0.4 + Math.random() * 0.8,
        bobOffset: Math.random() * Math.PI * 2, bobAmount: 1.5 + Math.random() * 2.5,
        maxOpacity: 0.6 + Math.random() * 0.4,
      });
    }

    const titleLabel = document.getElementById('galaxy-title-label');





    function startIntroAnimation() {
      animState.phase = 'scatter';
      animState.elapsed = 0;
      animState.finished = false;
      introStartTime = clock.getElapsedTime();
      transitionSoundPlayed = false;
      heartClicked = false;
      explodeStartTime = null;

      camera.position.set(0, 0, 70);
      if (controls) {
        controls.target.set(0, 0, 0);
        controls.enabled = false;
        controls.update();
      }

      if (titleLabel) titleLabel.classList.remove('visible');

      sun.group.scale.set(0.001, 0.001, 0.001); // Hide main heart during intro
      centralOrb.scale.set(0.001, 0.001, 0.001);
      centralOrb.material.opacity = 1;

      photoPlanets.forEach((p) => p.group.scale.set(0.001, 0.001, 0.001));
      floatingEmojis.forEach((f) => (f.sprite.material.opacity = 0));
      if (astronaut) astronaut.scale.set(0.001, 0.001, 0.001);
      if (rocket) rocket.scale.set(0.001, 0.001, 0.001);
      if (ufo) ufo.scale.set(0.001, 0.001, 0.001);

      bgMaterial.opacity = 0;
      bgMaterial.color.copy(HEART_COLOR);
      bgGlowMaterial.opacity = 0;
      bgGlowMaterial.color.copy(HEART_COLOR);
      transitionSoundPlayed = false;
      const posAttr = bgGeometry.getAttribute('position');
      for (let i = 0; i < bgStarsCount; i++) {
        posAttr.setXYZ(i, scatterPositions[i * 3], scatterPositions[i * 3 + 1], scatterPositions[i * 3 + 2]);
      }
      posAttr.needsUpdate = true;

      interactiveStars.forEach((star) => {
        star.group.position.copy(star.scatterPos);
        star.visual.material.opacity = 0;
      });
    }
    window.__galaxyReplayIntro = startIntroAnimation;

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let pointerStartX = 0;
    let pointerStartY = 0;
    let pointerStartTime = 0;
    let lastTapHandledTime = 0;

    function handleInteractionStart(clientX, clientY) {
      pointerStartX = clientX;
      pointerStartY = clientY;
      pointerStartTime = performance.now();
    }

    function handleInteractionEnd(clientX, clientY, targetEl) {
      if (!pageEl.classList.contains('active-page')) return;
      if (targetEl && targetEl.closest && targetEl.closest('.galaxy-popup-overlay, .galaxy-back-btn, .galaxy-next-btn, button')) {
        return;
      }

      // Prevent duplicate triggers if both pointerup & touchend fire in rapid succession
      const now = performance.now();
      if (now - lastTapHandledTime < 300) return;

      const diffX = Math.abs(clientX - pointerStartX);
      const diffY = Math.abs(clientY - pointerStartY);
      const duration = now - pointerStartTime;

      const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
      const maxDragThreshold = isTouch ? 18 : 6;

      if (diffX > maxDragThreshold || diffY > maxDragThreshold || duration > 650) {
        return; // Drag/swipe gesture, ignore
      }

      lastTapHandledTime = now;

      // Jika bentuk Hati sudah terbentuk tapi belum diklik/tap untuk meledak:
      if (!heartClicked && clock.getElapsedTime() - introStartTime >= T_FORM_END) {
        heartClicked = true;
        explodeStartTime = clock.getElapsedTime();
        explodeCamStart.copy(camera.position);
        if (typeof window.playGalaxyTransition === 'function') {
          window.playGalaxyTransition(3.2);
        }
        return;
      }

      if (!animState.finished) return;

      performRaycastAt(clientX, clientY);
    }

    function performRaycastAt(clientX, clientY) {
      const rect = container.getBoundingClientRect();
      mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);

      // First try: direct hit on any click hitbox (fast path)
      const clickHitboxes = interactiveStars.map((s) => s.clickMesh).concat(
        photoPlanets.map((p) => p.clickMesh),
        [sun.clickMesh]
      );
      let intersects = raycaster.intersectObjects(clickHitboxes);

      // Second try: recursive hit against every mesh inside planet groups
      if (intersects.length === 0) {
        const allPlanetGroups = photoPlanets.map((p) => p.group).concat(
          interactiveStars.map((s) => s.group),
          [sun.group]
        );
        intersects = raycaster.intersectObjects(allPlanetGroups, true);
      }

      if (intersects.length > 0) {
        const clickedObj = intersects[0].object;

        let found = null;
        const allTargets = [
          ...interactiveStars.map((s) => ({ clickMesh: s.clickMesh, group: s.group, photoData: s.photoData })),
          ...photoPlanets.map((p) => ({ clickMesh: p.clickMesh, group: p.group, photoData: p.photoData })),
          { clickMesh: sun.clickMesh, group: sun.group, photoData: sun.photoData },
        ];

        found = allTargets.find((t) => t.clickMesh === clickedObj);

        if (!found) {
          let node = clickedObj.parent;
          while (node && !found) {
            found = allTargets.find((t) => t.group === node);
            node = node.parent;
          }
        }

        if (found && found.photoData) {
          bukaFoto(found.photoData);
        }
      }
    }

    // Melacak posisi kursor/touch untuk efek parallax latar galaksi
    window.addEventListener('mousemove', (e) => {
      if (!pageEl.classList.contains('active-page')) { hoverMouseX = null; hoverMouseY = null; return; }
      const rect = container.getBoundingClientRect();
      hoverMouseX = e.clientX - rect.left;
      hoverMouseY = e.clientY - rect.top;
      parallaxTargetX = (hoverMouseX / rect.width) * 2 - 1;
      parallaxTargetY = (hoverMouseY / rect.height) * 2 - 1;
    });
    window.addEventListener('mouseleave', () => { hoverMouseX = null; hoverMouseY = null; });

    // Pointer events for modern touch & mouse
    window.addEventListener('pointerdown', (e) => {
      if (!pageEl.classList.contains('active-page')) return;
      handleInteractionStart(e.clientX, e.clientY);
    });

    window.addEventListener('pointerup', (e) => {
      if (!pageEl.classList.contains('active-page')) return;
      handleInteractionEnd(e.clientX, e.clientY, e.target);
    });

    // Touch event fallback for mobile devices
    window.addEventListener('touchstart', (e) => {
      if (!pageEl.classList.contains('active-page')) return;
      if (e.touches && e.touches.length > 0) {
        handleInteractionStart(e.touches[0].clientX, e.touches[0].clientY);
      }
    }, { passive: true });

    window.addEventListener('touchend', (e) => {
      if (!pageEl.classList.contains('active-page')) return;
      if (e.changedTouches && e.changedTouches.length > 0) {
        handleInteractionEnd(e.changedTouches[0].clientX, e.changedTouches[0].clientY, e.target);
      }
    }, { passive: true });


    function bukaFoto(data) {
      const overlay = document.getElementById('galaxy-popup-overlay');
      const img = document.getElementById('galaxy-popup-img');
      const title = document.getElementById('galaxy-popup-title');
      if (!overlay || !img || !title) return;
      img.src = data.url;
      title.textContent = data.title;
      overlay.classList.remove('hidden');
      if (typeof playSfx === 'function') playSfx('click');
      controls.enabled = false;
    }

    function closeGalaxyPopup() {
      const overlay = document.getElementById('galaxy-popup-overlay');
      if (overlay) overlay.classList.add('hidden');
      controls.enabled = true;
      if (typeof playSfx === 'function') playSfx('click');
    }

    const galaxyPopupOverlay = document.getElementById('galaxy-popup-overlay');
    const galaxyPopupClose = document.getElementById('galaxy-popup-close');
    if (galaxyPopupClose) galaxyPopupClose.addEventListener('click', closeGalaxyPopup);
    if (galaxyPopupOverlay) {
      galaxyPopupOverlay.addEventListener('click', (e) => {
        if (e.target === galaxyPopupOverlay) closeGalaxyPopup();
      });
    }

    let shootingStarInterval = null;

    function spawnShootingStar() {
      const container = document.getElementById('galaxy-shooting-stars');
      const pageEl = document.getElementById('page-galaksi');
      if (!container || !pageEl || !pageEl.classList.contains('active-page')) return;

      const star = document.createElement('div');
      star.className = 'u-shooting-star';
      
      // Random position (upper part of screen mostly)
      star.style.top = (Math.random() * 45) + '%';
      star.style.left = (Math.random() * 60 + 20) + '%';
      
      // Random scaling
      const scale = 0.45 + Math.random() * 0.85;
      star.style.transform = `scale(${scale}) rotate(-30deg)`;
      
      container.appendChild(star);

      // Remove after animation completes
      setTimeout(() => {
        star.remove();
      }, 1500);
    }

    function startShootingStars() {
      if (shootingStarInterval) return;
      spawnShootingStar();
      shootingStarInterval = setInterval(() => {
        if (Math.random() > 0.25) {
          spawnShootingStar();
        }
      }, 4200);
    }

    function stopShootingStars() {
      if (shootingStarInterval) {
        clearInterval(shootingStarInterval);
        shootingStarInterval = null;
      }
      const container = document.getElementById('galaxy-shooting-stars');
      if (container) container.innerHTML = '';
    }

    const clock = new THREE.Clock();
    const explodeCamStart = new THREE.Vector3();
    const camTargetPos = new THREE.Vector3(0, 55, 130);

    function animate() {
      requestAnimationFrame(animate);

      // Hemat kerja render saat halaman Galaksi sedang tidak aktif
      if (!pageEl.classList.contains('active-page')) {
        stopShootingStars();
        return;
      }

      startShootingStars();

      const delta = clock.getDelta();
      const elapsedTime = clock.getElapsedTime();
      const t = elapsedTime - introStartTime;

      if (!animState.finished) {
        const posAttr = bgGeometry.getAttribute('position');

        // Kecerahan taburan bintang putih di bagian "hati" dijaga lebih lembut
        // (tidak sesilau dulu) supaya wajah hati di tengah tetap terlihat jelas;
        // begitu meledak jadi galaksi, kecerahannya dikembalikan penuh seperti semula.
        const HEART_WHITE_OPACITY = 0.6;
        const HEART_GLOW_OPACITY = 0.28;
        const HEART_STAR_OPACITY = 0.7;

        if (t <= T_FADE_IN_END) {
          const fadeProgress = easeOutCubic(Math.min(t / T_FADE_IN_END, 1));
          bgMaterial.opacity = fadeProgress * HEART_WHITE_OPACITY;
          bgGlowMaterial.opacity = fadeProgress * HEART_GLOW_OPACITY;
          interactiveStars.forEach((star) => { star.visual.material.opacity = fadeProgress * HEART_STAR_OPACITY; });
        } else if (t <= T_FORM_END || !heartClicked) {
          bgMaterial.opacity = HEART_WHITE_OPACITY;
          bgGlowMaterial.opacity = HEART_GLOW_OPACITY;
          const formProgress = easeInOutCubic(Math.min((t - T_FORM_START) / (T_FORM_END - T_FORM_START), 1));
          for (let i = 0; i < bgStarsCount; i++) {
            const sx = scatterPositions[i * 3], sy = scatterPositions[i * 3 + 1], sz = scatterPositions[i * 3 + 2];
            const hx = heartPositions[i * 3], hy = heartPositions[i * 3 + 1], hz = heartPositions[i * 3 + 2];
            posAttr.setXYZ(i, sx + (hx - sx) * formProgress, sy + (hy - sy) * formProgress, sz + (hz - sz) * formProgress);
          }
          posAttr.needsUpdate = true;
          interactiveStars.forEach((star) => {
            star.visual.material.opacity = HEART_STAR_OPACITY;
            star.group.position.lerpVectors(star.scatterPos, star.heartPos, formProgress);
          });
        } else {
          const explodeElapsed = clock.getElapsedTime() - explodeStartTime;
          const explodeDuration = 3.2;
          const explodeProgress = easeInOutQuint(Math.min(explodeElapsed / explodeDuration, 1));

          if (explodeProgress < 1.0) {
            // Kembalikan kecerahan penuh secara bertahap saat hati pecah jadi galaksi
            bgMaterial.opacity = HEART_WHITE_OPACITY + (1.0 - HEART_WHITE_OPACITY) * explodeProgress;
            bgGlowMaterial.opacity = HEART_GLOW_OPACITY + (0.6 - HEART_GLOW_OPACITY) * explodeProgress;
            bgMaterial.color.copy(HEART_COLOR).lerp(GALAXY_COLOR, explodeProgress);
            bgGlowMaterial.color.copy(HEART_COLOR).lerp(GALAXY_COLOR, explodeProgress);
            
            centralOrb.scale.set(1.0 - explodeProgress, 1.0 - explodeProgress, 1.0 - explodeProgress);
            centralOrb.material.opacity = 1.0 - explodeProgress;
            sun.group.scale.set(explodeProgress, explodeProgress, explodeProgress);

            for (let i = 0; i < bgStarsCount; i++) {
              const hx = heartPositions[i * 3], hy = heartPositions[i * 3 + 1], hz = heartPositions[i * 3 + 2];
              const gx = galaxyPositions[i * 3], gy = galaxyPositions[i * 3 + 1], gz = galaxyPositions[i * 3 + 2];
              posAttr.setXYZ(i, hx + (gx - hx) * explodeProgress, hy + (gy - hy) * explodeProgress, hz + (gz - hz) * explodeProgress);
            }
            posAttr.needsUpdate = true;
            interactiveStars.forEach((star) => { star.group.position.lerpVectors(star.heartPos, star.galaxyPos, explodeProgress); });
            photoPlanets.forEach((p) => { p.group.scale.set(explodeProgress, explodeProgress, explodeProgress); });
            floatingEmojis.forEach((f) => { f.sprite.material.opacity = explodeProgress * f.maxOpacity; });
            if (astronaut) astronaut.scale.set(1.5 * explodeProgress, 1.5 * explodeProgress, 1.5 * explodeProgress);
            if (rocket) rocket.scale.set(1.3 * explodeProgress, 1.3 * explodeProgress, 1.3 * explodeProgress);
            if (ufo) ufo.scale.set(1.4 * explodeProgress, 1.4 * explodeProgress, 1.4 * explodeProgress);

            camera.position.lerpVectors(explodeCamStart, camTargetPos, explodeProgress);
            galaxyCore.rotation.y += delta * (0.12 + explodeProgress * 0.3);
            starGroup.rotation.y = galaxyCore.rotation.y;
          } else {
            animState.finished = true;
            controls.enabled = true;
            if (titleLabel) titleLabel.classList.add('visible');
            photoPlanets.forEach((p) => p.group.scale.set(1, 1, 1));
            floatingEmojis.forEach((f) => { f.sprite.material.opacity = f.maxOpacity; });
            if (astronaut) astronaut.scale.set(1.5, 1.5, 1.5);
            if (rocket) rocket.scale.set(1.3, 1.3, 1.3);
            if (ufo) ufo.scale.set(1.4, 1.4, 1.4);
          }
        }
      }

      if (!animState.finished) {
        if (t > T_FORM_START && t <= T_PULSE_END) {
          const pulseScale = 1.0 + Math.sin(elapsedTime * 6.0) * 0.04;
          galaxyCore.scale.set(pulseScale, pulseScale, pulseScale);
          starGroup.scale.set(pulseScale, pulseScale, pulseScale);
          
          // Pulse the central pearl orb in sync
          centralOrb.scale.set(pulseScale, pulseScale, pulseScale);
        } else {
          galaxyCore.scale.set(1, 1, 1);
          starGroup.scale.set(1, 1, 1);
          
          if (t <= T_FORM_START) {
            // Fade in the central orb at the very beginning
            const fadeProgress = easeOutCubic(Math.min(t / T_FADE_IN_END, 1));
            centralOrb.scale.set(fadeProgress, fadeProgress, fadeProgress);
          }
        }
        if (t <= T_PULSE_END) {
          // Bentuk hati berputar pelan sepanjang fase pembentukan & jeda,
          // supaya terasa hidup/berdenyut, bukan diam kaku sebelum meledak.
          galaxyCore.rotation.y = elapsedTime * 0.028;
          starGroup.rotation.y = elapsedTime * 0.028;
        }
      } else {
        galaxyCore.scale.set(1, 1, 1);
        starGroup.scale.set(1, 1, 1);
        galaxyCore.rotation.y = elapsedTime * 0.085;
        starGroup.rotation.y = elapsedTime * 0.085;

        photoPlanets.forEach((p) => {
          p.angle += delta * p.speed * 1.8;
          const yPos = Math.sin(p.angle * 0.8) * 8 + p.tiltOffset * 0.4 + Math.cos(elapsedTime * 0.5 + p.radius * 0.1) * 4;
          p.group.position.set(Math.cos(p.angle) * p.radius, yPos, Math.sin(p.angle) * p.radius);
          p.spinGroup.rotation.y += delta * p.spinSpeed * 1.8;

          // Hover interaction effect
          let targetScale = 1.0;
          if (hoverMouseX !== null) {
            const ndcPos = p.group.position.clone().project(camera);
            const sx = (ndcPos.x * 0.5 + 0.5) * W;
            const sy = (-ndcPos.y * 0.5 + 0.5) * H;
            const dist = Math.hypot(sx - hoverMouseX, sy - hoverMouseY);
            if (dist < 60 && ndcPos.z < 1) { // within 60 pixels and in front of camera
              targetScale = 1.35;
              p.spinGroup.rotation.y += delta * 2.5; // Spin faster on hover
            }
          }
          p.currentScale = p.currentScale || 1.0;
          p.currentScale += (targetScale - p.currentScale) * delta * 6;
          p.group.scale.set(p.currentScale, p.currentScale, p.currentScale);
        });

        floatingEmojis.forEach((f) => {
          f.angle += delta * f.orbitSpeed * 1.5;
          const y = f.baseY + Math.sin(elapsedTime * f.bobSpeed + f.bobOffset) * f.bobAmount;
          f.sprite.position.set(Math.cos(f.angle) * f.radius, y, Math.sin(f.angle) * f.radius);
        });
      }

      sun.spinGroup.rotation.y = elapsedTime * 0.12;

      // --- Glow lembut saat kursor mendekati hati di pusat galaksi ---
      let targetGlow = 0;
      let sunTargetScale = 1.0;
      if (hoverMouseX !== null && animState.finished) {
        const ndcPos = sun.group.position.clone().project(camera);
        const sx = (ndcPos.x * 0.5 + 0.5) * W;
        const sy = (-ndcPos.y * 0.5 + 0.5) * H;
        const dist = Math.hypot(sx - hoverMouseX, sy - hoverMouseY);
        const maxDist = Math.min(W, H) * 0.3;
        const proximity = Math.max(0, 1 - dist / maxDist);
        targetGlow = proximity * proximity;

        if (dist < 80 && ndcPos.z < 1) {
          sunTargetScale = 1.25;
          sun.spinGroup.rotation.y += delta * 2.0; // spin faster
        }
      }
      sunGlowFactor += (targetGlow - sunGlowFactor) * Math.min(delta * 5, 1);

      sun.currentScale = sun.currentScale || 1.0;
      sun.currentScale += (sunTargetScale - sun.currentScale) * delta * 6;
      if (animState.finished) {
        sun.group.scale.set(sun.currentScale, sun.currentScale, sun.currentScale);
      }

      const glowBoost = 1 + sunGlowFactor * 0.55;
      const sunPulse = (1.0 + Math.sin(elapsedTime * 1.4) * 0.06) * glowBoost;
      sun.halo1.scale.set(20 * sunPulse, 20 * sunPulse, 1);
      sun.halo1.material.opacity = Math.min(1, 0.95 + sunGlowFactor * 0.3);
      const halo2Pulse = (1.0 + Math.sin(elapsedTime * 1.4 + 1.1) * 0.08) * glowBoost;
      sun.halo2.scale.set(36 * halo2Pulse, 36 * halo2Pulse, 1);
      sun.halo2.material.opacity = Math.min(1, 0.55 + sunGlowFactor * 0.4);
      if (sun.sunLight) sun.sunLight.intensity = 7 + sunGlowFactor * 7;

      interactiveStars.forEach((star) => {
        star.pulse += 0.04;
        const scaleValue = 1.0 + Math.sin(star.pulse) * 0.25;
        star.visual.scale.set(scaleValue, scaleValue, scaleValue);
        // Once the intro settles, the framed photos take over as the visible
        // element — fade out the bright pulsing marker so it doesn't glare
        // on top of the photos anymore (the click target stays active).
        if (animState.finished && star.visual.material.opacity > 0) {
          star.visual.material.opacity = Math.max(0, star.visual.material.opacity - delta * 1.4);
        }
      });

      // Astronaut floating & waving
      if (astronaut) {
        astronaut.position.y = 18 + Math.sin(elapsedTime * 0.8) * 3.0;
        astronaut.position.x = -32 + Math.cos(elapsedTime * 0.4) * 2.0;
        astronaut.position.z = -10 + Math.sin(elapsedTime * 0.5) * 2.0;
        astronaut.rotation.y = elapsedTime * 0.25;
        astronaut.rotation.x = Math.sin(elapsedTime * 0.3) * 0.1;
        astronaut.rotation.z = Math.cos(elapsedTime * 0.4) * 0.15;
      }

      // Rocket flying
      if (rocket) {
        rocket.position.y = -18 + Math.sin(elapsedTime * 1.1) * 2.5;
        rocket.position.x = 32 + Math.cos(elapsedTime * 0.6) * 2.5;
        rocket.position.z = 5 + Math.sin(elapsedTime * 0.7) * 2.0;
        rocket.rotation.y = elapsedTime * 0.35;
        rocket.rotation.x = Math.sin(elapsedTime * 0.4) * 0.1;
        rocket.rotation.z = Math.PI * 0.1 + Math.cos(elapsedTime * 0.6) * 0.15;

        if (rocket.userData.flame) {
          const fs = 0.85 + Math.sin(elapsedTime * 18.0) * 0.15;
          rocket.userData.flame.scale.set(fs, fs, fs);
        }
      }

      // UFO flying & spinning
      if (ufo) {
        ufo.position.y = 25 + Math.sin(elapsedTime * 1.4) * 2.5;
        ufo.position.x = 25 + Math.cos(elapsedTime * 0.7) * 2.0;
        ufo.position.z = -15 + Math.sin(elapsedTime * 0.9) * 1.5;
        ufo.rotation.y = elapsedTime * 2.0;
        ufo.rotation.x = Math.sin(elapsedTime * 0.8) * 0.12;
        ufo.rotation.z = Math.cos(elapsedTime * 0.5) * 0.1;

        if (ufo.userData.beam) {
          ufo.userData.beam.material.opacity = 0.12 + Math.sin(elapsedTime * 8) * 0.06;
        }

        if (ufo.userData.lights) {
          const colors = [0x00ffff, 0xff00ff, 0xffff00, 0x39ff14, 0xff4b72, 0x00ffcc];
          ufo.userData.lights.forEach((l, idx) => {
            const cIdx = Math.floor((elapsedTime * 5 + idx) % colors.length);
            l.material.color.setHex(colors[cIdx]);
          });
        }
      }

      // Nebula Glow animations
      if (nebulaPink && nebulaViolet) {
        nebulaPink.material.rotation = elapsedTime * 0.015;
        nebulaViolet.material.rotation = -elapsedTime * 0.01;
        
        const nebulaPulse = 1.0 + Math.sin(elapsedTime * 0.55) * 0.04;
        nebulaPink.scale.set(160 * nebulaPulse, 160 * nebulaPulse, 1);
        nebulaViolet.scale.set(220 * nebulaPulse, 220 * nebulaPulse, 1);
      }

      farStars1.rotation.y = elapsedTime * 0.006;
      farStarsMat1.opacity = 0.4 + Math.sin(elapsedTime * 1.8) * 0.25;

      farStars2.rotation.y = -elapsedTime * 0.008;
      farStarsMat2.opacity = 0.4 + Math.sin(elapsedTime * 1.2 + 1.5) * 0.25;

      farStars3.rotation.y = elapsedTime * 0.005;
      farStarsMat3.opacity = 0.4 + Math.sin(elapsedTime * 0.7 + 3.0) * 0.25;

      // --- Efek parallax: latar galaksi (farStars) bergerak lebih lambat
      // dibanding elemen depan (spiral galaksi & bintang foto) mengikuti kursor ---
      parallaxCurX += (parallaxTargetX - parallaxCurX) * Math.min(delta * 2.5, 1);
      parallaxCurY += (parallaxTargetY - parallaxCurY) * Math.min(delta * 2.5, 1);
      farStars1.position.set(parallaxCurX * 2.5, -parallaxCurY * 2.5, 0);
      farStars2.position.set(parallaxCurX * 2.5, -parallaxCurY * 2.5, 0);
      farStars3.position.set(parallaxCurX * 2.5, -parallaxCurY * 2.5, 0);

      // Animate 3D Glowing Stars (rotation, floating, and twinkling glow)
      if (glowing3DStarsData && glowing3DStarsData.length > 0) {
        glowing3DStarsGroup.rotation.y = elapsedTime * 0.012;
        glowing3DStarsData.forEach((s) => {
          s.mesh.rotation.x += s.rotSpeedX;
          s.mesh.rotation.y += s.rotSpeedY;
          s.mesh.rotation.z += s.rotSpeedZ;
          s.group.position.y = s.baseY + Math.sin(elapsedTime * s.floatSpeed + s.floatPhase) * 1.5;
          const pulse = 1.0 + 0.28 * Math.sin(elapsedTime * s.twinkleSpeed + s.twinklePhase);
          s.group.scale.setScalar(s.baseScale * pulse);
          s.glow.material.opacity = 0.55 + 0.35 * Math.sin(elapsedTime * s.twinkleSpeed + s.twinklePhase);
        });
        glowing3DStarsGroup.position.set(parallaxCurX * 4, -parallaxCurY * 4, 0);
      }

      galaxyCore.position.set(parallaxCurX * 8, -parallaxCurY * 8, 0);
      starGroup.position.set(parallaxCurX * 8, -parallaxCurY * 8, 0);

      controls.update();
      renderer.render(scene, camera);
    }

    startIntroAnimation();
    animate();

    window.addEventListener('resize', () => {
      if (!pageEl.classList.contains('active-page')) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      W = w; H = h;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });
  }
})();

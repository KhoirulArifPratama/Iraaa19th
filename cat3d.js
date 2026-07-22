/* =============================================================
   cat3d.js — 3D Chibi Cat Mascot (Three.js)
   =============================================================
   Renders a cute 3D cat using geometric primitives. The cat
   can be rotated by dragging. Exposes window.cat3d with:
     - chomp()      : trigger eating animation
     - setStage(n)  : 0=normal, 1=happy, 2=full (belly)
   ============================================================= */

(function () {
  const MOUNT_ID = 'cat3d-mount';

  const PINK = {
    body: 0xffb3c6,
    bodyShade: 0xff8fab,
    belly: 0xffd6e6,
    ear_inner: 0xff8fab,
    nose: 0xff4b72,
    eye_white: 0xffffff,
    eye_pupil: 0x2d1b2e,
    eye_shine: 0xffffff,
    collar: 0xff4b72,
    bell: 0xffd700,
    cheek: 0xffaacc,
    stripe: 0xe8a0b8,
    floor: 0xffe5ec,
  };

  let renderer, scene, camera, controls;
  let catGroup, bodyMesh, tailGroup;
  let clock;
  let mount;
  let chompAnim = 0;    // 0 = idle, > 0 = eating countdown
  let stage = 0;        // 0 normal, 1 happy, 2 full
  let leftEarGroup, rightEarGroup;
  let eyeGroupL, eyeGroupR;
  let mouthGroup;
  let tailPivot;
  let floatPhase = 0;

  function init() {
    mount = document.getElementById(MOUNT_ID);
    if (!mount || typeof THREE === 'undefined') return;

    const W = 220, H = 220;

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xfff0f3);

    camera = new THREE.PerspectiveCamera(40, W / H, 0.1, 50);
    camera.position.set(0, 0.5, 5.5);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(W, H);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mount.appendChild(renderer.domElement);

    // Lighting
    scene.add(new THREE.AmbientLight(0xffeef5, 0.9));
    const key = new THREE.DirectionalLight(0xffffff, 1.0);
    key.position.set(2, 4, 3);
    key.castShadow = true;
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xffb3c6, 0.4);
    rim.position.set(-3, 1, -2);
    scene.add(rim);
    const fill = new THREE.PointLight(0xffe5ec, 0.6, 10);
    fill.position.set(-1, 2, 2);
    scene.add(fill);

    buildCat();
    buildFloor();

    // OrbitControls
    if (THREE.OrbitControls) {
      controls = new THREE.OrbitControls(camera, renderer.domElement);
      controls.enablePan = false;
      controls.enableZoom = false;
      controls.minPolarAngle = Math.PI * 0.25;
      controls.maxPolarAngle = Math.PI * 0.75;
      controls.autoRotate = true;
      controls.autoRotateSpeed = 1.0;
      controls.target.set(0, 0.5, 0);
      controls.update();
    }

    clock = new THREE.Clock();
    animate();
  }

  function mat(color, opts = {}) {
    return new THREE.MeshToonMaterial({ color, ...opts });
  }

  function sphere(rx, ry, rz, color, opts) {
    const geo = new THREE.SphereGeometry(1, 32, 32);
    const mesh = new THREE.Mesh(geo, mat(color, opts));
    mesh.scale.set(rx, ry, rz);
    return mesh;
  }

  function box(w, h, d, color, opts) {
    const geo = new THREE.BoxGeometry(w, h, d, 2, 2, 2);
    const mesh = new THREE.Mesh(geo, mat(color, opts));
    return mesh;
  }

  function cyl(rt, rb, h, color, opts) {
    const geo = new THREE.CylinderGeometry(rt, rb, h, 20);
    const mesh = new THREE.Mesh(geo, mat(color, opts));
    return mesh;
  }

  function buildCat() {
    catGroup = new THREE.Group();
    scene.add(catGroup);

    // ---- BODY ----
    const body = sphere(0.95, 1.1, 0.88, PINK.body);
    body.position.y = 0.4;
    catGroup.add(body);
    bodyMesh = body;

    // belly patch
    const belly = sphere(0.6, 0.7, 0.55, PINK.belly);
    belly.position.set(0, 0.42, 0.78);
    catGroup.add(belly);

    // ---- HEAD ----
    const headGroup = new THREE.Group();
    headGroup.position.y = 1.65;
    catGroup.add(headGroup);

    const head = sphere(0.85, 0.82, 0.8, PINK.body);
    headGroup.add(head);

    // Cheek blush L
    const cheekL = sphere(0.22, 0.14, 0.1, PINK.cheek, { transparent: true, opacity: 0.55 });
    cheekL.position.set(-0.52, -0.12, 0.68);
    headGroup.add(cheekL);
    const cheekR = sphere(0.22, 0.14, 0.1, PINK.cheek, { transparent: true, opacity: 0.55 });
    cheekR.position.set(0.52, -0.12, 0.68);
    headGroup.add(cheekR);

    // ---- EARS ----
    function makeEar(side) {
      const earG = new THREE.Group();
      // outer ear
      const outer = new THREE.Mesh(
        new THREE.ConeGeometry(0.28, 0.5, 3),
        mat(PINK.body)
      );
      outer.rotation.z = side * -0.18;
      earG.add(outer);
      // inner ear
      const inner = new THREE.Mesh(
        new THREE.ConeGeometry(0.16, 0.35, 3),
        mat(PINK.ear_inner)
      );
      inner.position.z = 0.06;
      inner.rotation.z = side * -0.18;
      earG.add(inner);
      return earG;
    }

    leftEarGroup = makeEar(-1);
    leftEarGroup.position.set(-0.55, 0.6, 0.1);
    headGroup.add(leftEarGroup);

    rightEarGroup = makeEar(1);
    rightEarGroup.position.set(0.55, 0.6, 0.1);
    headGroup.add(rightEarGroup);

    // ---- EYES ----
    function makeEye() {
      const g = new THREE.Group();
      const white = sphere(0.2, 0.2, 0.12, PINK.eye_white);
      g.add(white);
      const pupil = sphere(0.12, 0.14, 0.12, PINK.eye_pupil);
      pupil.position.z = 0.1;
      g.add(pupil);
      const shine = sphere(0.055, 0.055, 0.055, PINK.eye_shine);
      shine.position.set(0.05, 0.06, 0.22);
      g.add(shine);
      return g;
    }

    eyeGroupL = makeEye();
    eyeGroupL.position.set(-0.3, 0.12, 0.7);
    headGroup.add(eyeGroupL);

    eyeGroupR = makeEye();
    eyeGroupR.position.set(0.3, 0.12, 0.7);
    headGroup.add(eyeGroupR);

    // ---- NOSE ----
    const nose = sphere(0.1, 0.07, 0.08, PINK.nose);
    nose.position.set(0, -0.05, 0.82);
    headGroup.add(nose);

    // ---- MOUTH (Group so we can animate) ----
    mouthGroup = new THREE.Group();
    mouthGroup.position.set(0, -0.16, 0.79);
    headGroup.add(mouthGroup);

    function makeSmile(side) {
      const pts = [];
      for (let i = 0; i <= 8; i++) {
        const t = (i / 8) * Math.PI;
        pts.push(new THREE.Vector3(
          side * (0.02 + 0.12 * Math.sin(t)),
          -0.08 * Math.sin(t),
          0
        ));
      }
      const curve = new THREE.CatmullRomCurve3(pts);
      const geo = new THREE.TubeGeometry(curve, 8, 0.018, 6, false);
      return new THREE.Mesh(geo, mat(PINK.nose));
    }
    mouthGroup.add(makeSmile(1));
    mouthGroup.add(makeSmile(-1));

    // ---- COLLAR ----
    const collar = cyl(0.72, 0.72, 0.18, PINK.collar);
    collar.position.y = 0.8;
    catGroup.add(collar);
    // bell
    const bell = sphere(0.12, 0.12, 0.12, PINK.bell);
    bell.position.set(0, 0.78, 0.72);
    catGroup.add(bell);

    // ---- FRONT PAWS ----
    function makePaw(x) {
      const g = new THREE.Group();
      const leg = sphere(0.28, 0.38, 0.26, PINK.body);
      leg.position.y = -0.3;
      g.add(leg);
      const paw = sphere(0.3, 0.2, 0.28, PINK.belly);
      paw.position.y = -0.52;
      g.add(paw);
      g.position.set(x, 0.22, 0.62);
      return g;
    }
    catGroup.add(makePaw(-0.55));
    catGroup.add(makePaw(0.55));

    // ---- BACK FEET ----
    function makeFoot(x) {
      const f = sphere(0.32, 0.22, 0.38, PINK.belly);
      f.position.set(x, -0.68, 0.45);
      return f;
    }
    catGroup.add(makeFoot(-0.52));
    catGroup.add(makeFoot(0.52));

    // ---- TAIL ----
    tailPivot = new THREE.Group();
    tailPivot.position.set(0, 0.0, -0.8);
    catGroup.add(tailPivot);

    function buildTailSegment(i) {
      const r = 0.18 - i * 0.025;
      const s = sphere(r, r * 1.2, r, PINK.body);
      s.position.y = i * 0.28;
      return s;
    }
    tailGroup = new THREE.Group();
    tailGroup.rotation.z = 0.4;
    for (let i = 0; i < 6; i++) tailGroup.add(buildTailSegment(i));
    tailPivot.add(tailGroup);
    // tail tip
    const tip = sphere(0.14, 0.14, 0.14, PINK.belly);
    tip.position.y = 6 * 0.28;
    tailGroup.add(tip);

    // stripes on body
    for (let i = -1; i <= 1; i++) {
      const stripe = sphere(0.08, 0.55, 0.06, PINK.stripe);
      stripe.position.set(i * 0.38, 0.55, 0.6);
      catGroup.add(stripe);
    }
  }

  function buildFloor() {
    const geo = new THREE.CircleGeometry(1.8, 64);
    const mesh = new THREE.Mesh(geo, new THREE.MeshToonMaterial({
      color: PINK.floor,
      transparent: true,
      opacity: 0.5,
    }));
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = -0.72;
    scene.add(mesh);
  }

  let _chompT = 0;

  function animate() {
    requestAnimationFrame(animate);
    const dt = clock.getDelta();

    // Gentle float
    floatPhase += dt * 1.2;
    if (catGroup) {
      catGroup.position.y = Math.sin(floatPhase) * 0.06;
    }

    // Tail wag
    if (tailGroup) {
      tailGroup.rotation.z = 0.4 + Math.sin(floatPhase * 1.5) * 0.35;
    }

    // Chomp animation
    if (chompAnim > 0) {
      chompAnim -= dt;
      _chompT += dt * 12;
      const bite = Math.abs(Math.sin(_chompT)) * 0.25;
      if (mouthGroup) mouthGroup.position.y = -0.16 - bite * 0.4;
      if (bodyMesh) bodyMesh.scale.set(
        1 + bite * 0.06,
        1.1 - bite * 0.12,
        0.88 + bite * 0.06
      );
      if (catGroup) catGroup.position.y += bite * 0.06;
    } else {
      _chompT = 0;
      if (mouthGroup) mouthGroup.position.y = -0.16;
      if (bodyMesh) bodyMesh.scale.set(0.95, 1.1, 0.88);
    }

    // Ear wiggle for happy
    if (stage === 1 && leftEarGroup) {
      leftEarGroup.rotation.z = Math.sin(floatPhase * 3) * 0.15;
      rightEarGroup.rotation.z = -Math.sin(floatPhase * 3) * 0.15;
    }

    if (controls) controls.update();
    renderer.render(scene, camera);
  }

  /* ---- Public API ---- */
  window.cat3d = {
    chomp() {
      chompAnim = 0.55;
    },
    setStage(n) {
      stage = n;
      if (n === 2) {
        // Full / belly: make body bigger & round
        if (bodyMesh) bodyMesh.scale.set(1.18, 1.25, 1.08);
      } else if (n === 1) {
        // Happy
        if (bodyMesh) bodyMesh.scale.set(0.95, 1.1, 0.88);
      } else {
        if (bodyMesh) bodyMesh.scale.set(0.95, 1.1, 0.88);
      }
    },
  };

  // Wait for Three.js to load then init
  function tryInit() {
    if (typeof THREE !== 'undefined' && THREE.OrbitControls) {
      init();
    } else {
      setTimeout(tryInit, 100);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', tryInit);
  } else {
    tryInit();
  }
})();

(function () {
  const canvasA = document.getElementById('shader-bg');
  if (!canvasA || typeof THREE === 'undefined') return;
  document.querySelectorAll('canvas:not(#shader-bg)').forEach(c => c.remove());

  // ── Renderer ───────────────────────────────────────────────────────────────
  const renderer = new THREE.WebGLRenderer({ canvas: canvasA, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0xf0ece4);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type    = THREE.PCFSoftShadowMap;

  const PX = () => window.innerWidth  * Math.min(window.devicePixelRatio, 2);
  const PY = () => window.innerHeight * Math.min(window.devicePixelRatio, 2);

  // ── Render target with depth ───────────────────────────────────────────────
  let target = new THREE.WebGLRenderTarget(PX(), PY(), {
    minFilter:    THREE.LinearFilter,
    magFilter:    THREE.LinearFilter,
    format:       THREE.RGBAFormat,
    depthBuffer:  true,
    depthTexture: new THREE.DepthTexture(PX(), PY(), THREE.UnsignedShortType),
  });

  // ── Scene layout ───────────────────────────────────────────────────────────
  //
  //  t = (-1.2 - 3.5) / (0.5 - 3.5) = 1.567
  //  Lights at x=±3.5 (outside figures), figures at x=±2.2
  //  shadow_x = 3.5 + 1.567*(2.2 - 3.5) = 3.5 - 2.04 = +1.46  (right eye)
  //  Mirror gives left eye at x = -1.46. Midpoint = x=0 on wall. ✓

  const FIG_Z     =  0.5;
  const FIG_SCALE =  0.68;
  const FIG_X     =  2.2;
  const LIGHT_X   =  5.0;
  const SPHERE_R  =  2.2;
  const SPHERE_CY =  0.9;
  const SPHERE_CZ = -2.8;

  // ── Camera: closer, looking at midpoint between the two eye shadows ────────
  const camera = new THREE.PerspectiveCamera(52, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 0.9, 4.5);
  camera.lookAt(0, 0.9, SPHERE_CZ);

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    target.setSize(PX(), PY());
    dofU.uResolution.value.set(PX(), PY());
  });

  // ── Main scene ─────────────────────────────────────────────────────────────
  const scene = new THREE.Scene();
  const bodyMat = new THREE.MeshLambertMaterial({ color: 0xfafaf8 });

  function makeLimb(ax, ay, az, bx, by, bz, r) {
    const a = new THREE.Vector3(ax, ay, az);
    const b = new THREE.Vector3(bx, by, bz);
    const dir = new THREE.Vector3().subVectors(b, a);
    const mid = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5);
    const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, dir.length(), 4, 12), bodyMat);
    m.position.copy(mid);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
    m.castShadow = true;
    return m;
  }

  function buildFigure(leanZ) {
    const g = new THREE.Group();
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.19, 20, 16), bodyMat);
    head.position.set(0, 1.58, 0); head.castShadow = true; g.add(head);
    g.add(makeLimb( 0,    1.25, 0,    0,    1.38, 0,  0.07)); // neck
    g.add(makeLimb( 0,    0.35, 0,    0,    1.18, 0,  0.19)); // torso
    g.add(makeLimb( 0,    0.12, 0,    0,    0.38, 0,  0.17)); // hips
    // arms — wide arch
    g.add(makeLimb(-0.22, 1.15, 0,   -0.78, 1.52, 0,  0.07));
    g.add(makeLimb( 0.22, 1.15, 0,    0.78, 1.52, 0,  0.07));
    g.add(makeLimb(-0.78, 1.52, 0,   -0.12, 1.72, 0,  0.065));
    g.add(makeLimb( 0.78, 1.52, 0,    0.12, 1.72, 0,  0.065));
    // legs
    g.add(makeLimb(-0.10,  0.10, 0,  -0.13, -0.68, 0, 0.10));
    g.add(makeLimb( 0.10,  0.10, 0,   0.16, -0.68, 0, 0.10));
    g.add(makeLimb(-0.13, -0.68, 0,  -0.15, -1.35, 0, 0.08));
    g.add(makeLimb( 0.16, -0.68, 0,   0.13, -1.35, 0, 0.08));
    g.rotation.z = leanZ;
    return g;
  }

  // Right figure — leans slightly inward
  const figRight = buildFigure(-0.04);
  figRight.position.set(FIG_X, 0.2, FIG_Z);
  figRight.scale.setScalar(FIG_SCALE);
  scene.add(figRight);

  // Left figure — leans slightly inward (mirrored)
  const figLeft = buildFigure(0.04);
  figLeft.position.set(-FIG_X, 0.2, FIG_Z);
  figLeft.scale.setScalar(FIG_SCALE);
  scene.add(figLeft);

  // Sphere — image mapped, shadows cast eye shapes on the surface
  const sphereTex = new THREE.TextureLoader().load('images/fotos/urraca-flopi-sphere.jpg');
  sphereTex.wrapS   = THREE.ClampToEdgeWrapping;
  sphereTex.wrapT   = THREE.ClampToEdgeWrapping;
  sphereTex.repeat.set(1.5, 1);
  sphereTex.offset.set(-0.25, 0);
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(SPHERE_R, 128, 128),
    new THREE.MeshLambertMaterial({ map: sphereTex, color: 0xffffff })
  );
  head.position.set(0, SPHERE_CY, SPHERE_CZ);
  head.rotation.y = 4.385;
  head.rotation.x = 0;
  head.receiveShadow = true;
  scene.add(head);

  // ── Lighting ───────────────────────────────────────────────────────────────
  scene.add(new THREE.AmbientLight(0xffffff, 0.28));

  function makeSpot(x) {
    const s = new THREE.SpotLight(0xfffbe8, 9.0);
    s.position.set(x, 1.2, 3.5);
    s.target.position.set(x * 0.1, 0.9, SPHERE_CZ * 0.5); // aimed through figure deep toward sphere
    s.angle      = Math.PI / 5;
    s.penumbra   = 0.18;
    s.castShadow = true;
    s.shadow.mapSize.set(2048, 2048);
    s.shadow.camera.near = 0.5;
    s.shadow.camera.far  = 16;
    scene.add(s, s.target);
    return s;
  }

  const spotR = makeSpot( LIGHT_X);  // right light (outside fig) → shadow projects left → right eye
  const spotL = makeSpot(-LIGHT_X);  // left  light (outside fig) → shadow projects right → left eye

  const fillLight = new THREE.DirectionalLight(0xd0dcff, 0.35);
  fillLight.position.set(0, 2, 3);
  scene.add(fillLight);

  // ── Depth-of-Field pass ────────────────────────────────────────────────────
  // Camera z=5, wall z=-1.2 → focal distance ≈ 6.2. Figure at z=0.5 → ~4.5 units → blurred.

  const dofU = {
    tColor:      { value: target.texture },
    tDepth:      { value: target.depthTexture },
    uNear:       { value: camera.near },
    uFar:        { value: camera.far },
    uFocalDist:  { value: 6.8 },  // camera at z=4.5, sphere front at z≈-0.6 → ~5.1, center at z=-2.8 → ~7.3, split diff
    uFocalRange: { value: 1.0 },
    uBlurMax:    { value: 14.0 },
    uResolution: { value: new THREE.Vector2(PX(), PY()) },
  };

  const dofMat = new THREE.ShaderMaterial({
    uniforms: dofU,
    vertexShader: `void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }`,
    fragmentShader: `
      precision highp float;
      uniform sampler2D tColor;
      uniform sampler2D tDepth;
      uniform float uNear, uFar, uFocalDist, uFocalRange, uBlurMax;
      uniform vec2 uResolution;

      float linD(float r) {
        float z = r * 2.0 - 1.0;
        return (2.0 * uNear * uFar) / (uFar + uNear - z * (uFar - uNear));
      }

      void main() {
        vec2 uv = gl_FragCoord.xy / uResolution;
        float d  = linD(texture2D(tDepth, uv).r);
        float coc = clamp((abs(d - uFocalDist) - uFocalRange) / uFocalRange, 0.0, 1.0);
        float r   = coc * uBlurMax;
        vec2  px  = 1.0 / uResolution;

        // 12-tap Poisson disc
        vec4 col = texture2D(tColor, uv);
        col += texture2D(tColor, uv + vec2(-0.326,-0.406)*r*px);
        col += texture2D(tColor, uv + vec2(-0.840,-0.074)*r*px);
        col += texture2D(tColor, uv + vec2(-0.696, 0.457)*r*px);
        col += texture2D(tColor, uv + vec2(-0.203, 0.621)*r*px);
        col += texture2D(tColor, uv + vec2( 0.962,-0.195)*r*px);
        col += texture2D(tColor, uv + vec2( 0.473,-0.480)*r*px);
        col += texture2D(tColor, uv + vec2( 0.519, 0.767)*r*px);
        col += texture2D(tColor, uv + vec2( 0.185,-0.893)*r*px);
        col += texture2D(tColor, uv + vec2( 0.507, 0.064)*r*px);
        col += texture2D(tColor, uv + vec2( 0.896, 0.412)*r*px);
        col += texture2D(tColor, uv + vec2(-0.322, 0.933)*r*px);
        col += texture2D(tColor, uv + vec2(-0.792,-0.598)*r*px);
        gl_FragColor = col / 13.0;
      }
    `,
  });

  const dofGeo = new THREE.BufferGeometry();
  dofGeo.setAttribute('position', new THREE.BufferAttribute(
    new Float32Array([-1,-1,0, 3,-1,0, -1,3,0]), 3
  ));
  const dofScene  = new THREE.Scene();
  const dofCamera = new THREE.OrthographicCamera(-1,1,1,-1,0,1);
  dofScene.add(new THREE.Mesh(dofGeo, dofMat));

  // ── Mouse: lights drift + right-click drag rotates sphere ─────────────────
  const mouse = { x: 0.5, y: 0.5 };
  let dragging = false, lastDragX = 0, lastDragY = 0;

  window.addEventListener('mousemove', e => {
    mouse.x = e.clientX / window.innerWidth;
    mouse.y = e.clientY / window.innerHeight;
    if (dragging) {
      const dx = e.clientX - lastDragX;
      const dy = e.clientY - lastDragY;
      head.rotation.y += dx * 0.01;
      head.rotation.x += dy * 0.01;
      lastDragX = e.clientX;
      lastDragY = e.clientY;
      console.log('[sphere] rotation.y:', head.rotation.y.toFixed(3), '  rotation.x:', head.rotation.x.toFixed(3));
    }
  });
  window.addEventListener('contextmenu', e => e.preventDefault());
  window.addEventListener('mousedown',  e => { if (e.button === 2) { dragging = true; lastDragX = e.clientX; lastDragY = e.clientY; }});
  window.addEventListener('mouseup',    e => { if (e.button === 2)   dragging = false; });

  const baseY    = 1.2;
  const baseCam  = { x: 0, y: 0.9, z: 4.5 };
  const lookAt   = new THREE.Vector3(0, 0.9, SPHERE_CZ);
  const camCur   = { x: baseCam.x, y: baseCam.y };

  function loop() {
    requestAnimationFrame(loop);

    const ty = baseY + (mouse.y - 0.5) * -0.5;
    const tx = (mouse.x - 0.5) * 0.3;

    [spotR, spotL].forEach(s => {
      const baseX = s === spotR ? LIGHT_X : -LIGHT_X;
      s.position.x += (baseX + tx - s.position.x) * 0.04;
      s.position.y += (ty        - s.position.y) * 0.04;
    });

    // subtle camera drift — ±0.18 x, ±0.10 y, always looking at same point
    const camTX = baseCam.x + (mouse.x - 0.5) * 0.36;
    const camTY = baseCam.y + (mouse.y - 0.5) * -0.20;
    camCur.x += (camTX - camCur.x) * 0.05;
    camCur.y += (camTY - camCur.y) * 0.05;
    camera.position.set(camCur.x, camCur.y, baseCam.z);
    camera.lookAt(lookAt);

    renderer.setRenderTarget(target);
    renderer.render(scene, camera);
    renderer.setRenderTarget(null);
    renderer.render(dofScene, dofCamera);
  }

  loop();
})();

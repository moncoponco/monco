(function () {
  const canvas = document.getElementById('shader-bg');
  if (!canvas || typeof THREE === 'undefined') return;

  // ── Renderer ───────────────────────────────────────────────────────────────
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x000000);

  // ── Scene ──────────────────────────────────────────────────────────────────
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x000000, 0.08);

  // ── Camera — slightly above, angled down like looking at a floor ──────────
  const camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 200);
  camera.position.set(0, 3.5, 5);
  camera.lookAt(0, 0, -2);

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // ── Texture ────────────────────────────────────────────────────────────────
  const texture = new THREE.TextureLoader().load('images/fotos/urraca-flopi.JPG');
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;

  // ── Large plane — extends far back to create horizon feel ─────────────────
  // tilted on X so it lies like a floor receding into the distance
  const geo = new THREE.PlaneGeometry(18, 30, 160, 200);

  const uniforms = {
    u_texture:  { value: texture },
    u_time:     { value: 0 },
    u_velocity: { value: 0 },
    u_mouse:    { value: new THREE.Vector2(0.5, 0.5) },
  };

  const vertexShader = /* glsl */`
    uniform float u_time;
    uniform float u_velocity;
    uniform vec2  u_mouse;
    varying vec2  vUv;

    void main() {
      vUv = uv;

      float vel   = abs(u_velocity);
      float amp   = 0.15 + vel * 0.30;
      float speed = 0.9  + vel * 3.0;

      vec3 pos = position;

      // layered Z-ripples — the surface undulates like a slow liquid
      pos.z += sin(pos.x * 1.4 + u_time * speed)          * amp;
      pos.z += cos(pos.y * 0.9 + u_time * speed * 0.70)   * amp * 0.8;
      pos.z += sin(pos.x * 3.2 - u_time * speed * 0.50)   * amp * 0.40;
      pos.z += cos(pos.y * 2.1 + u_time * speed * 0.38)   * amp * 0.30;
      pos.z += sin((pos.x + pos.y) * 1.8 + u_time * speed * 0.6) * amp * 0.25;

      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `;

  const fragmentShader = /* glsl */`
    uniform sampler2D u_texture;
    uniform float     u_time;
    uniform float     u_velocity;
    varying vec2      vUv;

    float mirror(float v) {
      float t = fract(v * 0.5) * 2.0;
      return t > 1.0 ? 2.0 - t : t;
    }

    void main() {
      float vel   = abs(u_velocity);
      float speed = 1.1 + vel * 4.0;
      float wgl   = 0.18 + vel * 0.14;

      // slitscan horizontal shift per row
      float disp  = sin(vUv.y * (100.0 / 76.8) * 6.28318 + u_time * speed)        * wgl;
      disp       += sin(vUv.y * 2.8             * 6.28318 - u_time * speed * 0.42) * wgl * 0.28;

      float tx = vUv.x * 3.0 + disp;

      vec4 col = texture2D(u_texture, vec2(mirror(tx), vUv.y));

      // darken near fog/horizon by UV depth (vUv.y near 1 = far away)
      float depth = smoothstep(0.4, 1.0, vUv.y);
      col.rgb *= 1.0 - depth * 0.6;

      gl_FragColor = col;
    }
  `;

  const mat  = new THREE.ShaderMaterial({ uniforms, vertexShader, fragmentShader });
  const mesh = new THREE.Mesh(geo, mat);

  // tilt plane so it faces up like a floor, then push it down and back
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(0, -1.0, -6);
  scene.add(mesh);

  // ── Input ──────────────────────────────────────────────────────────────────
  let scrollVel = 0, lastWheel = performance.now();
  window.addEventListener('wheel', e => {
    scrollVel += e.deltaY * 0.002;
    scrollVel  = Math.max(-5, Math.min(5, scrollVel));
    lastWheel  = performance.now();
  }, { passive: true });

  // normalised mouse 0-1
  const mouseNorm = new THREE.Vector2(0.5, 0.5);
  // smooth camera offset target
  const camDrift  = new THREE.Vector2(0, 0);

  window.addEventListener('mousemove', e => {
    mouseNorm.set(e.clientX / window.innerWidth, 1 - e.clientY / window.innerHeight);
    // gentle drift: ±0.8 horizontal, ±0.4 vertical
    camDrift.set((mouseNorm.x - 0.5) * 1.6, (mouseNorm.y - 0.5) * 0.8);
  });

  // ── Render loop ────────────────────────────────────────────────────────────
  const clock = new THREE.Clock();
  // base camera position — orbit around this
  const basePos = new THREE.Vector3(0, 3.5, 5);

  function loop() {
    requestAnimationFrame(loop);

    const t = clock.getElapsedTime();

    // decay scroll
    const dt = (performance.now() - lastWheel) / 1000;
    scrollVel *= Math.exp(-dt * 2.5);
    if (Math.abs(scrollVel) < 0.0001) scrollVel = 0;
    lastWheel = performance.now();

    // slow auto-sway so the scene never feels static
    const autoX = Math.sin(t * 0.18) * 0.5;
    const autoY = Math.cos(t * 0.13) * 0.15;

    // smooth camera toward mouse + auto-sway
    const targetX = basePos.x + camDrift.x + autoX;
    const targetY = basePos.y + camDrift.y + autoY;
    camera.position.x += (targetX - camera.position.x) * 0.03;
    camera.position.y += (targetY - camera.position.y) * 0.03;
    camera.lookAt(0, 0, -2);

    uniforms.u_time.value     = t;
    uniforms.u_velocity.value = scrollVel;
    uniforms.u_mouse.value    = mouseNorm;

    renderer.render(scene, camera);
  }

  loop();
})();

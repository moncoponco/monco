(function () {
  const canvas = document.getElementById('shader-bg');
  if (!canvas) return;

  const gl = canvas.getContext('webgl');
  if (!gl) return;

  function resize() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
    gl.viewport(0, 0, canvas.width, canvas.height);
  }
  resize();
  window.addEventListener('resize', resize);

  // ── Shaders ────────────────────────────────────────────────────────────────

  const vsSource = `
    attribute vec2 a_position;
    void main() {
      gl_Position = vec4(a_position, 0.0, 1.0);
    }
  `;

  const fsSource = `
    precision mediump float;
    uniform sampler2D u_texture;
    uniform float     u_time;
    uniform float     u_velocity;
    uniform vec2      u_resolution;
    uniform vec2      u_mouse;
    uniform float     u_mouse_vel;

    // ping-pong so every other tile mirrors — no seams
    float mirrorRepeat(float v) {
      float t = fract(v * 0.5) * 2.0;
      return t > 1.0 ? 2.0 - t : t;
    }

    void main() {
      vec2 uv  = gl_FragCoord.xy / u_resolution;
      uv.y     = 1.0 - uv.y;

      // ── Slitscan parameters (matching Cargo: scan 76.8, wave 2.8, wiggle 20, speed 11)
      // scanFreq: ~1.3 full cycles across the screen height → wide sweeping bands
      float scanFreq  = 100.0 / 76.8;
      // shortWave: faster overlay wave
      float shortFreq = 2.8;
      // wiggle: horizontal displacement (fraction of one tile)
      float wiggle    = 0.18;
      // base animation speed
      float baseSpeed = 1.1;

      // scroll boosts speed & wiggle
      float vel   = abs(u_velocity);
      float speed = baseSpeed + vel * 4.0;
      float wgl   = wiggle    + vel * 0.12;

      // primary large-band slitscan shift
      float disp  = sin(uv.y * scanFreq  * 6.28318 + u_time * speed)        * wgl;
      // secondary shorter wave layered on top for the corrugated texture
      disp       += sin(uv.y * shortFreq * 6.28318 - u_time * speed * 0.42) * wgl * 0.28;

      // tile 3× horizontally with mirror repeat → no seams
      float tilesX = 3.0;
      float tx     = uv.x * tilesX + disp;

      // ── Mouse: very light local nudge — barely visible, just alive ────────
      vec2  mouseUV = vec2(u_mouse.x / u_resolution.x,
                           1.0 - u_mouse.y / u_resolution.y);
      float mDist   = length(uv - mouseUV);
      float mNudge  = u_mouse_vel * 0.005 / (mDist + 0.15);
      tx += clamp(mNudge, 0.0, 0.008);

      vec2 distorted;
      distorted.x = mirrorRepeat(tx);
      distorted.y = uv.y;           // fill vertically — no repeat on y

      gl_FragColor = texture2D(u_texture, distorted);
    }
  `;

  // ── Compile helpers ────────────────────────────────────────────────────────

  function compile(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.error(gl.getShaderInfoLog(s));
      return null;
    }
    return s;
  }

  const prog = gl.createProgram();
  gl.attachShader(prog, compile(gl.VERTEX_SHADER, vsSource));
  gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, fsSource));
  gl.linkProgram(prog);
  gl.useProgram(prog);

  // ── Full-screen quad ───────────────────────────────────────────────────────

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER,
    new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);

  const posLoc = gl.getAttribLocation(prog, 'a_position');
  gl.enableVertexAttribArray(posLoc);
  gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

  const uTime       = gl.getUniformLocation(prog, 'u_time');
  const uVelocity   = gl.getUniformLocation(prog, 'u_velocity');
  const uResolution = gl.getUniformLocation(prog, 'u_resolution');
  const uMouse      = gl.getUniformLocation(prog, 'u_mouse');
  const uMouseVel   = gl.getUniformLocation(prog, 'u_mouse_vel');

  // ── Texture ────────────────────────────────────────────────────────────────

  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
    new Uint8Array([30, 30, 30, 255]));

  const img = new Image();
  img.onload = function () {
    const pow2 = n => { let p = 1; while (p < n) p <<= 1; return p; };
    const pw = pow2(img.width), ph = pow2(img.height);
    const tmp = document.createElement('canvas');
    tmp.width = pw; tmp.height = ph;
    tmp.getContext('2d').drawImage(img, 0, 0, pw, ph);

    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, tmp);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  };
  img.onerror = () => console.error('shader.js: failed to load texture');
  img.src = 'images/fotos/urraca-flopi.JPG';

  // ── Input tracking ─────────────────────────────────────────────────────────

  let scrollVel = 0, lastWheel = performance.now();

  window.addEventListener('wheel', e => {
    scrollVel += e.deltaY * 0.002;
    scrollVel  = Math.max(-4, Math.min(4, scrollVel));
    lastWheel  = performance.now();
  }, { passive: true });

  let mouseX = 0, mouseY = 0, prevMX = 0, prevMY = 0, mouseVel = 0;

  window.addEventListener('mousemove', e => {
    prevMX = mouseX; prevMY = mouseY;
    mouseX = e.clientX; mouseY = e.clientY;
    const d = Math.hypot(mouseX - prevMX, mouseY - prevMY);
    mouseVel = Math.min(d * 0.03, 1.5);
  });

  // ── Render loop ────────────────────────────────────────────────────────────

  function loop(now) {
    requestAnimationFrame(loop);

    const dt  = (now - lastWheel) / 1000;
    scrollVel *= Math.exp(-dt * 2.5);
    if (Math.abs(scrollVel) < 0.0001) scrollVel = 0;
    lastWheel = now;

    mouseVel *= 0.90;

    gl.uniform1f(uTime,       now * 0.001);
    gl.uniform1f(uVelocity,   scrollVel);
    gl.uniform2f(uResolution, canvas.width, canvas.height);
    gl.uniform2f(uMouse,      mouseX, mouseY);
    gl.uniform1f(uMouseVel,   mouseVel);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  requestAnimationFrame(loop);
})();

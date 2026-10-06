/**
 * Nube de puntos tipo LiDAR de un relieve andino procedural, coloreada por
 * elevación y recorrida por una línea de escaneo. Canvas 2D, sin dependencias.
 */
(function () {
  const canvas = document.querySelector("[data-terrain]");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const hudScan = document.querySelector("[data-hud-scan]");
  const hudPts = document.querySelector("[data-hud-pts]");
  const hudElev = document.querySelector("[data-hud-elev]");

  // ---------- Ruido de valor 2D ----------
  function hash(x, y) {
    let h = x * 374761393 + y * 668265263;
    h = (h ^ (h >>> 13)) * 1274126177;
    return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
  }

  function smooth(t) {
    return t * t * (3 - 2 * t);
  }

  function noise(x, y) {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const xf = smooth(x - xi);
    const yf = smooth(y - yi);
    const a = hash(xi, yi);
    const b = hash(xi + 1, yi);
    const c = hash(xi, yi + 1);
    const d = hash(xi + 1, yi + 1);
    return a + (b - a) * xf + (c - a) * yf + (a - b - c + d) * xf * yf;
  }

  function fbm(x, y) {
    let v = 0;
    let amp = 0.5;
    let f = 1;
    for (let i = 0; i < 5; i++) {
      v += amp * noise(x * f, y * f);
      f *= 2.03;
      amp *= 0.5;
    }
    return v;
  }

  // x: oeste (costa) → este (cordillera); z: norte → sur
  function heightAt(x, z) {
    const ridgeX = 0.38 + 0.08 * Math.sin(z * 2.2);
    const andes = Math.exp(-Math.pow(x - ridgeX, 2) / 0.09) * 0.95;
    const coastal = Math.exp(-Math.pow(x + 0.35, 2) / 0.05) * 0.28;
    const detail = fbm(x * 3.2 + 10, z * 3.2 + 4);
    const ridged = 1 - Math.abs(fbm(x * 5 + 3, z * 5 - 7) * 2 - 1);
    let h = andes * (0.55 + 0.6 * ridged) + coastal * (0.6 + detail) + detail * 0.18;

    const riverX = -0.05 + 0.12 * Math.sin(z * 3.4 + 1.2);
    h -= Math.exp(-Math.pow(x - riverX, 2) / 0.004) * 0.12;

    const coastLine = -0.72 + 0.06 * Math.sin(z * 5);
    if (x < coastLine) h = -0.02;
    return h;
  }

  // ---------- Paleta por elevación (logo TeleAmb) ----------
  const ramp = [
    [0.0, [11, 60, 93]],
    [0.12, [46, 140, 122]],
    [0.3, [92, 184, 122]],
    [0.5, [227, 154, 45]],
    [0.68, [239, 229, 143]],
    [0.82, [255, 255, 255]],
  ];

  function colorFor(t) {
    t = Math.max(0, Math.min(1, t));
    for (let i = 1; i < ramp.length; i++) {
      if (t <= ramp[i][0]) {
        const [t0, c0] = ramp[i - 1];
        const [t1, c1] = ramp[i];
        const k = (t - t0) / (t1 - t0);
        return [c0[0] + (c1[0] - c0[0]) * k, c0[1] + (c1[1] - c0[1]) * k, c0[2] + (c1[2] - c0[2]) * k];
      }
    }
    return ramp[ramp.length - 1][1];
  }

  // ---------- Malla de puntos ----------
  let points = [];
  let maxH = 0;

  function build() {
    const small = window.innerWidth < 720;
    const cols = small ? 110 : 190;
    const rows = small ? 90 : 150;
    points = [];
    maxH = 0;
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        const x = (i / (cols - 1)) * 2 - 1;
        const z = (j / (rows - 1)) * 2 - 1;
        const jitterX = (hash(i, j) - 0.5) * (2 / cols);
        const jitterZ = (hash(j, i) - 0.5) * (2 / rows);
        const h = heightAt(x + jitterX, z + jitterZ);
        if (h > maxH) maxH = h;
        points.push({ x: x + jitterX, z: z + jitterZ, h });
      }
    }
    for (const p of points) {
      const t = p.h <= 0 ? 0 : p.h / maxH;
      p.c = colorFor(t);
      p.water = p.h <= 0;
    }
    if (hudPts) hudPts.textContent = points.length.toLocaleString("es-CL");
    if (hudElev) hudElev.textContent = (6961).toLocaleString("es-CL") + " m";
  }

  // ---------- Render ----------
  let w = 0;
  let h = 0;
  let dpr = 1;
  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    w = canvas.clientWidth;
    h = canvas.clientHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function draw(time) {
    const t = time * 0.001;
    mouse.x += (mouse.tx - mouse.x) * 0.05;
    mouse.y += (mouse.ty - mouse.y) * 0.05;

    const yaw = -0.55 + Math.sin(t * 0.08) * 0.25 + mouse.x * 0.35;
    const pitch = 1.05 + mouse.y * 0.12;
    const cosY = Math.cos(yaw);
    const sinY = Math.sin(yaw);
    const cosP = Math.cos(pitch);
    const sinP = Math.sin(pitch);

    const scale = Math.max(w, h) * (w > 900 ? 0.52 : 0.62);
    const camDist = 3.1;
    const cx = w * (w > 900 ? 0.6 : 0.5);
    const cy = h * 0.55;
    const elevScale = 0.55;

    const scan = (t * 0.12) % 1.4 - 0.2;
    const scanZ = scan * 2 - 1;

    ctx.clearRect(0, 0, w, h);

    const size = w < 720 ? 1.6 : 1.8;
    let lit = 0;

    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      const py = -(p.water ? 0 : p.h) * elevScale;

      const rx = p.x * cosY - p.z * sinY;
      const rz = p.x * sinY + p.z * cosY;
      const ry = py * cosP - rz * sinP;
      const rz2 = py * sinP + rz * cosP;

      const persp = camDist / (camDist + rz2);
      const sx = cx + rx * scale * persp * 0.55;
      const sy = cy + ry * scale * persp * 0.55;
      if (sx < -10 || sx > w + 10 || sy < -10 || sy > h + 10) continue;

      const depth = Math.max(0.15, Math.min(1, 0.9 - rz2 * 0.35));
      const d = Math.abs(p.z - scanZ);
      let r = p.c[0];
      let g = p.c[1];
      let b = p.c[2];
      let a = p.water ? 0.18 * depth : 0.75 * depth;

      if (d < 0.06) {
        const k = 1 - d / 0.06;
        r += (127 - r) * k;
        g += (224 - g) * k;
        b += (236 - b) * k;
        a = Math.min(1, a + k * 0.6);
        lit++;
      } else if (p.z > scanZ) {
        a *= 0.55;
      }

      ctx.fillStyle = `rgba(${r | 0},${g | 0},${b | 0},${a.toFixed(3)})`;
      const s = size * persp;
      ctx.fillRect(sx, sy, s, s);
    }

    if (hudScan) {
      const pct = Math.max(0, Math.min(100, ((scanZ + 1) / 2) * 100));
      hudScan.textContent = pct.toFixed(1) + "%";
    }
    return lit;
  }

  let raf = 0;
  let running = false;

  function loop(time) {
    draw(time);
    raf = requestAnimationFrame(loop);
  }

  function start() {
    if (running || reduceMotion) return;
    running = true;
    raf = requestAnimationFrame(loop);
  }

  function stop() {
    running = false;
    cancelAnimationFrame(raf);
  }

  function init() {
    resize();
    build();
    if (reduceMotion) {
      draw(4000);
      return;
    }
    start();
  }

  window.addEventListener("pointermove", (e) => {
    mouse.tx = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.ty = (e.clientY / window.innerHeight) * 2 - 1;
  });

  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      resize();
      build();
      if (reduceMotion) draw(4000);
    }, 150);
  });

  new IntersectionObserver((entries) => {
    entries.forEach((e) => (e.isIntersecting ? start() : stop()));
  }).observe(canvas);

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stop();
    else if (canvas.getBoundingClientRect().bottom > 0) start();
  });

  init();
})();

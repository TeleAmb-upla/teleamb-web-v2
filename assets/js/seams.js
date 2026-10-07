/**
 * Transiciones entre secciones dibujadas como el mosaico del logo:
 * una cordillera pixelada con nieve en las cumbres, laderas navy y verdes,
 * y un cielo en tonos arena. Cada costura tiene su propio perfil (semilla fija).
 *
 * Uso: <div class="seam" data-seam="paper night" aria-hidden="true"></div>
 *      (color de arriba, color de abajo). Agrega la clase seam--soft para
 *      transiciones suaves entre fondos claros.
 */
(function () {
  const BASE = { paper: "#eef2ef", sky: "#e2edf1", white: "#f8faf9", night: "#04090f" };
  const T = {
    navy: "#0b3c5d",
    deep: "#0a3048",
    slate: "#2a5f73",
    pine: "#1f6f6a",
    teal: "#2e8c7a",
    green: "#5cb87a",
    cyan: "#2bb6c8",
    aqua: "#a8dcdc",
    ochre: "#e39a2d",
    gold: "#e3b43a",
    sand: "#efe58f",
    snow: "#ffffff",
  };
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const toRGB = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const mix = (a, b, t) => {
    const A = toRGB(a), B = toRGB(b);
    return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(",")})`;
  };

  function random(seed) {
    let s = seed >>> 0;
    return () => {
      s = (s + 0x6d2b79f5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const pick = (rnd, list) => list[Math.floor(rnd() * list.length)];

  // Perfil 1D: dos octavas de ruido de valor con interpolación coseno.
  function profile(rnd, cols, rows, lo, hi) {
    const knots = (step) => Array.from({ length: Math.ceil(cols / step) + 2 }, rnd);
    const k1 = knots(11), k2 = knots(4);
    const at = (k, step, c) => {
      const i = Math.floor(c / step), f = c / step - i;
      const s = (1 - Math.cos(f * Math.PI)) / 2;
      return k[i] * (1 - s) + k[i + 1] * s;
    };
    return Array.from({ length: cols }, (_, c) => {
      const raw = 0.72 * at(k1, 11, c) + 0.28 * at(k2, 4, c);
      const n = Math.min(1, Math.max(0, (raw - 0.5) * 2.3 + 0.5));
      return Math.round(rows * (lo + (hi - lo) * n));
    });
  }

  function build(el, cols, rows, seed) {
    const [topName, bottomName] = el.dataset.seam.split(/\s+/);
    const top = BASE[topName] || topName, bottom = BASE[bottomName] || bottomName;
    const soft = el.classList.contains("seam--soft");
    const rnd = random(seed);
    const ridge = soft ? profile(rnd, cols, rows, 0.34, 0.67) : profile(rnd, cols, rows, 0.12, 0.88);
    const accents = [];
    const add = (c, r, color) => accents.push({ c, r, color, delay: (c / cols) * 0.65 + rnd() * 0.35 });
    // Cumbre: el punto más alto en ±3 columnas, y solo si está en la mitad superior.
    const isPeak = (c) => {
      if (ridge[c] > rows * 0.45) return false;
      for (let k = c - 3; k <= c + 3; k++) if (k !== c && ridge[k] !== undefined && ridge[k] < ridge[c]) return false;
      return true;
    };

    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        const d = r - ridge[c];
        const p = rnd();
        if (soft) {
          // Borde de río: celdas agua y algunas manchas de vegetación o arena.
          if (d === 0 && p < 0.22) add(c, r, mix(pick(rnd, [T.aqua, T.aqua, T.aqua, T.cyan, T.green, T.sand]), bottom, 0.5));
          else if (d === -1 && p < 0.1) add(c, r, mix(pick(rnd, [T.aqua, T.sand]), top, 0.55));
          continue;
        }
        if (bottomName === "night") {
          // Cordillera oscura contra cielo claro.
          if (d === 0 && isPeak(c)) add(c, r, T.snow);
          else if (d === 1 && isPeak(c) && p < 0.6) add(c, r, mix(T.snow, T.aqua, 0.3));
          else if (d >= 0 && d < 3 && p < 0.85 - d * 0.25) add(c, r, pick(rnd, [T.navy, T.navy, T.deep, T.slate]));
          else if (d >= 2 && d < 5 && p < 0.07) add(c, r, pick(rnd, [T.pine, T.teal, T.green]));
          else if (d >= 3 && p < 0.1) add(c, r, mix(T.deep, bottom, 0.4));
          else if (d < 0 && d > -4 && p < [0, 0.45, 0.2, 0.08][-d]) {
            add(c, r, mix(pick(rnd, [T.sand, T.sand, T.gold, T.ochre, T.aqua]), top, 0.5 + -d * 0.1));
          }
        } else {
          // Terreno claro bajo un cielo nocturno.
          if (d === 0 && isPeak(c)) add(c, r, T.snow);
          else if (d >= 0 && d < 3 && p < [0.75, 0.35, 0.12][d]) {
            add(c, r, mix(pick(rnd, [T.green, T.aqua, T.aqua, T.sand, T.teal]), bottom, 0.3 + d * 0.2));
          } else if (d < 0 && d > -4 && p < [0, 0.5, 0.25, 0.1][-d]) {
            add(c, r, pick(rnd, [T.navy, T.deep, T.deep, T.slate]));
          }
        }
      }
    }
    if (!soft && topName === "night") {
      // Un satélite: un solo píxel cian en lo alto del cielo.
      const c = Math.floor(cols * (0.2 + rnd() * 0.6));
      if (ridge[c] > 2) add(c, 0, T.cyan);
    }
    return { top, bottom, ridge, accents };
  }

  function setup(el, seed) {
    const canvas = document.createElement("canvas");
    el.appendChild(canvas);
    const ctx = canvas.getContext("2d");
    let model, size, shown = reduceMotion ? 1 : 0, lastW = 0;

    const paint = (progress) => {
      const { top, bottom, ridge, accents } = model;
      const { s, cols, rows } = size;
      for (let c = 0; c < cols; c++) {
        ctx.fillStyle = top;
        ctx.fillRect(c * s, 0, s, ridge[c] * s);
        ctx.fillStyle = bottom;
        ctx.fillRect(c * s, ridge[c] * s, s, (rows - ridge[c]) * s);
      }
      for (const a of accents) {
        if (a.delay > progress) continue;
        ctx.fillStyle = a.color;
        ctx.fillRect(a.c * s, a.r * s, s, s);
      }
    };

    const draw = () => {
      const w = el.clientWidth, h = el.clientHeight;
      if (!w || w === lastW) return;
      lastW = w;
      const s = w < 640 ? 10 : 14;
      const cols = Math.ceil(w / s), rows = Math.max(2, Math.round(h / s));
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = cols * s * dpr;
      canvas.height = rows * s * dpr;
      canvas.style.width = cols * s + "px";
      canvas.style.height = rows * s + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      size = { s, cols, rows };
      model = build(el, cols, rows, seed);
      paint(shown);
    };

    draw();
    window.addEventListener("resize", draw, { passive: true });

    if (!reduceMotion) {
      new IntersectionObserver(
        ([e], obs) => {
          if (!e.isIntersecting) return;
          obs.disconnect();
          const t0 = performance.now();
          const step = (now) => {
            shown = Math.min(1, (now - t0) / 1100);
            paint(shown);
            if (shown < 1) requestAnimationFrame(step);
          };
          requestAnimationFrame(step);
        },
        { threshold: 0.4 }
      ).observe(el);
    }
  }

  const page = [...location.pathname].reduce((h, ch) => (Math.imul(h, 31) + ch.charCodeAt(0)) >>> 0, 17);
  document.querySelectorAll("[data-seam]").forEach((el, i) => setup(el, parseInt(el.dataset.seed || 0, 10) || page + 7919 * (i + 3)));
})();

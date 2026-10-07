/**
 * Transiciones de color entre secciones: un degradado pixelado con la paleta
 * del logo (arena, aqua, cian, teal, navy). Los píxeles se reparten con un
 * tramado ordenado (Bayer 4x4), así el paso entre colores se ve suave y fluido.
 *
 * Uso: <div class="seam" data-seam="paper night" aria-hidden="true"></div>
 *      (color de arriba, color de abajo). Con la clase seam--soft la
 *      transición es corta, para pasar entre dos fondos claros.
 */
(function () {
  const BASE = { paper: "#eef2ef", sky: "#e2edf1", white: "#f8faf9", night: "#04090f" };
  const LIGHT_TO_DARK = ["#d6ebe8", "#a8dcdc", "#62bfc6", "#2e8c7a", "#2a5f73", "#0b3c5d", "#0a3048"];
  const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);

  const toRGB = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const lerp = (A, B, t) => A.map((v, i) => v + (B[i] - v) * t);
  const isDark = (rgb) => rgb[0] * 0.3 + rgb[1] * 0.59 + rgb[2] * 0.11 < 90;

  // Rampa de colores interpolada en `steps` tonos.
  function ramp(top, bottom, soft) {
    let stops;
    if (soft) stops = [top, lerp(lerp(top, bottom, 0.5), toRGB("#a8dcdc"), 0.35), bottom];
    else {
      const mid = LIGHT_TO_DARK.map(toRGB);
      stops = [top, ...(isDark(top) ? mid.reverse() : mid), bottom];
    }
    const steps = soft ? 7 : 22;
    return Array.from({ length: steps }, (_, k) => {
      const x = (k / (steps - 1)) * (stops.length - 1);
      const i = Math.min(stops.length - 2, Math.floor(x));
      return lerp(stops[i], stops[i + 1], x - i).map(Math.round);
    });
  }

  function setup(el, seed) {
    const canvas = document.createElement("canvas");
    el.appendChild(canvas);
    const ctx = canvas.getContext("2d");
    const [topName, bottomName] = el.dataset.seam.split(/\s+/);
    const top = toRGB(BASE[topName] || topName), bottom = toRGB(BASE[bottomName] || bottomName);
    const soft = el.classList.contains("seam--soft");
    const colors = ramp(top, bottom, soft);
    const phase = (seed % 628) / 100;
    let lastW = 0;

    const draw = () => {
      const w = el.clientWidth, h = el.clientHeight;
      if (!w || w === lastW) return;
      lastW = w;
      const s = w < 640 ? 4 : 6;
      const cols = Math.ceil(w / s), rows = Math.max(2, Math.ceil(h / s));
      canvas.width = cols;
      canvas.height = rows;
      const img = ctx.createImageData(cols, rows);
      const n = colors.length - 1;
      for (let r = 0; r < rows; r++) {
        const t0 = r / (rows - 1);
        for (let c = 0; c < cols; c++) {
          // Ondulación muy leve, nula en los bordes para empalmar con cada fondo.
          const wave = Math.sin(c * 0.035 + phase) * 0.6 + Math.sin(c * 0.013 + phase * 2) * 0.4;
          const t = Math.min(1, Math.max(0, t0 + wave * 0.09 * Math.sin(Math.PI * t0)));
          const x = t * n;
          const i = Math.floor(x);
          const k = Math.min(n, i + (x - i > BAYER[(r % 4) * 4 + (c % 4)] ? 1 : 0));
          const o = (r * cols + c) * 4;
          img.data[o] = colors[k][0];
          img.data[o + 1] = colors[k][1];
          img.data[o + 2] = colors[k][2];
          img.data[o + 3] = 255;
        }
      }
      ctx.putImageData(img, 0, 0);
      canvas.style.width = cols * s + "px";
      canvas.style.height = rows * s + "px";
    };

    draw();
    window.addEventListener("resize", draw, { passive: true });
  }

  const page = [...location.pathname].reduce((h, ch) => (Math.imul(h, 31) + ch.charCodeAt(0)) >>> 0, 17);
  document.querySelectorAll("[data-seam]").forEach((el, i) => setup(el, parseInt(el.dataset.seed || 0, 10) || page + 7919 * (i + 3)));
})();

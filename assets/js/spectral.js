/**
 * Laboratorio espectral: procesa una escena satelital en el navegador
 * (índices, clasificación por umbrales y detección de bordes) y la compara
 * con la imagen original mediante un deslizador.
 */
(function () {
  const root = document.querySelector("[data-spectral]");
  if (!root) return;

  const view = root.querySelector(".spectral__view");
  const base = root.querySelector("[data-layer=base]");
  const top = root.querySelector("[data-layer=top]");
  const legend = root.querySelector("[data-legend]");
  const label = root.querySelector("[data-mode-label]");
  const coords = root.querySelector("[data-coords]");
  const buttons = [...root.querySelectorAll("[data-mode]")];

  const W = 1100;
  const H = Math.round(W / (16 / 11));
  let src = null;

  const CLASSES = [
    { key: "nieve", name: "Nieve / hielo", color: [236, 248, 255] },
    { key: "veg", name: "Vegetación", color: [92, 184, 122] },
    { key: "suelo", name: "Roca / suelo desnudo", color: [227, 154, 45] },
    { key: "sombra", name: "Sombra / agua", color: [11, 60, 93] },
  ];

  const MODES = {
    clasificacion: { label: "Clasificación de coberturas", fn: classify },
    nieve: { label: "Índice de nieve (proxy)", fn: snowIndex },
    vigor: { label: "Vigor vegetal (proxy NIR)", fn: vigorIndex },
    bordes: { label: "Bordes · filtro Sobel", fn: sobel },
  };

  function lerpRamp(stops, t) {
    t = Math.max(0, Math.min(1, t));
    for (let i = 1; i < stops.length; i++) {
      if (t <= stops[i][0]) {
        const [t0, a] = stops[i - 1];
        const [t1, b] = stops[i];
        const k = (t - t0) / (t1 - t0 || 1);
        return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
      }
    }
    return stops[stops.length - 1][1];
  }

  const SNOW_RAMP = [
    [0, [4, 9, 15]],
    [0.35, [11, 60, 93]],
    [0.65, [43, 182, 200]],
    [1, [255, 255, 255]],
  ];
  const VIGOR_RAMP = [
    [0, [120, 72, 40]],
    [0.35, [227, 154, 45]],
    [0.55, [239, 229, 143]],
    [0.75, [92, 184, 122]],
    [1, [20, 90, 60]],
  ];

  function classify(d, out) {
    const counts = [0, 0, 0, 0];
    for (let i = 0; i < d.length; i += 4) {
      const r = d[i], g = d[i + 1], b = d[i + 2];
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const lum = (r + g + b) / 3;
      let c;
      if (lum > 165 && max - min < 70) c = 0;
      else if (r > g * 1.25 && r > b * 1.1) c = 1;
      else if (lum < 55) c = 3;
      else c = 2;
      counts[c]++;
      const col = CLASSES[c].color;
      out[i] = col[0];
      out[i + 1] = col[1];
      out[i + 2] = col[2];
      out[i + 3] = 255;
    }
    const total = d.length / 4;
    legend.innerHTML = CLASSES.map(
      (c, i) => `
        <div class="legend__row">
          <span><i class="legend__sw" style="background:rgb(${c.color.join(",")})"></i>${c.name}</span>
          <span class="legend__pct">${((counts[i] / total) * 100).toFixed(1)}%</span>
        </div>`
    ).join("");
  }

  function rampLegend(stops, left, right) {
    const css = stops.map(([t, c]) => `rgb(${c.join(",")}) ${t * 100}%`).join(",");
    legend.innerHTML = `
      <div class="legend__ramp" style="background:linear-gradient(90deg,${css})"></div>
      <div class="legend__ramp-labels"><span>${left}</span><span>${right}</span></div>`;
  }

  function snowIndex(d, out) {
    for (let i = 0; i < d.length; i += 4) {
      const r = d[i], g = d[i + 1], b = d[i + 2];
      const min = Math.min(r, g, b) / 255;
      const sat = (Math.max(r, g, b) - Math.min(r, g, b)) / 255;
      const v = Math.max(0, min - sat * 0.5);
      const c = lerpRamp(SNOW_RAMP, Math.pow(v, 0.9));
      out[i] = c[0];
      out[i + 1] = c[1];
      out[i + 2] = c[2];
      out[i + 3] = 255;
    }
    rampLegend(SNOW_RAMP, "Sin nieve", "Nieve");
  }

  function vigorIndex(d, out) {
    for (let i = 0; i < d.length; i += 4) {
      const r = d[i], g = d[i + 1];
      const nd = (r - g) / (r + g + 1);
      const c = lerpRamp(VIGOR_RAMP, (nd + 0.15) / 0.75);
      out[i] = c[0];
      out[i + 1] = c[1];
      out[i + 2] = c[2];
      out[i + 3] = 255;
    }
    rampLegend(VIGOR_RAMP, "Bajo", "Alto");
  }

  function sobel(d, out) {
    const gray = new Float32Array(W * H);
    for (let i = 0, p = 0; i < d.length; i += 4, p++) {
      gray[p] = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    }
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const i = (y * W + x) * 4;
        if (x === 0 || y === 0 || x === W - 1 || y === H - 1) {
          out[i] = out[i + 1] = out[i + 2] = 0;
          out[i + 3] = 255;
          continue;
        }
        const p = y * W + x;
        const gx =
          -gray[p - W - 1] - 2 * gray[p - 1] - gray[p + W - 1] +
          gray[p - W + 1] + 2 * gray[p + 1] + gray[p + W + 1];
        const gy =
          -gray[p - W - 1] - 2 * gray[p - W] - gray[p - W + 1] +
          gray[p + W - 1] + 2 * gray[p + W] + gray[p + W + 1];
        const m = Math.min(1, Math.sqrt(gx * gx + gy * gy) / 360);
        out[i] = 4 + 123 * m;
        out[i + 1] = 9 + 215 * m;
        out[i + 2] = 15 + 221 * m;
        out[i + 3] = 255;
      }
    }
    rampLegend([[0, [4, 9, 15]], [1, [127, 224, 236]]], "Homogéneo", "Borde");
  }

  function render(mode) {
    if (!src) return;
    const m = MODES[mode];
    const ctx = top.getContext("2d");
    const outImg = ctx.createImageData(W, H);
    m.fn(src.data, outImg.data);
    ctx.putImageData(outImg, 0, 0);
    label.textContent = m.label;
    buttons.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.mode === mode)));
  }

  function load() {
    const img = new Image();
    img.decoding = "async";
    img.src = root.dataset.src;
    img.onload = () => {
      [base, top].forEach((c) => {
        c.width = W;
        c.height = H;
      });
      const bctx = base.getContext("2d", { willReadFrequently: true });
      const s = Math.max(W / img.width, H / img.height);
      const dw = img.width * s;
      const dh = img.height * s;
      bctx.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh);
      src = bctx.getImageData(0, 0, W, H);
      render("clasificacion");
    };
  }

  // Deslizador de comparación
  function setSplit(clientX) {
    const r = view.getBoundingClientRect();
    const pct = Math.max(0, Math.min(100, ((clientX - r.left) / r.width) * 100));
    view.style.setProperty("--split", pct + "%");
  }

  let dragging = false;
  view.addEventListener("pointerdown", (e) => {
    dragging = true;
    view.setPointerCapture(e.pointerId);
    setSplit(e.clientX);
  });
  view.addEventListener("pointermove", (e) => {
    if (dragging) setSplit(e.clientX);
    if (coords) {
      const r = view.getBoundingClientRect();
      const fx = (e.clientX - r.left) / r.width;
      const fy = (e.clientY - r.top) / r.height;
      const px = Math.round(fx * W);
      const py = Math.round(fy * H);
      coords.textContent = `PX ${String(px).padStart(4, "0")} · ${String(py).padStart(4, "0")}`;
    }
  });
  view.addEventListener("pointerup", () => (dragging = false));
  view.addEventListener("pointercancel", () => (dragging = false));
  view.addEventListener("keydown", (e) => {
    const cur = parseFloat(getComputedStyle(view).getPropertyValue("--split")) || 50;
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      e.preventDefault();
      const next = Math.max(0, Math.min(100, cur + (e.key === "ArrowLeft" ? -5 : 5)));
      view.style.setProperty("--split", next + "%");
      view.setAttribute("aria-valuenow", String(Math.round(next)));
    }
  });

  buttons.forEach((b) => b.addEventListener("click", () => render(b.dataset.mode)));

  new IntersectionObserver(
    (entries, obs) => {
      if (entries[0].isIntersecting) {
        load();
        obs.disconnect();
      }
    },
    { rootMargin: "400px" }
  ).observe(root);
})();

"""Genera assets/img/curvas.svg: curvas de nivel de un relieve sintético.

Uso: python tools/curvas_nivel.py
"""
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np

ROOT = Path(__file__).resolve().parent.parent
W, H = 1600, 1000
rng = np.random.default_rng(33)

x, y = np.meshgrid(np.linspace(0, W, 400), np.linspace(0, H, 250))
z = np.zeros_like(x)
for _ in range(14):
    cx, cy = rng.uniform(-200, W + 200), rng.uniform(-200, H + 200)
    s = rng.uniform(140, 420)
    z += rng.uniform(-1, 1.6) * np.exp(-((x - cx) ** 2 + (y - cy) ** 2) / (2 * s * s))
z += 0.08 * np.sin(x / 90 + y / 140)

cs = plt.contour(x, y, z, levels=22)
paths = []
for i, segs in enumerate(cs.allsegs):
    for seg in segs:
        if len(seg) < 8:
            continue
        pts = seg[::2]
        d = "M" + " L".join(f"{px:.0f} {py:.0f}" for px, py in pts)
        paths.append((i % 5 == 0, d))

out = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" preserveAspectRatio="xMidYMid slice" fill="none" stroke="#0a2233">']
for index, d in paths:
    out.append(f'<path d="{d}" stroke-opacity="{0.16 if index else 0.08}" stroke-width="{1.4 if index else 1}"/>')
out.append("</svg>")
dst = ROOT / "assets" / "img" / "curvas.svg"
dst.write_text("".join(out), encoding="utf-8")
print(dst, dst.stat().st_size // 1024, "KB")

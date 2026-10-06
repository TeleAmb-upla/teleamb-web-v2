"""Convierte las imágenes de _originales/ a WebP optimizado en assets/img/.

Uso: python tools/optimizar_imagenes.py [carpeta ...]
"""
import sys
from pathlib import Path

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "_originales"
DST = ROOT / "assets" / "img"

# Ancho máximo por carpeta
MAX_WIDTH = {
    "fondo": 2000,
    "noticias": 1000,
    "publicaciones": 900,
    "team": 600,
    "plataformas": 1200,
    "": 800,
}
# Carpetas de trabajo que no se publican
SKIP_DIRS = {"preview", "qa", "equipo", "logos"}
# Archivos que deben conservar PNG (logos con transparencia)
KEEP_PNG = {"TeleAmb.png", "TeleAmb-vec.png", "Upla_Inst.png", "apple-touch-icon.png", "satellite.png"}


def convert(path: Path) -> None:
    rel = path.relative_to(SRC)
    folder = rel.parts[0] if len(rel.parts) > 1 else ""
    max_w = MAX_WIDTH.get(folder, 1200)

    img = Image.open(path)
    img = ImageOps.exif_transpose(img)
    if img.width > max_w:
        img = img.resize((max_w, round(img.height * max_w / img.width)), Image.LANCZOS)

    if path.name in KEEP_PNG:
        out = DST / rel
        out.parent.mkdir(parents=True, exist_ok=True)
        img.save(out, optimize=True)
    else:
        out = (DST / rel).with_suffix(".webp")
        out.parent.mkdir(parents=True, exist_ok=True)
        if img.mode not in ("RGB", "RGBA"):
            img = img.convert("RGBA" if "transparency" in img.info else "RGB")
        img.save(out, "WEBP", quality=78, method=6)
    print(f"{rel} -> {out.relative_to(ROOT)} ({out.stat().st_size // 1024} KB)")


def main() -> None:
    only = set(sys.argv[1:])
    for path in sorted(SRC.rglob("*")):
        rel = path.relative_to(SRC)
        if path.suffix.lower() not in {".jpg", ".jpeg", ".png", ".webp"}:
            continue
        if path.name.startswith("_") or (len(rel.parts) > 1 and rel.parts[0] in SKIP_DIRS):
            continue
        if only and (len(rel.parts) < 2 or rel.parts[0] not in only):
            continue
        convert(path)


if __name__ == "__main__":
    main()

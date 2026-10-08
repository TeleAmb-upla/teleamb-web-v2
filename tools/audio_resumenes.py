"""
Genera los resúmenes en audio de las publicaciones (voz sintetizada, es-CL y en).

Los guiones viven en data/publications.json -> Audio.transcripcion (español)
y Audio.transcripcion_en (inglés).
Uso:  python tools/audio_resumenes.py            (genera solo los que faltan)
      python tools/audio_resumenes.py --todos    (regenera todos)

Cuando un autor grabe su propia voz, basta con reemplazar el mp3 en
assets/audio/<ID>.mp3 (o assets/audio/en/<ID>.mp3), poner "sintetica": false
y actualizar "duracion" (o "duracion_en").
Requiere: pip install edge-tts
"""
import asyncio, json, sys
from pathlib import Path

import edge_tts

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data" / "publications.json"
BITRATE = 48000  # edge-tts: audio-24khz-48kbitrate-mono-mp3

# Voz, tono y velocidad por narrador e idioma, para que cada persona suene distinta.
PERSONAS = {
    "es": {
        "Freddy Saavedra": ("es-CL-LorenzoNeural", "-6Hz", "-6%"),
        "Carlos Romero": ("es-CL-LorenzoNeural", "+0Hz", "-3%"),
        "Javier Medina": ("es-CL-LorenzoNeural", "+5Hz", "+0%"),
        "Marcelo Leguía": ("es-CL-LorenzoNeural", "-2Hz", "-8%"),
        "Ana Hernández": ("es-CL-CatalinaNeural", "+0Hz", "-4%"),
    },
    "en": {
        "Freddy Saavedra": ("en-US-AndrewNeural", "-4Hz", "-6%"),
        "Carlos Romero": ("en-US-BrianNeural", "+0Hz", "-3%"),
        "Javier Medina": ("en-US-ChristopherNeural", "+2Hz", "+0%"),
        "Marcelo Leguía": ("en-GB-RyanNeural", "-2Hz", "-6%"),
        "Ana Hernández": ("en-US-AvaNeural", "+0Hz", "-4%"),
    },
}
DEFAULT = {
    "es": {"m": ("es-CL-LorenzoNeural", "+0Hz", "-4%"), "f": ("es-CL-CatalinaNeural", "+0Hz", "-4%")},
    "en": {"m": ("en-US-AndrewNeural", "+0Hz", "-4%"), "f": ("en-US-EmmaNeural", "+0Hz", "-4%")},
}
# Sufijo de los campos en el JSON y carpeta de salida por idioma.
LANGS = {"es": ("", None), "en": ("_en", "en")}


async def synth(text, voice, pitch, rate, out):
    await edge_tts.Communicate(text, voice, rate=rate, pitch=pitch).save(str(out))


def main():
    pubs = json.loads(DATA.read_text(encoding="utf-8"))
    todos = "--todos" in sys.argv
    for p in pubs:
        a = p.get("Audio")
        if not a or not a.get("sintetica", True):
            continue
        for lang, (suf, folder) in LANGS.items():
            text = a.get("transcripcion" + suf)
            if not text:
                continue
            src = f"assets/audio/{folder}/{p['ID']}.mp3" if folder else a["src"]
            a["src" + suf] = src
            out = ROOT / src
            if out.exists() and not todos and a.get("duracion" + suf):
                continue
            out.parent.mkdir(parents=True, exist_ok=True)
            voice, pitch, rate = PERSONAS[lang].get(a["voz"], DEFAULT[lang][a.get("genero", "m")])
            asyncio.run(synth(text, voice, pitch, rate, out))
            a["duracion" + suf] = round(out.stat().st_size * 8 / BITRATE)
            print(p["ID"], lang, out.name, a["voz"], a["duracion" + suf], "s")
    DATA.write_text(json.dumps(pubs, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()

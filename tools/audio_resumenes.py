"""
Genera los resúmenes en audio de las publicaciones (voz sintetizada, es-CL).

Los guiones viven en data/publications.json -> Audio.transcripcion.
Uso:  python tools/audio_resumenes.py            (genera solo los que faltan)
      python tools/audio_resumenes.py --todos    (regenera todos)

Cuando un autor grabe su propia voz, basta con reemplazar el mp3 en
assets/audio/<ID>.mp3, poner "sintetica": false y actualizar "duracion".
Requiere: pip install edge-tts
"""
import asyncio, json, sys
from pathlib import Path

import edge_tts

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data" / "publications.json"
BITRATE = 48000  # edge-tts: audio-24khz-48kbitrate-mono-mp3

# Voz, tono y velocidad por narrador, para que cada persona suene distinta.
PERSONAS = {
    "Freddy Saavedra": ("es-CL-LorenzoNeural", "-6Hz", "-6%"),
    "Carlos Romero": ("es-CL-LorenzoNeural", "+0Hz", "-3%"),
    "Javier Medina": ("es-CL-LorenzoNeural", "+5Hz", "+0%"),
    "Marcelo Leguía": ("es-CL-LorenzoNeural", "-2Hz", "-8%"),
    "Ana Hernández": ("es-CL-CatalinaNeural", "+0Hz", "-4%"),
}
DEFAULT = {"m": ("es-CL-LorenzoNeural", "+0Hz", "-4%"), "f": ("es-CL-CatalinaNeural", "+0Hz", "-4%")}


async def synth(text, voice, pitch, rate, out):
    await edge_tts.Communicate(text, voice, rate=rate, pitch=pitch).save(str(out))


def main():
    pubs = json.loads(DATA.read_text(encoding="utf-8"))
    todos = "--todos" in sys.argv
    for p in pubs:
        a = p.get("Audio")
        if not a or not a.get("sintetica", True):
            continue
        out = ROOT / a["src"]
        if out.exists() and not todos:
            continue
        out.parent.mkdir(parents=True, exist_ok=True)
        voice, pitch, rate = PERSONAS.get(a["voz"], DEFAULT[a.get("genero", "m")])
        asyncio.run(synth(a["transcripcion"], voice, pitch, rate, out))
        a["duracion"] = round(out.stat().st_size * 8 / BITRATE)
        print(p["ID"], out.name, a["voz"], a["duracion"], "s")
    DATA.write_text(json.dumps(pubs, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()

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
VOICES = {"m": "es-CL-LorenzoNeural", "f": "es-CL-CatalinaNeural"}
BITRATE = 48000  # edge-tts: audio-24khz-48kbitrate-mono-mp3


async def synth(text, voice, out):
    await edge_tts.Communicate(text, voice, rate="-4%").save(str(out))


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
        asyncio.run(synth(a["transcripcion"], VOICES[a.get("genero", "m")], out))
        a["duracion"] = round(out.stat().st_size * 8 / BITRATE)
        print(p["ID"], out.name, a["duracion"], "s")
    DATA.write_text(json.dumps(pubs, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()

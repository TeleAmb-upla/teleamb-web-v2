# TeleAmb · Sitio web

Sitio estático del Laboratorio de Teledetección y Monitoreo Ambiental (UPLA). HTML, CSS y JavaScript sin dependencias ni compilación: se puede publicar copiando la carpeta a cualquier hosting estático.

## Ver en local

Los contenidos se cargan desde `data/*.json`, por lo que hace falta un servidor (abrir el `index.html` con doble clic no carga noticias ni publicaciones):

```bash
python -m http.server 8000
```

Luego abrir <http://localhost:8000>.

## Actualizar contenidos

| Contenido      | Archivo                   | Imágenes                    |
| -------------- | ------------------------- | --------------------------- |
| Noticias       | `data/noticias.json`      | `assets/img/noticias/`      |
| Publicaciones  | `data/publications.json`  | `assets/img/publicaciones/` |
| Equipo         | `data/equipo.json`        | `assets/img/team/`          |
| Plataformas    | `data/plataformas.json`   | `assets/img/plataformas/`   |

Las noticias se ordenan por fecha automáticamente y su categoría (Nieve, Incendios, Ciudades…) se deduce del título. Las que vienen de Instagram llevan `"fuente": "instagram"` y `"cuenta"` (la cuenta que publicó, sin @), y la tarjeta lo indica. La noticia con `"destacada": true` ocupa la tarjeta grande en la página de noticias; conviene que tenga una imagen horizontal de buena resolución. En el equipo, `grupo` puede ser `direccion`, `investigacion` o `comunicaciones`.

## Inglés

El botón ES / EN de la cabecera cambia el idioma y la elección se recuerda entre páginas (también funciona `?lang=en` en la URL).

- **Datos:** cada texto tiene su versión en inglés en un campo con sufijo `_en` (`titulo_en`, `subtitulo_en`, `descripcion_en`, `bio_en`, `Divulgacion_en`, `Audio.transcripcion_en`). Las publicaciones usan `Titulo.en` y `Extracto.en`. Si falta el campo `_en`, se muestra el español.
- **Audios:** cada resumen tiene versión en inglés en `assets/audio/en/<ID>.mp3` (`Audio.src_en`, `Audio.duracion_en`). Con el sitio en inglés suena ese audio; si no existe, suena el español. `python tools/audio_resumenes.py` genera los que falten en ambos idiomas a partir de `transcripcion` y `transcripcion_en`.
- **Páginas:** los textos fijos del HTML se traducen con `assets/js/i18n-en.js`. La clave es el texto en español tal como está en el HTML; si se edita un texto en el HTML, hay que actualizar su clave en ese archivo o quedará en español.

## Imágenes

Las imágenes originales van en `_originales/` (no se publican). Para generar las versiones WebP optimizadas:

```bash
pip install pillow
python tools/optimizar_imagenes.py
```

## Estructura

```
index.html            Inicio (hero 3D, laboratorio espectral, líneas, proyecto destacado…)
team.html             Equipo
noticias.html         Noticias con filtros y buscador
publicaciones.html    Publicaciones con filtros por año, buscador y resúmenes
contact.html          Servicios y formulario de contacto
assets/css/styles.css Estilos
assets/js/main.js     Interacciones generales
assets/js/terrain.js  Nube de puntos del hero
assets/js/spectral.js Laboratorio espectral interactivo
assets/js/data.js     Render de noticias, publicaciones y equipo
assets/js/i18n.js     Selector de idioma y traducción de las páginas
assets/js/i18n-en.js  Diccionario español → inglés
```

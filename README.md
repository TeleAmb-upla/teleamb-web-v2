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

Las noticias se ordenan por fecha automáticamente y su categoría (Nieve, Incendios, Ciudades…) se deduce del título. En el equipo, `grupo` puede ser `direccion`, `investigacion` o `comunicaciones`.

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
```

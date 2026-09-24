# D'ORÉ Anahata — Landing Page (réplica standalone)

Réplica independiente (HTML/CSS/JS, sin dependencias de build) de la landing page de D'ORÉ Anahata, con pase de responsive para móviles, tablets y pantallas grandes.

## Estructura

- `index.html` — archivo único, listo para desplegar (Vercel, Netlify, GitHub Pages, cualquier hosting estático). Incluye CSS y JS inline, y carga Lenis/GSAP/Three.js vía CDN.
- `src/` — código fuente separado para referencia/edición (`styles.css`, `main.js`, `body.html`, `build.py`). `build.py` ensambla estos tres archivos en `index.html`.

## Notas

- El formulario B2B es solo visual (no conectado a backend). Para conectarlo, editar `LEAD_ENDPOINT` en `main.js`/`index.html`.
- Precio real: $129.900 COP.
- Imágenes/logo enlazados directamente desde doreanahata.co (hotlink).
- Modo "lite" automático en dispositivos móviles/de bajos recursos (desactiva Three.js/WebGL y usa un sol CSS).

## Deploy

Este repo está pensado para conectarse directamente a Vercel como sitio estático (sin build command, output = raíz).

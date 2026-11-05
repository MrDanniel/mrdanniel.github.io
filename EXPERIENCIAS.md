# Notas internas — experiencias ocultas (v4)

Mantener los `aria-label` genéricos de los disparadores («Detalle técnico» / «Technical detail»).
Los juegos se abren **dentro de la página** y arrancan al hacer clic en el icono.

| Juego | Entrada | Se inserta tras |
|---|---|---|
| Pulse | Esquina inferior derecha de la figura del hero | hero |
| Snake | Esquina superior derecha de la imagen de StringTune | ficha |
| Pong | Extremo derecho de la barra de filtros | filtros |
| Wordle | Borde derecho de la ficha de Señador | ficha |
| Buscaminas | Nota «i» bajo los proyectos | nota |
| Echo | Esquina superior derecha de la figura de «Enfoque» | Enfoque |
| Flap | Esquina inferior derecha de «Diseño útil» | valores |
| Compile | Cursor parpadeante **o cualquier texto morado** de `studio.config.ts` (6 puntos) | bloque de código |
| 2048 | Sobre los botones de contacto | contacto |
| Breakout | Esquina superior derecha del encabezado de «Estudio» | cabecera de sección |
| Lights Out | Esquina inferior izquierda de la barra del pie | pie |
| Crash 404 | Cualquier URL inexistente | — |
| Release 1.0 (jefe) | Tarjeta final del registro; requiere 12/12 juegos + 12/12 bugs | registro |

**Bugs (12):** 9 iconos escondidos, 5 clics en el nombre escrito del estudio (interferencia breve y tono creciente; sin monograma), código Konami (suena el jingle estilo RP2A03) y `dcs.debug()`.


## Intro de portada (v4)

- Solo se monta en las portadas `/` y `/en/`; no aparece en aplicaciones, páginas legales, plantilla ni 404.
- Escritorio con ratón/trackpad: secuencia de unos 7.6 s. En móviles y dispositivos táctiles no se solicita ni se ejecuta el archivo de la intro.
- También se omite con `prefers-reduced-motion`, ahorro de datos o hardware detectado como muy limitado (2 GB de memoria o 2 núcleos, cuando el navegador expone esos datos).
- La capa Canvas rasteriza una interpretación de la página real y aplica tres pasadas de bandas onduladas: formas orgánicas → mosaico cuadrado → caracteres ASCII. La capa se desvanece para dejar la página interactiva debajo.
- Incluye botón «Saltar intro» / «Skip intro» y tecla Escape. No reproduce audio ni guarda preferencias.
- No utiliza servicios ni bibliotecas externas.

## Jingle Konami
Siete acordes con síntesis tipo NES (2 pulsos al 12,5 % y 25 % + triangular, periodos cuantizados a 11 bits, NTSC/2A03).
**Las duraciones y silencios son una aproximación propia** (no verificada contra la partitura): editar `KONAMI_SCORE` en `assets/app.js`.

## Estado
`localStorage` → `dcs-fragments-v2` (descubrimientos, bugs, récords, estadísticas, acento, neón, jefe). Sonido: `dcs-audio`.
Puntaje total = suma normalizada (máx. 100 por juego) + puntaje del jefe; sale en la insignia PNG.

## Páginas nuevas sin programar
 `_plantilla-pagina.html`. Con `style.css` + `app.js` contiene cabecera, progreso, revelados, esquinas técnicas, partículas y sonido.
Con `<main class="page">` o `data-juice` se animan los hijos.

## Idiomas
`/` en español, `/en/` en inglés (`<html lang>` selecciona los textos de juegos y avisos). `legal/` y `apps/` solo en español.

## Pendiente
Los documentos de `legal/` y `apps/` conservan su cuerpo **sin modificar** (solo se añadió `canonical` y `apple-touch-icon` en el `<head>`).
Sustituir `assets/images/og-placeholder.png` por la imagen final.

# VJ CONSOLE

Consola VJ de dos capas (A/B) con clips 3D, efectos en shader, reactividad a audio/cámara,
Auto VJ y pantalla de salida. Misma app de siempre, ahora repartida por áreas.

## Cómo abrirla

**Doble clic en `index.html`.** Eso es todo: no hace falta instalar nada ni abrir ningún servidor.
Necesita internet (carga three.js y la cabeza 3D de ejemplo).

## Estructura

    index.html                 Estructura de los paneles + lista ordenada de scripts
    css/
      base.css                 reset, página y lienzo
      panels.css               contenedores laterales y títulos
      deck.css                 capas, crossfader, parrilla de clips, salida, monitor
      controls.css             sliders, selects, botones
      output.css               modo ventana de proyección
    js/
      config.js                IS_OUTPUT, HEAD_URL
      utils/rng.js             números aleatorios deterministas
      engine/                  MOTOR: shaders, state, materials, head, gl-helpers,
                               core, layers, render, transitions, mapping, quality
      clips/                   SISTEMA DE CLIPS: registry, helpers, video-clip, model-clip
      ui/                      PANELES: deck, param-controls, master-controls
      app/                     APLICACIÓN: camera-controls, reactivity, auto-vj, output-link,
                               rotation-tools, scenes, media-library, mapping-link, quality-link, main-loop, main (orquesta),
                               output-mapping (editor), output-mode, boot
    clips/
      builtin/                 los 12 clips originales (uno por archivo)
      custom/                  TUS clips 3D en JavaScript
      videos/                  TUS vídeos
      models/                  TUS modelos 3D (.glb)
      scenes/                  escenas .json exportadas (presets fijos)
    tools/sync-clips.js        registra lo que pongas en custom/ y videos/

Los archivos son scripts clásicos que comparten ámbito global (así sigue funcionando con doble clic
y la ventana de salida sigue copiándose igual). El orden de carga está en `index.html`.

## Giros, efectos, escenas y mapping

**Giro X / Y / Z**: tres sliders por capa (con selector A/B/AB) entre −0,05 y +0,05; el signo invierte el sentido.
X: + arriba→abajo, − abajo→arriba · Y: + izquierda→derecha, − derecha→izquierda · Z: + antihorario, − horario.
Requieren "Giro automático" activo. "Reiniciar giro" devuelve ambas capas a 0. Los sliders de giro tienen una **zona muerta** alrededor del 0 (si lo sueltas cerca, queda exactamente en 0 y deja de girar) y un **doble clic** en cualquier slider lo devuelve a su valor inicial. La salida sigue las velocidades de giro y de reproducción en vivo, sin pulsar "Enviar a salida".

**Efectos nuevos** (además de los 7 anteriores): Pixelado, Espejo, Zoom pulsante, Posterizar, Líneas de escaneo,
Invertir, Viñeta y Grano. Mismo selector A/B/AB; Zoom y Grano también reaccionan al audio.

**Escenas** (panel izquierdo): "Guardar escena" guarda clips activos, parámetros, giros, efectos, mezcla, BPM,
ganancias, transición y cámara de A y B. Clic en una escena la recupera. Se guardan en el navegador; "Exportar"
descarga un `.json` y "Importar" lo carga en otro equipo. Para dejarla fija en el proyecto, suelta el `.json` en
`clips/scenes/` y ejecuta `node tools/sync-clips.js`. Una escena no se envía sola a la salida: pulsa "Enviar a salida".

**Mapping** (panel derecho, solo afecta a la ventana de salida): actívalo con "Mapping" y pulsa "Editar en salida".
En la ventana de salida (haz clic en ella para enfocarla):

| Tecla | Acción |
|---|---|
| M | abrir/cerrar el editor |
| 1 · 2 · 3 | modo esquinas · malla · máscara |
| P | patrón de prueba (rejilla con esquinas de color TL/TR/BR/BL) |
| R | restablecer el modo actual |
| + / − | densidad de la malla (2×2 a 8×8) |
| flechas | ajuste fino (Mayús ×10) |
| clic dcho | borra punto de máscara / reinicia punto de malla |
| H | ocultar/mostrar la ayuda |

Esquinas = perspectiva real; malla = superficies curvas o irregulares; máscara = clic en vacío añade puntos al
contorno, lo de fuera queda negro (borde suave). El mapping se guarda en el navegador y se puede exportar/importar.

## Añadir tus modelos .glb y vídeos (lo fácil)

1. **Arrastra los archivos a la ventana** de la consola, o pulsa **"Añadir modelos .glb / vídeos…"** (panel izquierdo, bajo los clips).
2. Aparecen al final de la parrilla de clips. Haz clic para ponerlos en la capa A o B, como cualquier otro clip.
3. Se **guardan en tu navegador**: al volver a abrir la consola siguen ahí. Para quitar uno, pulsa la **×** de su botón.
4. La ventana de salida los recibe sola.

Puedes soltar varios a la vez. Formatos: `.glb` y vídeo (`.webm` es lo más compatible; `.mp4` solo H.264).

Cada **.glb** se dibuja por defecto en malla de alambre, centrado y escalado solo. Para ver **sus texturas y colores originales** activa el interruptor **"Textura (.glb)"** (panel derecho, junto a Pulsar; con selector A/B/AB y también en la salida). **"Color modelo (.glb, con textura)"** recolorea el modelo conservando su luminosidad y detalle (blanco o gris = sin tinte); en modo alambre el color es el "Color principal". En modo textura el modelo lleva luz propia, los metales se ven mates, "Opacidad malla" desde 0.90 se ve opaco y "Deformación" no se aplica. Si tiene animación o esqueleto, se reproduce
(Velocidad y BPM controlan su velocidad; Velocidad 0 la congela); si no, "Deformación" ondula la superficie.
Funcionan los .glb comprimidos con Draco (necesitan internet la primera vez). Si un modelo pesa mucho
(más de ~100 000 triángulos) irá lento: simplifícalo en Blender (Decimate).

Cada **vídeo** responde a Velocidad y BPM (velocidad de reproducción), Opacidad, Escala, Pulsar, efectos, mezcla,
crossfader, Auto VJ y salida. Solo se reproduce mientras está visible.

## Dejarlos fijos en el proyecto (opcional, para quien sepa usar la terminal)

Lo anterior guarda los archivos en *tu navegador*. Si quieres que viajen **dentro del proyecto** (por ejemplo para
llevarlo a otro ordenador sin copiar nada más), copia los archivos a `clips/models/` (.glb) o `clips/videos/` (vídeos)
y ejecuta `node tools/sync-clips.js` (requiere tener Node instalado). Abre entonces el proyecto con un servidor local:
`python3 -m http.server 8000` y entra en `http://localhost:8000` (el navegador no deja leer esas carpetas con doble clic).

**Clip 3D programado en JavaScript**: copia `clips/custom/_plantilla.js`, quítale el `_`, cambia el nombre de la
función y la `seed`, y ejecuta `node tools/sync-clips.js`. El contrato del clip está en `js/clips/registry.js`.
Sin Node: añade a mano la línea `<script src="clips/custom/mi-clip.js"></script>` entre `CLIPS:START` y `CLIPS:END`
en `index.html`.

**Cabeza de los clips de cabeza** (Catrina, Hilos, Mexica…): para usar tu propio modelo, cambia `HEAD_URL` en
`js/config.js` por `'clips/models/tu-cabeza.glb'` (requiere servidor local; usa la malla más grande, sin reescalar).

## Rendimiento (si va con lag)

Panel derecho → **Rendimiento**. Cada ventana (vista previa y salida) tiene su propia **Calidad**:
Por defecto ambas están al **100 %** (la nitidez original). **Auto** baja la resolución interna sola si la imagen va lenta (nunca por debajo del 60 %) y la vuelve a subir con calma cuando hay margen; 100 / 75 / 50 / 35 % la fijan. Bajar la calidad hace las líneas de la malla más gruesas y suaves: úsalo solo si necesitas fluidez. Verás los fps y el % reales al lado. Consejos:
- Pon la **vista previa más baja** (50 %) y deja la **salida** en Auto o 100 %: la vista previa no necesita tanta calidad.
- El **"Efecto cristal" de los paneles** (desenfoque) está apagado por defecto porque cuesta muchos fps; actívalo si tu equipo va sobrado.
- Una capa que no se ve (crossfader al extremo A o B, u opacidad 0) **no se dibuja**, y los efectos a 0 no gastan una pasada: dejar el crossfader en un extremo aligera mucho.
- El clip **Betta** es el más pesado (dibuja un canvas de 1280×720 en cada frame); los modelos .glb de muchos triángulos también.
- El pequeño monitor de "Retorno · pantalla de salida" se actualiza ~2 veces por segundo para no frenar la salida.

## Auto VJ

Es un piloto automático **progresivo y no destructivo**: entra con una rampa de ~8 s, sale con una de ~2,5 s y **nunca modifica
tus valores** (los superpone), así que al apagarlo vuelves exactamente a tu configuración manual.
Cada compás (8 tiempos del BPM) cambia el clip de la capa que no se ve, desliza el crossfader hacia ella y rota entre 2-3 efectos
distintos con fundidos de ~3 s. Mientras está activo puedes cambiar a mano el clip de la capa visible; si mueves el crossfader tú,
el piloto sigue desde esa posición.

## Notas

- La pantalla de salida reproduce su propia copia del vídeo (no va sincronizada fotograma a fotograma).
- El mapping y la antialias: la imagen se dibuja sin MSAA en pantalla (ahorra GPU); si ves los bordes del cuadrilátero del mapping algo dentados, usa un borde suave en la máscara.
- La pantalla de salida transiciona los parámetros (color, giros, efectos…) durante la "Duración transición".
- Un vídeo es un plano dentro de la capa: con "Giro automático" activo gira como el Betta. Ponlo en OFF o
  Giro = 0 para verlo plano.

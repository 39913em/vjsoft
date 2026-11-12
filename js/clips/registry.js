/* ============================================================
   CLIPS · registro
   Todos los clips se registran aquí: CLIP_DEFS.<clave> = { ... }.
   ============================================================ */
'use strict';

/* Cada clip es una función buildXxx(mats) que devuelve:
     { group: THREE.Group, update(t, dt, p) {...} }

   - mats: { primary, accent, line, occ }  (ya con el color/opacidad de la UI)
   - t:    tiempo acumulado de la capa (respeta BPM / velocidad / audio)
   - dt:   delta ~16.67ms (1.0 = 60fps)
   - p:    { deform, talking, pulsing, textured, colModel }    (deform ya incluye el audio)

   REGLAS:
   • Usa rng() en lugar de Math.random() para la geometría
   • Usa los materiales de mats para heredar la UI
   • No rotes/escales el group raíz — anima vértices o hijos
   • group.position.y = -1 es la convención de centrado

   Y se registra con:
     CLIP_DEFS.miClip = { label, tag, head, build, seed, auto? };
       label: texto en el clip          tag:  subtítulo pequeño
       head:  true si usa headGeometry  build: tu función buildXxx
       seed:  semilla única para rng()  auto:  false = Auto VJ no lo elige (opcional)

   El orden de carga de los archivos define la numeración del deck. */

const CLIP_DEFS = {};

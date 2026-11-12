/* ============================================================
   APP · arranque
   Decide si esta ventana es la consola o la salida, y arranca.
   Usa:      IS_OUTPUT, initMain(), initOutput()
   ============================================================ */
'use strict';

function boot() { if (IS_OUTPUT) initOutput(); else initMain(); }
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();

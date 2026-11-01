
'use strict';

function boot() { if (IS_OUTPUT) initOutput(); else initMain(); }
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();

// client.js - socket entry (expects server to emit 'scoreUpdate' with full teams array)
// Uses updateData from script.js. If Socket.IO is not available, falls back to no-op.

(function(){
  const btnRandom = document.getElementById('btnRandom');
  const autoToggle = document.getElementById('autoToggle');

  function safeLog() {
    try { console.log.apply(console, arguments); } catch(e) {}
  }

  // try to connect socket.io if available
  if (typeof io !== 'undefined') {
    const socket = io();
    socket.on('connect', ()=> safeLog('socket connected'));
    socket.on('scoreUpdate', (teams) => {
      // expect teams: [{ name, punkte, drinks: { ... } }, ...]
      if (Array.isArray(teams)) {
        try {
          updateData(teams);
        } catch(e){ safeLog('updateData error', e); }
      }
    });
  } else {
    safeLog('Socket.IO not found – running in demo mode.');
  }

  // Debug random update (local)
  if (btnRandom) btnRandom.addEventListener('click', ()=> {
    // mutate sample: add random points to a random team if updateData exists
    try {
      if (typeof window.updateData === 'function') {
        // create new array from current DOM: quick hack — call updateData with mutated copy
        const sample = window._SAMPLE_TEAMS || null;
        if (Array.isArray(sample)) {
          const t = sample[Math.floor(Math.random()*sample.length)];
          t.punkte += Math.floor(Math.random()*10)+1;
          const copy = sample.map(s=>({...s}));
          updateData(copy);
        }
      } else {
        // fallback: nothing
        location.reload();
      }
    } catch(e){ safeLog(e); }
  });

})();

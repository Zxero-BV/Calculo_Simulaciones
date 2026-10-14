/* lab.js — simulación de partículas, test automático y tabla de mediciones */
(function (App) {
  'use strict';
  var $ = App.$, esc = App.esc;

  var LABELS = ['Lento', 'Aceptable', 'Fluido'];
  var VCLASS = ['v-bad', 'v-mid', 'v-ok'];
  App.LABELS = LABELS;
  App.VCLASS = VCLASS;

  /* ---------- Motor de simulación ---------- */
  var cv = $('#simCanvas'), cx = cv.getContext('2d');
  var W = cv.width, H = cv.height;
  var nRange = $('#nRange');
  var fpsOut = $('#fpsOut'), nOut = $('#nOut');
  var sim = { running: false, parts: [], last: 0, times: [], raf: 0, collect: false };
  var fpsRoll = [], lastHud = 0;
  var testing = false, userPaused = false;

  function initParts(n) {
    sim.parts = [];
    for (var i = 0; i < n; i++) {
      var ang = Math.random() * 6.283, r = 40 + Math.random() * Math.min(W, H) * 0.38;
      sim.parts.push({
        x: W / 2 + Math.cos(ang) * r, y: H / 2 + Math.sin(ang) * r,
        vx: -Math.sin(ang) * (0.8 + Math.random() * 0.6), vy: Math.cos(ang) * (0.8 + Math.random() * 0.6),
        h: 170 + Math.random() * 130
      });
    }
  }

  function stepSim(ts) {
    if (!sim.running) return;
    var dt = ts - sim.last; sim.last = ts;
    if (dt > 0 && dt < 1000) {
      if (sim.collect) sim.times.push(dt);
      fpsRoll.push(dt); if (fpsRoll.length > 30) fpsRoll.shift();
    }
    var P = sim.parts, n = P.length, i, j, a, b, dx, dy, d2, inv;
    var G = 900 / n;
    for (i = 0; i < n; i++) {
      a = P[i]; var ax = 0, ay = 0;
      for (j = 0; j < n; j++) {
        if (i === j) continue;
        b = P[j]; dx = b.x - a.x; dy = b.y - a.y; d2 = dx * dx + dy * dy + 120;
        inv = G / (d2 * Math.sqrt(d2)); ax += dx * inv; ay += dy * inv;
      }
      a.vx += ax * 60; a.vy += ay * 60;
    }
    cx.fillStyle = 'rgba(6,10,23,.28)'; cx.fillRect(0, 0, W, H);
    for (i = 0; i < n; i++) {
      a = P[i];
      a.vx += (W / 2 - a.x) * 0.00012; a.vy += (H / 2 - a.y) * 0.00012;
      a.vx *= 0.9995; a.vy *= 0.9995;
      a.x += a.vx; a.y += a.vy;
      cx.fillStyle = 'hsl(' + a.h + ',90%,65%)';
      cx.fillRect(a.x, a.y, 2.4, 2.4);
    }
    if (ts - lastHud > 400 && fpsRoll.length) {
      var s = 0; for (i = 0; i < fpsRoll.length; i++) s += fpsRoll[i];
      fpsOut.textContent = Math.round(1000 / (s / fpsRoll.length));
      lastHud = ts;
    }
    sim.raf = requestAnimationFrame(stepSim);
  }
  function startSim() {
    if (sim.running) return;
    sim.running = true; sim.last = performance.now(); fpsRoll = [];
    sim.raf = requestAnimationFrame(stepSim);
  }
  function stopSim() { sim.running = false; cancelAnimationFrame(sim.raf); }

  function setN(n) {
    nOut.textContent = n; $('#nLabel').textContent = n;
    var inter = n * n, perSec = inter * 60;
    $('#fInter').textContent = App.fmt(inter);
    $('#fSec').textContent = perSec >= 1e6 ? App.fmt(perSec / 1e6, 1) + ' millones' : App.fmt(perSec);
    initParts(n);
    cx.fillStyle = '#060a17'; cx.fillRect(0, 0, W, H);
  }
  nRange.addEventListener('input', function () { setN(+nRange.value); });
  setN(200);

  var toggleBtn = $('#toggleSim');
  toggleBtn.addEventListener('click', function () {
    userPaused = !userPaused;
    if (userPaused) { stopSim(); toggleBtn.textContent = '▶ Reanudar simulación'; fpsOut.textContent = '--'; }
    else { startSim(); toggleBtn.textContent = '⏸ Pausar simulación'; }
  });

  // Solo corre mientras es visible (ahorra batería y CPU)
  new IntersectionObserver(function (en) {
    if (testing) return;
    var vis = en[0].isIntersecting;
    if (vis && !userPaused) startSim(); else if (!vis) stopSim();
  }, { threshold: 0.1 }).observe(cv);

  /* ---------- Información del sistema ---------- */
  $('#siCores').textContent = navigator.hardwareConcurrency || 'n/d';
  $('#siRam').textContent = navigator.deviceMemory ? (navigator.deviceMemory + ' GB') : 'n/d';
  var conn = navigator.connection || navigator.mozConnection;
  $('#siNet').textContent = (conn && conn.effectiveType) ? conn.effectiveType.toUpperCase() : 'n/d';

  /* ---------- Test automático ---------- */
  var bar = $('#bar'), statusEl = $('#status'), runBtn = $('#runTest'), resultBox = $('#result');
  var last = null;

  function cpuTest(onProg) {
    return new Promise(function (resolve) {
      var total = 6000000, chunk = 200000, done = 0, acc = 0, t0 = performance.now();
      (function run() {
        var end = Math.min(done + chunk, total);
        for (var i = done; i < end; i++) { var x = Math.random(); acc += Math.sqrt(x) * Math.sin(x * i) + Math.cos(x); }
        done = end; onProg(done / total);
        if (done < total) setTimeout(run, 0);
        else resolve({ ms: performance.now() - t0, sink: acc });
      })();
    });
  }

  function simTest(onProg) {
    return new Promise(function (resolve) {
      nRange.value = 300; setN(300);
      sim.times = []; sim.collect = true;
      stopSim(); startSim();
      var t0 = performance.now(), dur = 4000;
      var iv = setInterval(function () {
        var p = (performance.now() - t0) / dur; onProg(Math.min(p, 1));
        if (p >= 1) {
          clearInterval(iv); sim.collect = false; stopSim();
          var arr = sim.times.slice(8);
          if (arr.length < 5) { resolve({ fps: 0, stab: 0 }); return; }
          var m = 0, i; for (i = 0; i < arr.length; i++) m += arr[i]; m /= arr.length;
          var v = 0; for (i = 0; i < arr.length; i++) v += (arr[i] - m) * (arr[i] - m); v = Math.sqrt(v / arr.length);
          resolve({ fps: 1000 / m, stab: Math.max(0, Math.min(100, 100 - (v / m) * 100)) });
        }
      }, 100);
    });
  }

  // 0 = lento, 1 = aceptable, 2 = fluido
  function classify(ms, fps) {
    var c = ms < 700 ? 2 : ms < 2000 ? 1 : 0;
    var g = fps >= 50 ? 2 : fps >= 28 ? 1 : 0;
    return Math.min(c, g);
  }
  App.classify = classify;

  runBtn.addEventListener('click', async function () {
    if (testing) return;
    testing = true; runBtn.disabled = true; resultBox.classList.remove('show');
    bar.style.width = '0%';
    statusEl.textContent = 'Prueba 1 de 2: cálculo puro…';
    var c = await cpuTest(function (p) { bar.style.width = (p * 45) + '%'; });
    statusEl.textContent = 'Prueba 2 de 2: simulación gráfica…';
    var s = await simTest(function (p) { bar.style.width = (45 + p * 55) + '%'; });
    bar.style.width = '100%';
    statusEl.textContent = 'Test terminado.';
    var cls = classify(c.ms, s.fps);
    last = { ms: c.ms, fps: s.fps, stab: s.stab, cls: cls };
    $('#rCpu').textContent = (c.ms / 1000).toFixed(2) + ' s';
    $('#rFps').textContent = Math.round(s.fps);
    $('#rStab').textContent = Math.round(s.stab) + '%';
    var v = $('#verdict');
    v.textContent = LABELS[cls];
    v.className = 'verdict ' + VCLASS[cls];
    $('#verdictText').textContent = [
      'Este equipo tiene dificultades con simulaciones exigentes. Conviene usar versiones livianas y cerrar otros programas.',
      'Funciona, pero con simulaciones grandes puede ir justo. Usar pocas pestañas ayuda bastante.',
      'Este equipo calcula con holgura. Puede correr simulaciones educativas sin problemas.'
    ][cls];
    resultBox.classList.add('show');
    App.vibrate([30, 40, 30]);
    setTimeout(function () { resultBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, 60);
    testing = false; runBtn.disabled = false;
    userPaused = false; toggleBtn.textContent = '⏸ Pausar simulación'; startSim();
  });

  /* ---------- Tabla de registro ---------- */
  var rows = App.store.get('mediciones', []);
  var tbody = $('#tbody'), tfoot = $('#tfoot'), barsBox = $('#bars');

  function persist() { App.store.set('mediciones', rows); App.emit('mediciones:change', rows); }

  function render() {
    if (!rows.length) {
      tbody.innerHTML = '<tr><td colspan="5" class="empty">Aún no hay mediciones. Haz el test y guárdalo aquí.</td></tr>';
      tfoot.innerHTML = ''; barsBox.innerHTML = ''; return;
    }
    tbody.innerHTML = rows.map(function (r, i) {
      return '<tr><td class="cell-name" data-label="Sala">' + esc(r.sala) + '</td>' +
        '<td data-label="Estado"><span class="verdict ' + VCLASS[r.cls] + '">' + LABELS[r.cls] + '</span></td>' +
        '<td data-label="Tiempo promedio">' + (r.ms / 1000).toFixed(2) + ' s · ' + Math.round(r.fps) + ' FPS</td>' +
        '<td data-label="Estabilidad">' + Math.round(r.stab) + '%</td>' +
        '<td class="cell-del"><button class="del" type="button" data-i="' + i + '" aria-label="Eliminar ' + esc(r.sala) + '">✕</button></td></tr>';
    }).join('');
    var ms = 0, st = 0;
    rows.forEach(function (r) { ms += r.ms; st += r.stab; });
    tfoot.innerHTML = '<tr><td class="cell-name" data-label="Resumen">Promedio general (' + rows.length + ')</td><td></td><td data-label="Tiempo promedio">' +
      (ms / rows.length / 1000).toFixed(2) + ' s</td><td data-label="Estabilidad">' + Math.round(st / rows.length) + '%</td><td></td></tr>';

    var max = Math.max.apply(null, rows.map(function (r) { return r.ms; }));
    barsBox.innerHTML = '<h4>Tiempo de cálculo por equipo (menos es mejor)</h4>' + rows.map(function (r) {
      return '<div class="bar-row"><span class="bar-label">' + esc(r.sala) + '</span>' +
        '<div class="bar-track"><i class="bar-fill c' + r.cls + '" style="width:' + (r.ms / max * 100) + '%"></i></div>' +
        '<b>' + (r.ms / 1000).toFixed(2) + ' s</b></div>';
    }).join('');
  }

  $('#saveBtn').addEventListener('click', function () {
    if (!last) return;
    var inp = $('#sala');
    var name = inp.value.trim() || ('Equipo ' + (rows.length + 1));
    rows.push({ sala: name, ms: last.ms, fps: last.fps, stab: last.stab, cls: last.cls, fecha: new Date().toISOString() });
    persist(); render(); inp.value = '';
    App.toast('Medición guardada');
    App.vibrate(20);
    tbody.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });

  tbody.addEventListener('click', function (e) {
    var b = e.target.closest('.del');
    if (!b) return;
    rows.splice(+b.dataset.i, 1); persist(); render();
  });

  $('#clearBtn').addEventListener('click', function () {
    if (rows.length && confirm('¿Borrar todas las mediciones?')) { rows = []; persist(); render(); }
  });

  $('#csvBtn').addEventListener('click', function () {
    if (!rows.length) { App.toast('No hay mediciones para exportar'); return; }
    var data = [['Sala', 'Estado', 'Tiempo de cálculo (s)', 'FPS', 'Estabilidad (%)', 'Fecha']];
    rows.forEach(function (r) {
      data.push([r.sala, LABELS[r.cls], (r.ms / 1000).toFixed(2), Math.round(r.fps), Math.round(r.stab), (r.fecha || '').slice(0, 10)]);
    });
    App.download('mediciones.csv', App.csv(data), 'text/csv;charset=utf-8');
  });

  render();
})(window.App);

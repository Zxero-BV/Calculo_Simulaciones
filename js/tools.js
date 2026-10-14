/* tools.js — gráfico de crecimiento, calculadora, checklist, encuesta, quiz y glosario */
(function (App) {
  'use strict';
  var $ = App.$, esc = App.esc, fmt = App.fmt;

  function css(name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); }
  function verdictOf(fps) { return fps >= 50 ? 2 : fps >= 28 ? 1 : 0; }

  /* =====================================================
     1. GRÁFICO DE CRECIMIENTO (N, N log N, N²)
     ===================================================== */
  (function growth() {
    var cv = $('#growthChart'), ctx = cv.getContext('2d');
    var nR = $('#gN'), sp = $('#gSpeed');

    function short(n) {
      if (n >= 1e6) return fmt(n / 1e6, 1) + ' M';
      if (n >= 1e3) return fmt(n / 1e3) + ' mil';
      return fmt(n);
    }

    function draw() {
      var d = Math.min(window.devicePixelRatio || 1, 2), w = cv.clientWidth, h = cv.clientHeight;
      if (!w) return;
      cv.width = w * d; cv.height = h * d;
      ctx.setTransform(d, 0, 0, d, 0, 0); ctx.clearRect(0, 0, w, h);

      var L = 56, R = 16, T = 16, B = 38, pw = w - L - R, ph = h - T - B;
      var maxN = 1000, maxY = maxN * maxN, n = +nR.value;
      var muted = css('--muted'), grid = css('--card-b');
      var green = css('--green'), yellow = css('--yellow'), red = css('--red'), cyan = css('--cyan');
      function X(v) { return L + pw * v / maxN; }
      function Y(v) { return T + ph - ph * v / maxY; }

      ctx.font = '11px Inter, sans-serif'; ctx.lineWidth = 1;
      ctx.strokeStyle = grid; ctx.fillStyle = muted;
      var i;
      ctx.textAlign = 'right';
      for (i = 0; i <= 4; i++) {
        var yy = T + ph - ph * i / 4;
        ctx.beginPath(); ctx.moveTo(L, yy); ctx.lineTo(L + pw, yy); ctx.stroke();
        ctx.fillText(short(maxY * i / 4), L - 8, yy + 4);
      }
      ctx.textAlign = 'center';
      for (i = 0; i <= 5; i++) ctx.fillText(String(maxN * i / 5), L + pw * i / 5, T + ph + 16);
      ctx.fillText('N (cantidad de objetos)', L + pw / 2, h - 6);

      function curve(fn, color) {
        ctx.beginPath();
        for (var v = 0; v <= maxN; v += 5) {
          var px = X(v), py = Y(fn(v));
          if (v === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.strokeStyle = color; ctx.lineWidth = 2.5; ctx.stroke();
      }
      function lin(v) { return v; }
      function nlog(v) { return v * Math.log2(Math.max(v, 1)); }
      function quad(v) { return v * v; }
      curve(lin, green); curve(nlog, yellow); curve(quad, red);

      // marcador del N actual
      ctx.setLineDash([5, 4]); ctx.strokeStyle = cyan; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(X(n), T); ctx.lineTo(X(n), T + ph); ctx.stroke(); ctx.setLineDash([]);
      [[lin, green], [nlog, yellow], [quad, red]].forEach(function (p) {
        ctx.beginPath(); ctx.arc(X(n), Y(p[0](n)), 5, 0, 6.283); ctx.fillStyle = p[1]; ctx.fill();
      });
    }

    function update() {
      var n = +nR.value, q = n * n;
      $('#gNLabel').textContent = n;
      $('#gLin').textContent = fmt(n);
      $('#gNlog').textContent = fmt(Math.round(n * Math.log2(n)));
      $('#gQuad').textContent = fmt(q);

      var speed = +sp.value * 1e6;       // operaciones simples por segundo
      var sec = (q * 20) / speed;        // 20 operaciones por interacción
      var ms = sec * 1000, fps = Math.min(60, 1 / sec);
      $('#gMs').textContent = (ms < 10 ? ms.toFixed(1) : fmt(ms)) + ' ms';
      $('#gFps').textContent = fmt(fps);
      var v = verdictOf(fps), el = $('#gVerdict');
      el.textContent = ['Se trabaría', 'Justo', 'Fluido'][v];
      el.className = 'verdict ' + ['v-bad', 'v-mid', 'v-ok'][v];
      $('#gNote').textContent = 'Para 60 FPS cada cuadro debe tardar menos de 16,7 ms. Con la mitad de objetos (' +
        fmt(Math.round(n / 2)) + ') el trabajo baja a la cuarta parte: ' + fmt(Math.round(q / 4)) + ' interacciones.';
      draw();
    }

    nR.addEventListener('input', update);
    sp.addEventListener('change', update);
    window.addEventListener('resize', draw);
    document.addEventListener('theme:change', draw);
    update();
    // El gráfico aparece con la sección; redibuja cuando ya tiene tamaño
    new IntersectionObserver(function (en) { if (en[0].isIntersecting) draw(); }).observe(cv);
  })();

  /* =====================================================
     2. CALCULADORA "¿PUEDE MI EQUIPO?"
     ===================================================== */
  (function estimator() {
    var presets = [
      { id: 'pendulo', name: 'Péndulo y resortes', n: 25, desc: 'Pocos objetos: movimiento simple (≈ 25 cuerpos)' },
      { id: 'gas', name: 'Gas ideal (moléculas)', n: 150, desc: 'Choques entre moléculas (≈ 150 partículas)' },
      { id: 'gravedad', name: 'Gravedad entre cuerpos', n: 300, desc: 'Sistema solar ampliado (≈ 300 cuerpos)' },
      { id: 'fluidos', name: 'Fluidos con partículas', n: 600, desc: 'Agua simulada con partículas (≈ 600)' },
      { id: 'galaxia', name: 'Galaxia completa', n: 1500, desc: 'Simulación muy pesada (≈ 1.500 cuerpos)' }
    ];
    var sel = App.store.get('preset', 2);
    var rate = App.store.get('rate', 0);   // interacciones por segundo

    var box = $('#presets');
    box.innerHTML = presets.map(function (p, i) {
      return '<label class="preset"><input type="radio" name="preset" value="' + i + '"' + (i === sel ? ' checked' : '') + '>' +
        '<div><b>' + esc(p.name) + '</b><span>' + esc(p.desc) + '</span></div></label>';
    }).join('');
    box.addEventListener('change', function (e) {
      sel = +e.target.value; App.store.set('preset', sel); render();
    });

    function render() {
      var estBox = $('#estBox'), hint = $('#estHint');
      if (!rate) { estBox.classList.remove('show'); hint.style.display = ''; return; }
      hint.style.display = 'none'; estBox.classList.add('show');
      var p = presets[sel], per = p.n * p.n;
      var ms = per / rate * 1000, fps = Math.min(60, 1000 / ms);
      $('#estName').textContent = p.name + ' · ' + fmt(p.n) + ' partículas';
      var g = $('#estGauge'), v = verdictOf(fps);
      g.style.width = Math.max(3, fps / 60 * 100) + '%';
      g.style.background = ['var(--red)', 'var(--yellow)', 'var(--green)'][v];
      $('#estFps').textContent = fmt(fps);
      $('#estMs').textContent = ms < 10 ? ms.toFixed(1) : fmt(ms);
      $('#estRate').textContent = fmt(rate / 1e6, 1);
      var el = $('#estVerdict');
      el.textContent = ['Se trabaría', 'Justo', 'Fluido'][v];
      el.className = 'verdict ' + ['v-bad', 'v-mid', 'v-ok'][v];
      $('#estNote').textContent = [
        'Este equipo no alcanzaría los cuadros necesarios. Usa una versión más liviana o reduce la cantidad de partículas.',
        'Puede funcionar, pero con poco margen. Cierra otras pestañas y programas para no perder fluidez.',
        'Debería funcionar con soltura. La estimación no incluye el tiempo de dibujar en pantalla.'
      ][v];
      $('#estMax60').textContent = fmt(Math.floor(Math.sqrt(rate / 60)));
      $('#estMax30').textContent = fmt(Math.floor(Math.sqrt(rate / 30)));
    }

    function calibrate() {
      return new Promise(function (resolve) {
        var n = 200, x = new Float64Array(n), y = new Float64Array(n), vx = new Float64Array(n), vy = new Float64Array(n), i;
        for (i = 0; i < n; i++) { x[i] = Math.random() * 800; y[i] = Math.random() * 500; }
        var steps = 0, sink = 0, t0 = performance.now();
        function kernel() {
          var a, b;
          for (a = 0; a < n; a++) {
            var ax = 0, ay = 0, xa = x[a], ya = y[a];
            for (b = 0; b < n; b++) {
              if (a === b) continue;
              var dx = x[b] - xa, dy = y[b] - ya, d2 = dx * dx + dy * dy + 120, inv = 1 / (d2 * Math.sqrt(d2));
              ax += dx * inv; ay += dy * inv;
            }
            vx[a] += ax * 60; vy[a] += ay * 60;
          }
          for (a = 0; a < n; a++) { x[a] += vx[a] * 0.01; y[a] += vy[a] * 0.01; }
          sink += x[0];
        }
        (function run() {
          var t1 = performance.now();
          do { kernel(); steps++; } while (performance.now() - t1 < 40);
          if (performance.now() - t0 < 900) setTimeout(run, 0);
          else { App._sink = sink; resolve(steps * n * n / ((performance.now() - t0) / 1000)); }
        })();
      });
    }

    var btn = $('#calBtn');
    btn.addEventListener('click', function () {
      btn.disabled = true; btn.textContent = '⏳ Calibrando…';
      setTimeout(function () {
        calibrate().then(function (r) {
          rate = r; App.store.set('rate', r); render();
          btn.disabled = false; btn.textContent = '⚙ Volver a calibrar';
          App.toast('Equipo calibrado');
        });
      }, 60);
    });
    if (rate) btn.textContent = '⚙ Volver a calibrar';
    render();
  })();

  /* =====================================================
     3. CHECKLIST
     ===================================================== */
  (function checklist() {
    var items = [
      'Cerré las pestañas y ventanas que no necesito',
      'Cerré otros programas (música, descargas, mensajería)',
      'Conecté el equipo al cargador (si es notebook)',
      'Abrí y cargué la simulación antes de que empiece la clase',
      'Elegí la versión más liviana o bajé la cantidad de partículas y la calidad',
      'Reinicié el equipo si llevaba muchas horas encendido',
      'Trabajamos en parejas para usar menos equipos a la vez',
      'Anoté el tiempo que tardó en cargar'
    ];
    var state = App.store.get('checklist', []);
    var box = $('#checklist');

    function draw() {
      box.innerHTML = items.map(function (t, i) {
        var on = !!state[i];
        return '<label class="check' + (on ? ' done' : '') + '"><input type="checkbox" data-i="' + i + '"' + (on ? ' checked' : '') + '><span>' + esc(t) + '</span></label>';
      }).join('');
      var done = items.filter(function (_, i) { return state[i]; }).length;
      $('#chkBar').style.width = (done / items.length * 100) + '%';
      $('#chkText').textContent = done === items.length
        ? '🎉 ¡Todo listo! Tu equipo está preparado para la simulación.'
        : done + ' de ' + items.length + ' listo' + (done === 1 ? '' : 's');
    }
    box.addEventListener('change', function (e) {
      var i = +e.target.dataset.i;
      state[i] = e.target.checked;
      App.store.set('checklist', state); draw();
    });
    $('#chkReset').addEventListener('click', function () { state = []; App.store.set('checklist', state); draw(); });
    draw();
  })();

  /* =====================================================
     4. ENCUESTA
     ===================================================== */
  (function survey() {
    var form = $('#surveyForm'), box = $('#surveyRes');
    var data = App.store.get('encuesta', []);

    $('#lentitud').addEventListener('input', function (e) { $('#lentOut').textContent = e.target.value; });
    $('#afecta').addEventListener('input', function (e) { $('#afectaOut').textContent = e.target.value; });

    // "Ninguno" es excluyente con los demás problemas
    var none = $('#probNone'), probs = App.$$('input[name="problemas"]');
    probs.forEach(function (c) {
      c.addEventListener('change', function () {
        if (!c.checked) return;
        if (c === none) probs.forEach(function (o) { if (o !== none) o.checked = false; });
        else none.checked = false;
      });
    });

    function persist() { App.store.set('encuesta', data); App.emit('encuesta:change', data); }

    function barRows(items, total) {
      return items.map(function (it) {
        var pct = total ? Math.round(it[1] / total * 100) : 0;
        return '<div class="bar-row"><span class="bar-label" title="' + esc(it[0]) + '">' + esc(it[0]) + '</span>' +
          '<div class="bar-track"><i class="bar-fill" style="width:' + pct + '%;background:linear-gradient(90deg,var(--cyan),var(--violet))"></i></div>' +
          '<b>' + pct + '%</b></div>';
      }).join('');
    }
    function count(arr) {
      var m = {};
      arr.forEach(function (v) { m[v] = (m[v] || 0) + 1; });
      return Object.keys(m).map(function (k) { return [k, m[k]]; }).sort(function (a, b) { return b[1] - a[1]; });
    }
    function avg(k) { return data.reduce(function (s, r) { return s + r[k]; }, 0) / data.length; }

    function render() {
      if (!data.length) {
        box.innerHTML = '<div class="srv-empty"><b>Aún no hay respuestas.</b><br>Cuando alguien responda, aquí aparecerá el resumen con gráficos.</div>';
        return;
      }
      var n = data.length;
      var si = data.filter(function (r) { return r.liviana === 'Sí'; }).length;
      var allProbs = [];
      data.forEach(function (r) { r.problemas.forEach(function (p) { allProbs.push(p); }); });
      var comments = data.filter(function (r) { return r.comentario; }).slice(-3).reverse();

      box.innerHTML =
        '<div class="srv-head"><div class="sub">Resultados en vivo · ' + n + ' respuesta' + (n === 1 ? '' : 's') + '</div>' +
        '<div class="btns" style="gap:8px"><button class="btn ghost sm" id="srvCsv" type="button">⬇ CSV</button>' +
        '<button class="btn ghost sm" id="srvClear" type="button">🗑 Borrar</button></div></div>' +
        '<div class="tiles">' +
        '<div class="tile"><strong>' + avg('lentitud').toFixed(1) + '/5</strong><span>lentitud percibida</span></div>' +
        '<div class="tile"><strong>' + avg('afecta').toFixed(1) + '/5</strong><span>efecto en el aprendizaje</span></div>' +
        '<div class="tile"><strong>' + Math.round(si / n * 100) + '%</strong><span>usaría versión liviana</span></div></div>' +
        '<div class="srv-block"><h4>Problemas mencionados</h4><div class="bars">' + barRows(count(allProbs), n) + '</div></div>' +
        '<div class="srv-block"><h4>Quién respondió</h4><div class="bars">' + barRows(count(data.map(function (r) { return r.rol; })), n) + '</div></div>' +
        '<div class="srv-block"><h4>Frecuencia de uso de simulaciones</h4><div class="bars">' + barRows(count(data.map(function (r) { return r.uso; })), n) + '</div></div>' +
        (comments.length ? '<div class="srv-block"><h4>Últimos comentarios</h4>' + comments.map(function (r) {
          return '<p class="small" style="margin-bottom:8px">“' + esc(r.comentario) + '” <i>(' + esc(r.rol) + ')</i></p>';
        }).join('') + '</div>' : '') +
        '<p class="srv-note">Las respuestas se guardan solo en este navegador. Para juntar las de varios dispositivos usa el botón CSV.</p>';
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var fd = new FormData(form), p = fd.getAll('problemas');
      if (!p.length) { App.toast('Marca al menos un problema (o "Ninguno")'); return; }
      data.push({
        fecha: new Date().toISOString(),
        rol: fd.get('rol'), uso: fd.get('uso'),
        lentitud: +fd.get('lentitud'), problemas: p,
        afecta: +fd.get('afecta'), liviana: fd.get('liviana'),
        comentario: String(fd.get('comentario') || '').trim().slice(0, 300)
      });
      persist(); form.reset();
      $('#lentOut').textContent = '3'; $('#afectaOut').textContent = '3';
      render(); App.toast('¡Gracias por responder!');
    });

    box.addEventListener('click', function (e) {
      if (e.target.id === 'srvClear') {
        if (confirm('¿Borrar todas las respuestas de la encuesta?')) { data = []; persist(); render(); }
      }
      if (e.target.id === 'srvCsv') {
        var out = [['Fecha', 'Rol', 'Uso de simulaciones', 'Lentitud (1-5)', 'Problemas', 'Afecta aprendizaje (1-5)', 'Usaría versión liviana', 'Comentario']];
        data.forEach(function (r) {
          out.push([r.fecha.slice(0, 10), r.rol, r.uso, r.lentitud, r.problemas.join(', '), r.afecta, r.liviana, r.comentario]);
        });
        App.download('encuesta.csv', App.csv(out), 'text/csv;charset=utf-8');
      }
    });
    render();
  })();

  /* =====================================================
     5. QUIZ
     ===================================================== */
  (function quiz() {
    var qs = [
      { q: '¿Qué mide la capacidad de cálculo de un computador?',
        o: ['El tamaño de su pantalla', 'Cuántas operaciones puede resolver en un tiempo determinado', 'La cantidad de archivos que guarda', 'La velocidad del WiFi'], a: 1,
        e: 'Es la cantidad de operaciones que puede resolver por unidad de tiempo. De ella depende qué tan fluida es una simulación.' },
      { q: 'Una animación se ve fluida cuando alcanza aproximadamente…',
        o: ['5 FPS', '15 FPS', '60 FPS', '600 FPS'], a: 2,
        e: '60 cuadros por segundo se ven suaves. Con 30 FPS sigue siendo aceptable; bajo eso se nota que se traba.' },
      { q: '¿Qué componente guarda temporalmente los datos mientras la simulación calcula?',
        o: ['La memoria RAM', 'El parlante', 'El teclado', 'La batería'], a: 0,
        e: 'La RAM almacena los datos en uso. Si se llena, el equipo se vuelve lento o el navegador se cierra.' },
      { q: 'Si pasas de 200 a 400 partículas (cada una interactúa con todas), ¿cuánto crece el trabajo?',
        o: ['Se mantiene igual', 'Se duplica (×2)', 'Se cuadruplica (×4)', 'Se multiplica por 8'], a: 2,
        e: 'El trabajo crece con N × N. Al duplicar N, queda (2N)² = 4N². Por eso unas pocas partículas de más pueden trabar un equipo.' },
      { q: '¿Qué es el tiempo de carga de una simulación?',
        o: ['Lo que dura la clase', 'Lo que tarda en abrir y quedar lista para usarse', 'Lo que dura la batería del equipo', 'El tiempo que el estudiante mira la pantalla'], a: 1,
        e: 'Es el tiempo desde que abres la simulación hasta que puedes usarla. En equipos lentos o con mala conexión se alarga mucho.' },
      { q: '¿Qué acción ayuda MÁS a que una simulación funcione mejor en un equipo lento?',
        o: ['Abrir más pestañas', 'Cerrar pestañas y programas innecesarios', 'Subir el brillo', 'Cambiar el fondo de pantalla'], a: 1,
        e: 'Cerrar lo que no se usa libera procesador y memoria para la simulación.' },
      { q: 'El GHz de un procesador indica…',
        o: ['Cuántos gigabytes guarda', 'Su temperatura', 'Cuántos miles de millones de ciclos por segundo realiza', 'El tamaño del chip'], a: 2,
        e: '1 GHz equivale a mil millones de ciclos por segundo. A igual diseño, más GHz significa más velocidad.' },
      { q: '¿Qué ventaja tiene usar una versión liviana de una simulación?',
        o: ['Siempre se ve más bonita', 'Responde más rápido en equipos de poca capacidad y conserva lo esencial del fenómeno', 'Necesita más memoria RAM', 'Solo funciona con internet muy rápido'], a: 1,
        e: 'Una versión liviana reduce partículas y detalles gráficos, así que exige menos cálculo y corre mejor, sin perder las ideas importantes.' }
    ];
    var box = $('#quizBox'), qi = 0, score = 0, answered = false;

    function render() {
      answered = false;
      if (qi >= qs.length) {
        var pct = Math.round(score / qs.length * 100);
        var msg = pct >= 88 ? '¡Excelente! Dominas el tema.' : pct >= 62 ? 'Muy bien, ya casi lo tienes.' : 'Buen intento. Revisa las secciones y vuelve a probar.';
        box.innerHTML = '<div class="q-end"><div class="q-score grad">' + score + '/' + qs.length + '</div><h3 style="margin:8px 0">' + msg + '</h3>' +
          '<p class="small">Respondiste bien el ' + pct + '% de las preguntas.</p>' +
          '<button class="btn primary q-next" type="button" data-act="restart">↻ Intentar de nuevo</button></div>';
        return;
      }
      var q = qs[qi];
      box.innerHTML =
        '<div class="q-top"><span>Pregunta ' + (qi + 1) + ' de ' + qs.length + '</span><span>Aciertos: ' + score + '</span></div>' +
        '<div class="progress"><i style="width:' + (qi / qs.length * 100) + '%"></i></div>' +
        '<div class="q-q">' + esc(q.q) + '</div>' +
        '<div class="q-opts">' + q.o.map(function (t, i) {
          return '<button type="button" class="q-opt" data-i="' + i + '">' + esc(t) + '</button>';
        }).join('') + '</div><div id="qFeed"></div>';
    }

    box.addEventListener('click', function (e) {
      var opt = e.target.closest('.q-opt'), act = e.target.closest('[data-act]');
      if (opt && !answered) {
        answered = true;
        var q = qs[qi], pick = +opt.dataset.i, ok = pick === q.a;
        if (ok) score++;
        App.vibrate(ok ? 15 : [20, 40, 20]);
        App.$$('.q-opt', box).forEach(function (b, i) {
          b.disabled = true;
          if (i === q.a) b.classList.add('ok');
          else if (i === pick) b.classList.add('bad');
        });
        $('#qFeed').innerHTML = '<div class="q-exp"><b>' + (ok ? '¡Correcto! ' : 'No exactamente. ') + '</b>' + esc(q.e) + '</div>' +
          '<button class="btn primary q-next" type="button" data-act="next">' + (qi === qs.length - 1 ? 'Ver resultado' : 'Siguiente →') + '</button>';
      } else if (act) {
        if (act.dataset.act === 'next') qi++;
        if (act.dataset.act === 'restart') { qi = 0; score = 0; }
        render();
      }
    });
    render();
  })();

  /* =====================================================
     6. GLOSARIO
     ===================================================== */
  (function glossary() {
    var terms = [
      ['Algoritmo', 'Conjunto ordenado de pasos que resuelve un problema. La simulación usa uno para calcular cada cuadro.'],
      ['Ancho de banda', 'Cantidad de datos que una conexión puede transportar por segundo.'],
      ['Benchmark', 'Prueba estándar que mide el rendimiento de un equipo. Nuestro test automático es uno sencillo.'],
      ['Caché', 'Memoria muy rápida que guarda datos usados con frecuencia para no buscarlos de nuevo.'],
      ['Complejidad', 'Forma en que crece el trabajo de un algoritmo cuando aumenta la cantidad de datos (N, N log N, N²).'],
      ['CPU', 'Procesador central. Ejecuta las instrucciones y hace los cálculos del computador.'],
      ['Estabilidad', 'Qué tan constante es la velocidad. Si los FPS suben y bajan mucho, la simulación se siente a tirones.'],
      ['FLOPS', 'Operaciones con decimales por segundo. Mide la capacidad de cálculo de un procesador.'],
      ['FPS', 'Cuadros por segundo. Indica cuántas imágenes se dibujan en un segundo.'],
      ['GHz', 'Gigahertz: mil millones de ciclos por segundo del procesador.'],
      ['GPU', 'Procesador gráfico. Se encarga de dibujar las imágenes y acelerar gráficos 2D y 3D.'],
      ['Latencia', 'Tiempo de espera entre una acción y su respuesta. Una latencia alta se siente como lentitud.'],
      ['Núcleo', 'Unidad de cálculo dentro del procesador. Más núcleos permiten hacer varias tareas a la vez.'],
      ['RAM', 'Memoria de trabajo del equipo. Guarda temporalmente los datos de los programas abiertos.'],
      ['Simulación', 'Modelo en computador que imita un fenómeno real para estudiarlo, como el movimiento de planetas o moléculas.'],
      ['Tiempo de carga', 'Lo que tarda una simulación en abrir y quedar lista para usarse.']
    ];
    var list = $('#glosList'), inp = $('#glosSearch');
    function draw() {
      var q = inp.value.trim().toLowerCase();
      var out = terms.filter(function (t) { return !q || t[0].toLowerCase().indexOf(q) > -1 || t[1].toLowerCase().indexOf(q) > -1; });
      list.innerHTML = out.length
        ? out.map(function (t) { return '<div><dt>' + esc(t[0]) + '</dt><dd>' + esc(t[1]) + '</dd></div>'; }).join('')
        : '<div><dd>No encontramos ese término. Prueba con otra palabra.</dd></div>';
    }
    inp.addEventListener('input', draw);
    draw();
  })();

})(window.App);

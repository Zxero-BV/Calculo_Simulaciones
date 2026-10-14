/* utils.js — funciones comunes, tema, navegación (barra inferior en móvil), animaciones */
window.App = window.App || {};

(function (App) {
  'use strict';

  /* ---------- Ayudantes ---------- */
  App.$ = function (s, r) { return (r || document).querySelector(s); };
  App.$$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  App.esc = function (s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };

  App.store = {
    get: function (k, d) {
      try { var v = localStorage.getItem('sim_' + k); return v === null ? d : JSON.parse(v); }
      catch (e) { return d; }
    },
    set: function (k, v) {
      try { localStorage.setItem('sim_' + k, JSON.stringify(v)); } catch (e) { /* sin almacenamiento */ }
    }
  };

  App.emit = function (name, detail) {
    document.dispatchEvent(new CustomEvent(name, { detail: detail }));
  };

  App.toast = function (msg) {
    var t = App.$('#toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(App._toastTimer);
    App._toastTimer = setTimeout(function () { t.classList.remove('show'); }, 2400);
  };

  App.download = function (name, text, mime) {
    var blob = new Blob([text], { type: mime || 'text/plain;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  };

  // CSV con separador ";" y BOM para que Excel en español lo abra bien
  App.csv = function (rows) {
    return '﻿' + rows.map(function (r) {
      return r.map(function (c) {
        c = String(c == null ? '' : c);
        return /[";\n\r]/.test(c) ? '"' + c.replace(/"/g, '""') + '"' : c;
      }).join(';');
    }).join('\r\n');
  };

  App.copy = function (text) {
    var p = (navigator.clipboard && navigator.clipboard.writeText)
      ? navigator.clipboard.writeText(text)
      : Promise.reject();
    return p.catch(function () {
      var ta = document.createElement('textarea');
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); } catch (e) { /* nada */ }
      ta.remove();
    });
  };

  App.vibrate = function (p) {
    try { if (navigator.vibrate) navigator.vibrate(p); } catch (e) { /* no disponible */ }
  };

  App.fmt = function (n, dec) {
    return Number(n).toLocaleString('es-CL', { maximumFractionDigits: dec == null ? 0 : dec });
  };

  /* ---------- Tema claro / oscuro ---------- */
  var root = document.documentElement;
  function applyTheme(t) {
    root.setAttribute('data-theme', t);
    var b = App.$('#themeBtn');
    if (b) {
      b.textContent = t === 'dark' ? '☀️' : '🌙';
      b.setAttribute('aria-label', t === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro');
    }
    var m = document.querySelector('meta[name="theme-color"]');
    if (m) m.setAttribute('content', t === 'dark' ? '#0b1020' : '#f4f6fc');
  }
  applyTheme(root.getAttribute('data-theme') || 'dark');
  App.$$('[data-theme-toggle]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      App.store.set('theme', next);
      App.emit('theme:change', next);
    });
  });

  /* ---------- Navegación: enlace activo, barra inferior y panel "Más" ---------- */
  var TAB = {
    inicio: 'inicio', concepto: 'aprender', historia: 'aprender', crecimiento: 'aprender', problema: 'aprender',
    laboratorio: 'lab', calculadora: 'calc'
  };
  var deskLinks = {};
  App.$$('#menu a').forEach(function (a) { deskLinks[a.getAttribute('href').slice(1)] = a; });
  var tabs = App.$$('#tabbar [data-tab]');

  function setActive(id) {
    Object.keys(deskLinks).forEach(function (k) { deskLinks[k].classList.toggle('active', k === id); });
    var t = TAB[id] || 'mas';
    tabs.forEach(function (el) {
      var on = el.dataset.tab === t;
      el.classList.toggle('active', on);
      if (on) el.setAttribute('aria-current', 'true'); else el.removeAttribute('aria-current');
    });
  }
  var spy = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) { if (e.isIntersecting) setActive(e.target.id); });
  }, { rootMargin: '-45% 0px -50% 0px' });
  App.$$('header[id], section[id]').forEach(function (el) { spy.observe(el); });
  setActive('inicio');

  var sheet = App.$('#sheet'), more = App.$('#moreBtn'), panel = App.$('.sheet-panel', sheet), closeTimer;

  function openSheet() {
    clearTimeout(closeTimer);
    sheet.hidden = false;
    panel.style.transform = '';
    requestAnimationFrame(function () { requestAnimationFrame(function () { sheet.classList.add('open'); }); });
    more.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
    panel.focus({ preventScroll: true });
  }
  function closeSheet(refocus) {
    if (sheet.hidden) return;
    sheet.classList.remove('open');
    panel.style.transform = '';
    more.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
    closeTimer = setTimeout(function () { sheet.hidden = true; }, 300);
    if (refocus) more.focus({ preventScroll: true });
  }
  more.addEventListener('click', function () {
    if (sheet.classList.contains('open')) closeSheet(true); else openSheet();
  });
  sheet.addEventListener('click', function (e) {
    if (e.target.closest('[data-close]') || e.target.closest('.sheet-grid a')) closeSheet(false);
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeSheet(true); });
  window.addEventListener('resize', function () { if (window.innerWidth > 980) closeSheet(false); });

  // Arrastrar hacia abajo para cerrar el panel
  var startY = null, dragY = 0;
  panel.addEventListener('touchstart', function (e) {
    if (panel.scrollTop > 0) return;
    startY = e.touches[0].clientY; dragY = 0; panel.style.transition = 'none';
  }, { passive: true });
  panel.addEventListener('touchmove', function (e) {
    if (startY === null) return;
    dragY = Math.max(0, e.touches[0].clientY - startY);
    panel.style.transform = 'translateY(' + dragY + 'px)';
  }, { passive: true });
  panel.addEventListener('touchend', function () {
    if (startY === null) return;
    panel.style.transition = ''; startY = null;
    if (dragY > 90) closeSheet(false); else panel.style.transform = '';
  });

  /* ---------- Barra de progreso y botón de subir ---------- */
  var prog = App.$('#progress'), toTop = App.$('#toTop'), ticking = false;
  function onScroll() {
    var h = document.documentElement.scrollHeight - window.innerHeight;
    prog.style.width = (h > 0 ? (window.scrollY / h) * 100 : 0) + '%';
    toTop.classList.toggle('show', window.scrollY > 700);
    ticking = false;
  }
  window.addEventListener('scroll', function () {
    if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
  }, { passive: true });
  toTop.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: 'smooth' }); });
  onScroll();

  /* ---------- Aparición al hacer scroll ---------- */
  var revealObs = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) { e.target.classList.add('in'); revealObs.unobserve(e.target); }
    });
  }, { threshold: 0.12 });
  App.$$('.reveal').forEach(function (el) { revealObs.observe(el); });

  /* ---------- Contadores del hero ---------- */
  App.$$('[data-count]').forEach(function (el) {
    var target = +el.dataset.count, mode = el.dataset.fmt, start = null;
    function tick(t) {
      if (!start) start = t;
      var p = Math.min((t - start) / 1400, 1), eased = 1 - Math.pow(1 - p, 3), v = target * eased;
      el.textContent = mode === 'M' ? App.fmt(v / 1e6) + ' M' : App.fmt(v);
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  });

  /* ---------- Fondo animado del hero ---------- */
  var hc = App.$('#heroCanvas'), hx = hc.getContext('2d'), hp = [], hw = 0, hh = 0;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var heroVisible = true;

  function hsize() {
    var r = hc.getBoundingClientRect(), d = Math.min(window.devicePixelRatio || 1, 2);
    hw = r.width; hh = r.height;
    hc.width = hw * d; hc.height = hh * d;
    hx.setTransform(d, 0, 0, d, 0, 0);
    var n = Math.round(Math.min(70, hw / 16));
    hp = [];
    for (var i = 0; i < n; i++) {
      hp.push({ x: Math.random() * hw, y: Math.random() * hh, vx: (Math.random() - 0.5) * 0.35, vy: (Math.random() - 0.5) * 0.35 });
    }
  }
  function hdraw() {
    hx.clearRect(0, 0, hw, hh);
    for (var i = 0; i < hp.length; i++) {
      var a = hp[i];
      if (!reduce) {
        a.x += a.vx; a.y += a.vy;
        if (a.x < 0 || a.x > hw) a.vx *= -1;
        if (a.y < 0 || a.y > hh) a.vy *= -1;
      }
      hx.beginPath(); hx.arc(a.x, a.y, 2, 0, 6.283); hx.fillStyle = 'rgba(34,211,238,.8)'; hx.fill();
      for (var j = i + 1; j < hp.length; j++) {
        var b = hp[j], dx = a.x - b.x, dy = a.y - b.y, d2 = dx * dx + dy * dy;
        if (d2 < 14000) {
          hx.strokeStyle = 'rgba(167,139,250,' + (0.35 * (1 - d2 / 14000)) + ')';
          hx.lineWidth = 1; hx.beginPath(); hx.moveTo(a.x, a.y); hx.lineTo(b.x, b.y); hx.stroke();
        }
      }
    }
    if (!reduce && heroVisible) requestAnimationFrame(hdraw);
  }
  hsize(); hdraw();
  window.addEventListener('resize', function () { hsize(); if (reduce || !heroVisible) hdraw(); });
  new IntersectionObserver(function (en) {
    var was = heroVisible;
    heroVisible = en[0].isIntersecting;
    if (heroVisible && !was && !reduce) requestAnimationFrame(hdraw);
  }).observe(hc);

  /* ---------- Compartir ---------- */
  App.$$('[data-share]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var data = { title: document.title, url: location.href };
      if (navigator.share) {
        navigator.share(data).catch(function () { /* cancelado */ });
      } else {
        App.copy(location.href).then(function () { App.toast('Enlace copiado'); });
      }
    });
  });
})(window.App);

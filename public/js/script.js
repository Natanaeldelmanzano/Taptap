(function () {
  'use strict';
  var d = document, b = d.body;

  /* Menú móvil y submenús */
  var burger = d.querySelector('.burger'), nav = d.getElementById('nav');
  function cerrarSubs(except) {
    d.querySelectorAll('.tiene-sub > button[aria-expanded="true"]').forEach(function (btn) {
      if (btn === except) return;
      btn.setAttribute('aria-expanded', 'false');
      d.getElementById(btn.getAttribute('aria-controls')).hidden = true;
    });
  }
  if (burger && nav) {
    burger.addEventListener('click', function () {
      var abierto = nav.classList.toggle('abierto');
      burger.setAttribute('aria-expanded', abierto);
      burger.setAttribute('aria-label', abierto ? 'Cerrar menú' : 'Abrir menú');
    });
    nav.querySelectorAll('.tiene-sub > button').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var sub = d.getElementById(btn.getAttribute('aria-controls'));
        var abrir = sub.hidden;
        cerrarSubs(btn);
        sub.hidden = !abrir;
        btn.setAttribute('aria-expanded', abrir);
      });
    });
    d.addEventListener('click', function (e) { if (!nav.contains(e.target) && !burger.contains(e.target)) cerrarSubs(); });
    d.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { cerrarSubs(); nav.classList.remove('abierto'); burger.setAttribute('aria-expanded', 'false'); }
    });
  }

  /* Vídeo del hero: solo póster con reduced-motion o ahorro de datos */
  var video = d.querySelector('.hero__video');
  if (video) {
    var reducir = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var ahorro = navigator.connection && navigator.connection.saveData;
    if (reducir || ahorro) { video.removeAttribute('autoplay'); video.pause(); video.style.display = 'none'; }
    else { var p = video.play(); if (p && p.catch) p.catch(function () { video.style.display = 'none'; }); }
  }

  /* Formulario Web3Forms */
  var form = d.getElementById('form-contacto');
  if (form) {
    var msg = form.querySelector('.form__msg');
    form.elements.url_pagina.value = location.href;
    form.elements.titulo_pagina.value = d.title;
    var sel = form.elements.tipo_consulta, def = b.getAttribute('data-consulta');
    if (sel && def) { for (var i = 0; i < sel.options.length; i++) if (sel.options[i].value === def) sel.selectedIndex = i; }
    function aviso(texto, clase) { msg.textContent = texto; msg.className = 'form__msg form__ancho ' + clase; }
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (form.elements.botcheck.checked) return; /* honeypot */
      if (!form.checkValidity()) { form.reportValidity(); return; }
      var boton = form.querySelector('button[type=submit]'), texto = boton.textContent;
      boton.disabled = true; boton.textContent = 'Enviando…';
      var datos = {};
      new FormData(form).forEach(function (v, k) { datos[k] = v; });
      delete datos.botcheck;
      datos.subject = datos.subject + ' · ' + d.title;
      fetch(form.action, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(datos) })
        .then(function (r) { return r.json(); })
        .then(function (j) {
          if (j.success) { form.reset(); if (sel && def) { for (var i = 0; i < sel.options.length; i++) if (sel.options[i].value === def) sel.selectedIndex = i; } aviso(msg.getAttribute('data-ok'), 'ok'); }
          else aviso(msg.getAttribute('data-error'), 'err');
        })
        .catch(function () { aviso(msg.getAttribute('data-error'), 'err'); })
        .then(function () { boton.disabled = false; boton.textContent = texto; });
    });
  }

  /* Botón flotante de WhatsApp: mensaje con la página y oculto sobre el formulario */
  var wa = d.querySelector('.wa');
  if (wa) {
    var base = b.getAttribute('data-wa-mensaje') || '', pagina = b.getAttribute('data-titulo');
    var texto = pagina ? base + ' (Página: ' + pagina + ')' : base;
    wa.href = 'https://wa.me/' + b.getAttribute('data-wa-numero') + '?text=' + encodeURIComponent(texto);
    var contacto = d.getElementById('contacto');
    if (contacto && 'IntersectionObserver' in window) {
      new IntersectionObserver(function (en) { wa.classList.toggle('wa--oculto', en[0].isIntersecting); }, { threshold: 0.15 }).observe(contacto);
    }
  }
})();

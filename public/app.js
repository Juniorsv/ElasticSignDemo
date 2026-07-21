/**
 * Frontend - Gases del Oriente · Elastic Signing Demo
 *
 * Flujo:
 *  1) El usuario llena el formulario y da "Continuar".
 *  2) POST /api/onboarding/start -> backend devuelve config + documentData.
 *  3) Cargamos el SDK oficial de Docusign Click y renderizamos el agreement 1 en el modal.
 *  4) onAgreed del 1 -> renderizamos el agreement 2 (cascada).
 *  5) onAgreed del 2 -> pantalla de confirmación (y verificación opcional por backend).
 *
 * Esta versión muestra los errores EN PANTALLA (dentro del modal) y deja rastros
 * en la consola con el prefijo [demo], para diagnosticar fácilmente.
 */

let sdkLoaded = false;
let session = null; // { clientUserId, environment, accountId, documentData, agreements[] }

function log(...a) { console.log('[demo]', ...a); }

/** Muestra un mensaje de error visible dentro del modal. */
function showModalError(msg) {
  const container = document.getElementById('clickwrap-container');
  container.innerHTML =
    '<div class="loading" style="color:#c0392b;text-align:left;white-space:pre-wrap;">' +
    'No se pudo cargar el acuerdo.\n\n' + escapeHtml(msg) + '</div>';
}

/**
 * Carga el SDK de Docusign Click y ESPERA a que el objeto global esté disponible.
 * El SDK a veces adjunta window.docuSignClick un instante después del onload,
 * por eso hacemos polling hasta ~8s.
 */
function loadClickSdk(environment) {
  return new Promise((resolve, reject) => {
    if (window.docuSignClick) { sdkLoaded = true; return resolve(); }

    const finishWhenReady = () => {
      const started = Date.now();
      (function poll() {
        if (window.docuSignClick) { sdkLoaded = true; log('SDK listo'); return resolve(); }
        if (Date.now() - started > 8000) {
          return reject(new Error(
            'El SDK de Docusign Click se descargó pero no expuso "docuSignClick". ' +
            'Revisa la consola/red por si el navegador lo bloqueó.'));
        }
        setTimeout(poll, 100);
      })();
    };

    // Si ya existe el <script> (reintento), no lo dupliquemos.
    const existing = document.querySelector('script[data-ds-click]');
    if (existing) { finishWhenReady(); return; }

    const script = document.createElement('script');
    script.src = `${environment}/clickapi/sdk/latest/docusign-click.js`;
    script.setAttribute('data-ds-click', '1');
    script.onload = () => { log('script SDK onload'); finishWhenReady(); };
    script.onerror = () => reject(new Error('No se pudo descargar el SDK (' + script.src + ').'));
    document.head.appendChild(script);
  });
}

/** Renderiza un agreement por índice; encadena al siguiente al aceptar. */
function renderAgreement(index) {
  const container = document.getElementById('clickwrap-container');
  const total = session.agreements.length;
  const ag = session.agreements[index];

  // Actualizamos el encabezado ANTES de cualquier cosa que pueda fallar.
  document.getElementById('modal-title').textContent = ag ? ag.displayName : 'Acuerdo';
  document.getElementById('modal-progress').textContent = `Paso ${index + 1} de ${total}`;
  setPill(index + 1, 'active');
  container.innerHTML = '<div class="loading">Cargando acuerdo…</div>';

  if (!ag) { showModalError('No llegó la configuración del acuerdo #' + (index + 1) + '.'); return; }
  if (!window.docuSignClick || !window.docuSignClick.Clickwrap) {
    showModalError('El objeto docuSignClick no está disponible en el navegador.');
    return;
  }

  log('render', index, { clickwrapId: ag.clickwrapId, clientUserId: session.clientUserId });

  // Cada acuerdo se pinta en su PROPIO contenedor nuevo. Así, al pasar al
  // siguiente, no destruimos el árbol del SDK "por debajo" (eso causaba el
  // error removeChild de React al encadenar).
  container.innerHTML = '';
  const slotId = 'ds-slot-' + index;
  const slot = document.createElement('div');
  slot.id = slotId;
  container.appendChild(slot);

  // Evita re-encadenar dos veces si el SDK dispara el callback más de una vez.
  let advanced = false;
  const advance = () => {
    if (advanced) return;
    advanced = true;
    setPill(index + 1, 'done');
    // Diferimos el cambio para que el SDK termine su ciclo de render actual.
    setTimeout(() => {
      if (index + 1 < total) renderAgreement(index + 1);
      else finish();
    }, 60);
  };

  const config = {
    environment: session.environment,
    accountId: session.accountId,
    clickwrapId: ag.clickwrapId,
    clientUserId: session.clientUserId,
    documentData: session.documentData,
    onAgreed: () => { log('onAgreed', index); advance(); },
    onDeclined: () => {
      log('onDeclined', index);
      closeModal();
      showFormError('Rechazaste "' + ag.displayName + '". Puedes intentarlo de nuevo.');
      backToForm();
    },
    onError: (err) => {
      console.error('[demo] Docusign Click error:', err);
      showModalError('El SDK reportó un error. Verifica que el clickwrap esté ACTIVE y que ' +
        'el accountId/clickwrapId sean correctos.\n\n' + (err && err.message ? err.message : ''));
    },
  };

  try {
    window.docuSignClick.Clickwrap.render(config, '#' + slotId);
  } catch (e) {
    console.error('[demo] excepción en render:', e);
    showModalError(e && e.message ? e.message : String(e));
  }
}

function setPill(step, state) {
  const pill = document.getElementById('pill-' + step);
  if (!pill) return;
  pill.classList.remove('active', 'done');
  if (state) pill.classList.add(state);
}

function openModal() { document.getElementById('modal-overlay').hidden = false; }
function closeModal() { document.getElementById('modal-overlay').hidden = true; }

function backToForm() {
  document.getElementById('step-progress').hidden = true;
  document.getElementById('step-form').hidden = false;
  const btn = document.getElementById('btn-continuar');
  btn.disabled = false;
  btn.textContent = 'Continuar';
}

async function finish() {
  closeModal();
  setPill(3, 'done');

  const d = session.documentData;
  document.getElementById('done-msg').textContent =
    'La Promesa de Mutuo y el Pagaré en blanco fueron aceptados y registrados electrónicamente.';
  let summary =
    `<div><b>Deudor:</b> ${escapeHtml(d.nombre_deudor)}</div>` +
    `<div><b>Documento:</b> ${escapeHtml(d.tipo_documento_deudor)} ${escapeHtml(d.numero_documento_deudor)}</div>` +
    `<div><b>Dirección:</b> ${escapeHtml(d.direccion)}</div>` +
    `<div><b>Teléfono:</b> ${escapeHtml(d.telefono)}</div>` +
    `<div><b>Cupo aprobado:</b> COP$ ${escapeHtml(d.monto_cupo)}</div>`;
  if (d.nombre_codeudor) {
    summary += `<div><b>Codeudor:</b> ${escapeHtml(d.nombre_codeudor)} (${escapeHtml(d.tipo_documento_codeudor)} ${escapeHtml(d.numero_documento_codeudor)})</div>`;
  }
  summary +=
    `<div><b>Fecha:</b> ${escapeHtml(d.fecha)}</div>` +
    `<div><b>Acuerdos:</b> Promesa de Contrato de Mutuo · Pagaré en Blanco con Carta de Instrucciones</div>`;
  document.getElementById('done-summary').innerHTML = summary;

  document.getElementById('step-progress').hidden = true;
  document.getElementById('step-done').hidden = false;
  celebrate();

  try {
    const r = await fetch('/api/onboarding/status?clientUserId=' + encodeURIComponent(session.clientUserId));
    const s = await r.json();
    if (s && s.allAgreed) {
      const el = document.createElement('div');
      el.innerHTML = '<b>Verificado en Docusign ✓</b>';
      el.style.color = 'var(--ok)';
      el.style.marginTop = '6px';
      document.getElementById('done-summary').appendChild(el);
    }
  } catch (_) { /* silencioso */ }
}

/**
 * Reinicia el demo para dar de alta una nueva solicitud, SIN recargar la página.
 * (Antes se usaba location.reload(), que volvía a descargar el SDK y parpadeaba.)
 */
function nuevaSolicitud() {
  // Limpia el estado en memoria.
  session = null;

  // Reinicia el formulario y oculta los campos del codeudor.
  document.getElementById('onboarding-form').reset();
  document.getElementById('codeudor-fields').hidden = true;

  // Limpia el mensaje de error y el confeti que haya quedado.
  document.getElementById('form-error').hidden = true;
  document.querySelectorAll('.confetti-piece').forEach((p) => p.remove());

  // Reinicia los indicadores de paso.
  [1, 2, 3].forEach((n) => setPill(n, ''));

  // Restaura el botón "Continuar" (incluida su flecha, que se pierde al enviar).
  const btn = document.getElementById('btn-continuar');
  btn.disabled = false;
  btn.innerHTML =
    '<span>Continuar</span>' +
    '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">' +
    '<path d="M5 12h12m0 0-5-5m5 5-5 5" fill="none" stroke="currentColor" ' +
    'stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  // Muestra de nuevo el formulario y oculta las demás pantallas.
  document.getElementById('step-done').hidden = true;
  document.getElementById('step-progress').hidden = true;
  document.getElementById('step-form').hidden = false;

  // Sube la vista al inicio.
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function showFormError(msg) {
  const el = document.getElementById('form-error');
  el.textContent = msg;
  el.hidden = false;
}

/** Pequeño confeti CSS para la pantalla de confirmación (sin librerías). */
function celebrate() {
  const colors = ['#e8792b', '#12457a', '#1f9d55', '#1e5fa0', '#f4a468', '#7fb0e0'];
  const N = 90;
  for (let i = 0; i < N; i++) {
    const p = document.createElement('span');
    p.className = 'confetti-piece';
    p.style.left = Math.random() * 100 + 'vw';
    p.style.background = colors[i % colors.length];
    p.style.animationDuration = 2.6 + Math.random() * 2 + 's';
    p.style.animationDelay = Math.random() * 0.5 + 's';
    p.style.opacity = String(0.7 + Math.random() * 0.3);
    const w = 6 + Math.random() * 7;
    p.style.width = w + 'px';
    p.style.height = w * 1.5 + 'px';
    document.body.appendChild(p);
    setTimeout(() => p.remove(), 5200);
  }
}

function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

// Muestra/oculta los campos del codeudor según el checkbox.
document.getElementById('tieneCodeudor').addEventListener('change', (e) => {
  const box = document.getElementById('codeudor-fields');
  box.hidden = !e.target.checked;
  if (!e.target.checked) {
    document.getElementById('nombreCodeudor').value = '';
    document.getElementById('tipoDocumentoCodeudor').value = '';
    document.getElementById('numeroDocumentoCodeudor').value = '';
  }
});

document.getElementById('onboarding-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  document.getElementById('form-error').hidden = true;

  const tieneCodeudor = document.getElementById('tieneCodeudor').checked;

  const form = {
    nombre: document.getElementById('nombre').value.trim(),
    correo: document.getElementById('correo').value.trim(),
    tipoDocumento: document.getElementById('tipoDocumento').value,
    numeroDocumento: document.getElementById('numeroDocumento').value.trim(),
    direccion: document.getElementById('direccion').value.trim(),
    telefono: document.getElementById('telefono').value.trim(),
    montoCupo: document.getElementById('montoCupo').value.trim(),
    nombreCodeudor: tieneCodeudor ? document.getElementById('nombreCodeudor').value.trim() : '',
    tipoDocumentoCodeudor: tieneCodeudor ? document.getElementById('tipoDocumentoCodeudor').value : '',
    numeroDocumentoCodeudor: tieneCodeudor ? document.getElementById('numeroDocumentoCodeudor').value.trim() : '',
  };

  const requeridos = ['nombre', 'correo', 'tipoDocumento', 'numeroDocumento', 'direccion', 'telefono', 'montoCupo'];
  if (requeridos.some((k) => !form[k])) {
    return showFormError('Completa todos los campos obligatorios.');
  }
  if (tieneCodeudor && (!form.nombreCodeudor || !form.tipoDocumentoCodeudor || !form.numeroDocumentoCodeudor)) {
    return showFormError('Completa los datos del codeudor o desmarca la casilla.');
  }

  const btn = document.getElementById('btn-continuar');
  btn.disabled = true;
  btn.textContent = 'Preparando acuerdos…';

  try {
    log('POST /api/onboarding/start', form);
    const res = await fetch('/api/onboarding/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    log('respuesta start', data);
    if (!res.ok) throw new Error(data.error || 'Error iniciando el onboarding.');

    session = data;

    // Abrimos el modal YA (así ves progreso aunque el SDK tarde).
    document.getElementById('step-form').hidden = true;
    document.getElementById('step-progress').hidden = false;
    openModal();
    document.getElementById('clickwrap-container').innerHTML =
      '<div class="loading">Cargando el componente de firma…</div>';

    await loadClickSdk(session.environment);
    renderAgreement(0);
  } catch (err) {
    console.error('[demo] error en submit:', err);
    // Si el modal está abierto, mostramos el error ahí; si no, en el formulario.
    if (!document.getElementById('modal-overlay').hidden) showModalError(err.message);
    else { showFormError(err.message); backToForm(); }
  }
});

/**
 * Backend Express - Gases del Oriente · Elastic Signing Demo
 *
 * Rol del backend:
 *  - Guarda de forma segura las credenciales JWT y el DS_ACCOUNT_ID (no van al cliente).
 *  - POST /api/onboarding/start : recibe los datos del formulario, genera un
 *    clientUserId único y devuelve la CONFIG que el SDK de Docusign Click necesita
 *    para renderizar cada agreement con los datos dinámicos (documentData).
 *  - GET  /api/onboarding/status : verifica vía Click API (JWT) si el usuario ya
 *    aceptó ambos agreements.
 *
 * El render de los clickwraps ocurre en el navegador con el SDK oficial, por lo que
 * el access token NUNCA se expone al cliente.
 */
require('dotenv').config();
const path = require('path');
const crypto = require('crypto');
const express = require('express');

const { AGREEMENTS, buildDocumentData } = require('./config/agreements');
const { getUserAgreements } = require('./lib/click-api');

const app = express();
app.use(express.json());

// Archivos estáticos SIN caché (evita que el navegador sirva versiones viejas
// de index.html / styles.css / app.js durante el desarrollo de la demo).
app.use(
  express.static(path.join(__dirname, 'public'), {
    etag: false,
    lastModified: false,
    setHeaders: (res) => res.setHeader('Cache-Control', 'no-store, max-age=0'),
  })
);

const DS_ENV = process.env.DS_ENV || 'https://demo.docusign.net';
const DS_ACCOUNT_ID = process.env.DS_ACCOUNT_ID;

/** Resuelve el clickwrapId de cada agreement desde las variables de entorno. */
function resolveClickwrapId(agreement) {
  return process.env[agreement.envVar];
}

/**
 * POST /api/onboarding/start
 * body: { nombre, correo, direccion, tipoServicio }
 * resp: { clientUserId, environment, accountId, agreements: [{key, displayName, clickwrapId, ...}], documentData }
 */
app.post('/api/onboarding/start', (req, res) => {
  const { nombre, correo, direccion, tipoServicio } = req.body || {};

  if (!nombre || !correo || !direccion || !tipoServicio) {
    return res.status(400).json({
      error: 'Faltan campos. Se requieren: nombre, correo, direccion, tipoServicio.',
    });
  }

  if (!DS_ACCOUNT_ID) {
    return res.status(500).json({ error: 'El servidor no tiene configurado DS_ACCOUNT_ID.' });
  }

  // Un clientUserId estable por sesión de onboarding (identifica al firmante en Docusign).
  const clientUserId = `goe-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

  const documentData = buildDocumentData({ nombre, correo, direccion, tipoServicio });

  const agreements = [];
  for (const ag of AGREEMENTS) {
    const clickwrapId = resolveClickwrapId(ag);
    if (!clickwrapId) {
      return res.status(500).json({
        error: `Falta la variable ${ag.envVar}. Corre el script de creación y actualiza el .env.`,
      });
    }
    agreements.push({
      key: ag.key,
      displayName: ag.displayName,
      consentButtonText: ag.consentButtonText,
      clickwrapId,
    });
  }

  res.json({
    clientUserId,
    environment: DS_ENV,
    accountId: DS_ACCOUNT_ID,
    documentData,
    agreements,
  });
});

/**
 * GET /api/onboarding/status?clientUserId=...
 * Verifica en Docusign (JWT) que el usuario aceptó ambos agreements.
 */
app.get('/api/onboarding/status', async (req, res) => {
  const { clientUserId } = req.query;
  if (!clientUserId) return res.status(400).json({ error: 'Falta clientUserId.' });

  try {
    const result = {};
    for (const ag of AGREEMENTS) {
      const clickwrapId = resolveClickwrapId(ag);
      const data = await getUserAgreements(clickwrapId, clientUserId);
      const agreed = (data.userAgreements || []).some(
        (u) => (u.status || '').toLowerCase() === 'agreed'
      );
      result[ag.key] = { clickwrapId, agreed };
    }
    const allAgreed = Object.values(result).every((r) => r.agreed);
    res.json({ clientUserId, allAgreed, detail: result });
  } catch (err) {
    const detail = err.response && err.response.data ? err.response.data : err.message;
    res.status(500).json({ error: 'No se pudo verificar el estado.', detail });
  }
});

/** Healthcheck para Render. */
app.get('/api/health', (req, res) => res.json({ ok: true, env: DS_ENV }));

// Fallback al index para cualquier ruta no-API.
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Gases del Oriente · Elastic Signing demo escuchando en puerto ${PORT}`);
  console.log(`Entorno Docusign: ${DS_ENV}`);
});

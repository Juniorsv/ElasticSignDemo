/**
 * Autenticación JWT Grant para Docusign (Click API).
 *
 * Flujo:
 *  1. Firmamos un JWT con la clave privada RSA de la Integration Key.
 *  2. Lo intercambiamos por un access token en el endpoint OAuth de Docusign.
 *  3. Cacheamos el token hasta que esté por expirar.
 *
 * Requiere consentimiento previo del usuario para los scopes
 * `signature impersonation click.manage click.send` (ver README).
 */

const fs = require('fs');
const jwt = require('jsonwebtoken');
const axios = require('axios');

const TOKEN_EXPIRATION_SECONDS = 3600; // 1 hora (máximo permitido)
const SCOPES = 'signature impersonation click.manage click.send';

let cachedToken = null;
let cachedTokenExpiry = 0;

/**
 * Devuelve la clave privada RSA desde la variable de entorno o desde un archivo.
 * Soporta claves con saltos de línea reales o con \n escapados.
 */
function getPrivateKey() {
  const raw = process.env.DS_PRIVATE_KEY;
  if (raw && raw.trim()) {
    return raw.includes('\\n') ? raw.replace(/\\n/g, '\n') : raw;
  }
  const path = process.env.DS_PRIVATE_KEY_PATH;
  if (path && fs.existsSync(path)) {
    return fs.readFileSync(path, 'utf8');
  }
  throw new Error(
    'No se encontró la clave privada. Define DS_PRIVATE_KEY o DS_PRIVATE_KEY_PATH.'
  );
}

/** Devuelve solo el host del endpoint OAuth (sin protocolo) para el claim "aud". */
function getOAuthHost() {
  const base = process.env.DS_OAUTH_BASE || 'https://account-d.docusign.com';
  return base.replace(/^https?:\/\//, '');
}

/**
 * Obtiene un access token válido (usa cache si aún sirve).
 */
async function getAccessToken() {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && now < cachedTokenExpiry - 60) {
    return cachedToken;
  }

  const integrationKey = requireEnv('DS_INTEGRATION_KEY');
  const userId = requireEnv('DS_USER_ID');
  const oauthHost = getOAuthHost();
  const privateKey = getPrivateKey();

  const payload = {
    iss: integrationKey,
    sub: userId,
    aud: oauthHost,
    iat: now,
    exp: now + TOKEN_EXPIRATION_SECONDS,
    scope: SCOPES,
  };

  let assertion;
  try {
    assertion = jwt.sign(payload, privateKey, { algorithm: 'RS256' });
  } catch (err) {
    throw new Error('No se pudo firmar el JWT. ¿La clave privada RSA es válida? ' + err.message);
  }

  const tokenUrl = `${process.env.DS_OAUTH_BASE || 'https://account-d.docusign.com'}/oauth/token`;

  try {
    const res = await axios.post(
      tokenUrl,
      new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion,
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    cachedToken = res.data.access_token;
    cachedTokenExpiry = now + (res.data.expires_in || TOKEN_EXPIRATION_SECONDS);
    return cachedToken;
  } catch (err) {
    const data = err.response && err.response.data;
    if (data && data.error === 'consent_required') {
      throw new Error(
        'consent_required: falta dar consentimiento. Abre la URL de consentimiento del README ' +
          'con tu usuario administrador y autoriza los scopes.'
      );
    }
    throw new Error(
      'Fallo al obtener el access token: ' + JSON.stringify(data || err.message)
    );
  }
}

function requireEnv(name) {
  const v = process.env[name];
  if (!v || !v.trim()) {
    throw new Error(`Falta la variable de entorno ${name}.`);
  }
  return v.trim();
}

/**
 * Construye la URL de consentimiento (consent) para autorizar los scopes.
 * Se imprime desde el README / script de comprobación.
 */
function buildConsentUrl(redirectUri = 'https://developers.docusign.com/platform/auth/consent') {
  const base = process.env.DS_OAUTH_BASE || 'https://account-d.docusign.com';
  const clientId = process.env.DS_INTEGRATION_KEY || '<DS_INTEGRATION_KEY>';
  const scopes = encodeURIComponent(SCOPES);
  return (
    `${base}/oauth/auth?response_type=code&scope=${scopes}` +
    `&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}`
  );
}

module.exports = { getAccessToken, buildConsentUrl, getOAuthHost, SCOPES };

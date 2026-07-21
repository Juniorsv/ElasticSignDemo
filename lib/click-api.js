/**
 * Cliente delgado de la Click API de Docusign.
 * Base: {DS_ENV}/clickapi/v1/accounts/{accountId}
 */
const axios = require('axios');
const { getAccessToken } = require('./docusign-auth');

function clickBase() {
  const env = process.env.DS_ENV || 'https://demo.docusign.net';
  const accountId = process.env.DS_ACCOUNT_ID;
  if (!accountId) throw new Error('Falta DS_ACCOUNT_ID.');
  return `${env}/clickapi/v1/accounts/${accountId}`;
}

async function authHeaders() {
  const token = await getAccessToken();
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

/**
 * Construye el cuerpo (elastic template definition) para createClickwrap.
 * Propiedades de displaySettings según el ejemplo oficial de la Click API.
 * `dataFields` define los TIPOS de campos dinámicos personalizados
 * ({ label, type: STRING|NUMBER|DATE, name }). La POSICIÓN de cada campo
 * sobre el documento se coloca una vez en el editor de la consola de Docusign.
 */
function buildElasticTemplate({
  clickwrapName,
  displayName,
  consentButtonText,
  documentName,
  documentBase64,
  dataFields = [],
}) {
  const body = {
    clickwrapName,
    displaySettings: {
      displayName,
      consentButtonText,
      downloadable: true,
      format: 'modal',
      hasAccept: true,
      mustRead: true,
      requireAccept: true,
      documentDisplay: 'document',
    },
    documents: [
      {
        documentName,
        documentBase64,
        fileExtension: 'pdf',
        order: 0,
      },
    ],
    requireReacceptance: true,
  };
  if (dataFields.length) {
    body.dataFields = dataFields;
  }
  return body;
}

/**
 * Crea un clickwrap (elastic template) subiendo un PDF en base64 + dataFields.
 * Se crea en estado inactivo/draft; los campos dinámicos se colocan y activan en la consola.
 * Acepta o bien los campos sueltos o un `body` ya construido (elastic template JSON).
 */
async function createClickwrap(args) {
  const body = args.body ? args.body : buildElasticTemplate(args);
  const res = await axios.post(`${clickBase()}/clickwraps`, body, {
    headers: await authHeaders(),
  });
  return res.data; // incluye clickwrapId, versionId, etc.
}

/** Lista clickwraps existentes (para evitar duplicados / verificar). */
async function listClickwraps() {
  const res = await axios.get(`${clickBase()}/clickwraps`, { headers: await authHeaders() });
  return res.data;
}

/** Devuelve el detalle de un clickwrap (incluye estado: draft / active / inactive). */
async function getClickwrap(clickwrapId) {
  const res = await axios.get(`${clickBase()}/clickwraps/${clickwrapId}`, {
    headers: await authHeaders(),
  });
  return res.data;
}

/**
 * Consulta si un usuario (clientUserId) ya aceptó un clickwrap.
 * Se usa en el endpoint de verificación del backend.
 */
async function getUserAgreements(clickwrapId, clientUserId) {
  const url = `${clickBase()}/clickwraps/${clickwrapId}/users?client_user_id=${encodeURIComponent(
    clientUserId
  )}`;
  const res = await axios.get(url, { headers: await authHeaders() });
  return res.data;
}

/**
 * Descarga el PDF del acuerdo YA firmado (documento + registro de aceptación
 * de Docusign). El endpoint devuelve los bytes del PDF (application/pdf).
 * `agreementId` viene de cada userAgreement de getUserAgreements().
 * Requiere el scope click.manage (ya incluido en el token JWT).
 */
async function getAgreementPdf(clickwrapId, agreementId) {
  // include_coc=true anexa el Certificado de Finalización (Certificate of
  // Completion) al PDF. Por defecto la Click API lo omite (include_coc=false).
  const url = `${clickBase()}/clickwraps/${clickwrapId}/agreements/${agreementId}/download?include_coc=true`;
  const token = await getAccessToken();
  const res = await axios.get(url, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/pdf' },
    responseType: 'arraybuffer',
  });
  return Buffer.from(res.data);
}

module.exports = {
  buildElasticTemplate,
  createClickwrap,
  listClickwraps,
  getClickwrap,
  getUserAgreements,
  getAgreementPdf,
  clickBase,
};

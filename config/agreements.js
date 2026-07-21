/**
 * Configuración compartida de los dos Elastic Signing agreements del
 * cupo de crédito rotativo (Promesa de Contrato de Mutuo + Pagaré en blanco
 * con carta de instrucciones).
 *
 * IMPORTANTE sobre los campos dinámicos:
 * Los nombres de campo que aparecen en `dataFields` DEBEN coincidir EXACTAMENTE
 * con los nombres que le des a cada campo dinámico cuando lo marques en la
 * consola web de Docusign (paso del README). Si no coinciden, `documentData`
 * no rellenará nada.
 *
 * Placeholders usados en los PDFs base:
 *   {{nombre_deudor}}             {{tipo_documento_deudor}}
 *   {{numero_documento_deudor}}   {{direccion}}
 *   {{telefono}}                  {{monto_cupo}}
 *   {{nombre_codeudor}}           {{tipo_documento_codeudor}}
 *   {{numero_documento_codeudor}} {{fecha}}
 */

// Nombres de los campos dinámicos (deben coincidir con las claves de documentData
// y con los nombres de los campos al colocarlos en la consola de Docusign).
const DYNAMIC_FIELDS = [
  'nombre_deudor', 'tipo_documento_deudor', 'numero_documento_deudor',
  'direccion', 'telefono', 'monto_cupo',
  'nombre_codeudor', 'tipo_documento_codeudor', 'numero_documento_codeudor',
  'fecha',
];

// Definición de los campos dinámicos personalizados para el elastic template.
// Esquema de la Click API: { label, type: STRING|NUMBER|DATE, name }.
// Se dejan como STRING (incluida `monto_cupo`, ya formateada como moneda, y
// `fecha`, en formato local dd/mm/aaaa).
const DATA_FIELDS = [
  { name: 'nombre_deudor', label: 'Nombre completo o razón social', type: 'STRING' },
  { name: 'tipo_documento_deudor', label: 'Tipo de documento (deudor)', type: 'STRING' },
  { name: 'numero_documento_deudor', label: 'Número de documento (deudor)', type: 'STRING' },
  { name: 'direccion', label: 'Dirección del predio', type: 'STRING' },
  { name: 'telefono', label: 'Teléfono', type: 'STRING' },
  { name: 'monto_cupo', label: 'Monto del cupo de crédito', type: 'STRING' },
  { name: 'nombre_codeudor', label: 'Nombre completo o razón social (codeudor)', type: 'STRING' },
  { name: 'tipo_documento_codeudor', label: 'Tipo de documento (codeudor)', type: 'STRING' },
  { name: 'numero_documento_codeudor', label: 'Número de documento (codeudor)', type: 'STRING' },
  { name: 'fecha', label: 'Fecha', type: 'STRING' },
];

// Orden del flujo: primero la Promesa de Mutuo (el crédito en sí) y luego el
// Pagaré en blanco que lo garantiza — así lo indica la cláusula 5 de la
// propia Promesa de Mutuo del cliente.
const AGREEMENTS = [
  {
    key: 'promesa',
    envVar: 'CLICKWRAP_ID_PROMESA',
    clickwrapName: 'Promesa de Contrato de Mutuo',
    displayName: 'Promesa de Contrato de Mutuo',
    consentButtonText: 'Acepto la Promesa de Mutuo',
    pdfFile: 'Promesa_Mutuo.pdf',
    templateFile: 'promesa-mutuo.elastic-template.json',
    dataFields: DATA_FIELDS,
  },
  {
    key: 'pagare',
    envVar: 'CLICKWRAP_ID_PAGARE',
    clickwrapName: 'Pagaré en Blanco con Carta de Instrucciones',
    displayName: 'Pagaré en Blanco con Carta de Instrucciones',
    consentButtonText: 'Acepto y Suscribo el Pagaré',
    pdfFile: 'Pagare.pdf',
    templateFile: 'pagare.elastic-template.json',
    dataFields: DATA_FIELDS,
  },
];

/** Da formato de moneda colombiana simple a un número (o string numérico). */
function formatMoneyCOP(value) {
  const n = Number(String(value || '').replace(/[^\d]/g, ''));
  if (!n) return '';
  return n.toLocaleString('es-CO');
}

/**
 * Construye el objeto documentData para el SDK a partir de los datos del formulario.
 * Las claves deben ser los nombres de los campos dinámicos marcados en Docusign.
 */
function buildDocumentData(form) {
  return {
    nombre_deudor: form.nombre || '',
    tipo_documento_deudor: form.tipoDocumento || '',
    numero_documento_deudor: form.numeroDocumento || '',
    direccion: form.direccion || '',
    telefono: form.telefono || '',
    monto_cupo: formatMoneyCOP(form.montoCupo),
    nombre_codeudor: form.nombreCodeudor || '',
    tipo_documento_codeudor: form.tipoDocumentoCodeudor || '',
    numero_documento_codeudor: form.numeroDocumentoCodeudor || '',
    fecha: new Date().toLocaleDateString('es-CO'), // dd/mm/aaaa
  };
}

module.exports = { AGREEMENTS, DYNAMIC_FIELDS, DATA_FIELDS, buildDocumentData, formatMoneyCOP };

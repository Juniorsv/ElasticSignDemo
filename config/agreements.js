/**
 * Configuración compartida de los dos Elastic Signing agreements.
 *
 * IMPORTANTE sobre los campos dinámicos:
 * Los nombres de campo que aparecen en `dataFields` DEBEN coincidir EXACTAMENTE
 * con los nombres que le des a cada campo dinámico cuando lo marques en la
 * consola web de Docusign (paso del README). Si no coinciden, `documentData`
 * no rellenará nada.
 *
 * Placeholders usados en los PDFs base:
 *   {{nombre_cliente}}  {{direccion_predio}}  {{tipo_servicio}}  {{fecha}}
 */

// Nombres de los campos dinámicos (deben coincidir con las claves de documentData
// y con los nombres de los campos al colocarlos en la consola de Docusign).
const DYNAMIC_FIELDS = ['nombre_cliente', 'direccion_predio', 'tipo_servicio', 'fecha'];

// Definición de los campos dinámicos personalizados para el elastic template.
// Esquema de la Click API: { label, type: STRING|NUMBER|DATE, name }.
// `fecha` se deja como STRING para admitir el formato local dd/mm/aaaa.
const DATA_FIELDS = [
  { name: 'nombre_cliente', label: 'Nombre del cliente', type: 'STRING' },
  { name: 'direccion_predio', label: 'Dirección del predio', type: 'STRING' },
  { name: 'tipo_servicio', label: 'Tipo de servicio', type: 'STRING' },
  { name: 'fecha', label: 'Fecha', type: 'STRING' },
];

const AGREEMENTS = [
  {
    key: 'contrato',
    envVar: 'CLICKWRAP_ID_CONTRATO',
    clickwrapName: 'Contrato de Suministro de Gas',
    displayName: 'Contrato de Suministro de Gas',
    consentButtonText: 'Acepto el Contrato',
    pdfFile: 'Contrato_Suministro_Gas.pdf',
    templateFile: 'contrato-suministro-gas.elastic-template.json',
    dataFields: DATA_FIELDS,
  },
  {
    key: 'seguridad',
    envVar: 'CLICKWRAP_ID_SEGURIDAD',
    clickwrapName: 'Condiciones de Seguridad e Instalación',
    displayName: 'Condiciones de Seguridad e Instalación',
    consentButtonText: 'Acepto las Condiciones de Seguridad',
    pdfFile: 'Condiciones_Seguridad_Instalacion.pdf',
    templateFile: 'condiciones-seguridad-instalacion.elastic-template.json',
    dataFields: DATA_FIELDS,
  },
];

/**
 * Construye el objeto documentData para el SDK a partir de los datos del formulario.
 * Las claves deben ser los nombres de los campos dinámicos marcados en Docusign.
 */
function buildDocumentData(form) {
  return {
    nombre_cliente: form.nombre || '',
    direccion_predio: form.direccion || '',
    tipo_servicio: form.tipoServicio || '',
    fecha: new Date().toLocaleDateString('es-CO'), // dd/mm/aaaa
  };
}

module.exports = { AGREEMENTS, DYNAMIC_FIELDS, DATA_FIELDS, buildDocumentData };

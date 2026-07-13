#!/usr/bin/env node
/**
 * Script de UN SOLO USO.
 *
 * Crea en Docusign los dos Elastic Signing agreements (clickwraps) de la demo,
 * subiendo los PDFs base de la carpeta /docs.
 *
 *   node scripts/create-clickwraps.js
 *   (o: npm run create-agreements)
 *
 * Al terminar imprime los clickwrapId. Cópialos a tu .env:
 *   CLICKWRAP_ID_CONTRATO=...
 *   CLICKWRAP_ID_SEGURIDAD=...
 *
 * Luego, en la consola web de Docusign, para cada clickwrap:
 *   1) Marca los campos dinámicos sobre los placeholders {{...}} con los nombres:
 *      nombre_cliente, direccion_predio, tipo_servicio, fecha
 *   2) Actívalo.
 *
 * Los clickwraps se crean en estado DRAFT (inactivo). Esto es intencional:
 * los campos dinámicos deben marcarse manualmente antes de activar.
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { createClickwrap, listClickwraps } = require('../lib/click-api');
const { AGREEMENTS } = require('../config/agreements');

const DOCS_DIR = path.join(__dirname, '..', 'docs');
const TEMPLATES_DIR = path.join(__dirname, '..', 'elastic-templates');
const OUT_FILE = path.join(__dirname, '..', 'config', 'clickwraps.generated.json');

function pdfToBase64(fileName) {
  const full = path.join(DOCS_DIR, fileName);
  if (!fs.existsSync(full)) {
    throw new Error(
      `No se encontró el PDF ${fileName} en /docs. Genera los PDFs con: python3 scripts/generate-pdfs.py`
    );
  }
  return fs.readFileSync(full).toString('base64');
}

/**
 * Devuelve el cuerpo del elastic template a enviar.
 * Preferimos el archivo JSON generado (elastic-templates/) si existe; si no,
 * lo construimos al vuelo desde el PDF + la config compartida.
 */
function resolveTemplateBody(ag) {
  const templatePath = path.join(TEMPLATES_DIR, ag.templateFile || '');
  if (ag.templateFile && fs.existsSync(templatePath)) {
    return { body: JSON.parse(fs.readFileSync(templatePath, 'utf8')), source: 'archivo' };
  }
  return {
    body: null, // se construye dentro de createClickwrap con los campos sueltos
    source: 'PDF',
    inline: {
      clickwrapName: ag.clickwrapName,
      displayName: ag.displayName,
      consentButtonText: ag.consentButtonText,
      documentName: ag.clickwrapName,
      documentBase64: pdfToBase64(ag.pdfFile),
      dataFields: ag.dataFields,
    },
  };
}

async function main() {
  console.log('== Gases del Oriente · creación de Elastic Signing agreements ==\n');

  // Aviso de duplicados
  try {
    const existing = await listClickwraps();
    const names = (existing.clickwraps || []).map((c) => c.clickwrapName);
    for (const ag of AGREEMENTS) {
      if (names.includes(ag.clickwrapName)) {
        console.warn(
          `⚠  Ya existe un clickwrap llamado "${ag.clickwrapName}". Se creará otro (versión nueva).`
        );
      }
    }
  } catch (e) {
    console.warn('No se pudo listar clickwraps existentes (continuo):', e.message);
  }

  const results = {};
  for (const ag of AGREEMENTS) {
    const tpl = resolveTemplateBody(ag);
    process.stdout.write(`→ Creando "${ag.clickwrapName}" (desde ${tpl.source}) ... `);
    const created = tpl.body
      ? await createClickwrap({ body: tpl.body })
      : await createClickwrap(tpl.inline);
    const id = created.clickwrapId;
    results[ag.key] = { clickwrapId: id, envVar: ag.envVar, name: ag.clickwrapName };
    console.log('OK  clickwrapId =', id);
  }

  fs.writeFileSync(OUT_FILE, JSON.stringify(results, null, 2));

  console.log('\n================  COPIA ESTO A TU .env  ================');
  for (const ag of AGREEMENTS) {
    console.log(`${ag.envVar}=${results[ag.key].clickwrapId}`);
  }
  console.log('=======================================================\n');
  console.log('Guardado también en:', path.relative(process.cwd(), OUT_FILE));
  console.log('\nSiguiente paso: en la consola de Docusign marca los campos dinámicos');
  console.log('(nombre_cliente, direccion_predio, tipo_servicio, fecha) y ACTIVA cada clickwrap.');
}

main().catch((err) => {
  console.error('\n✖ Error:', err.message);
  if (err.response && err.response.data) {
    console.error('Detalle API:', JSON.stringify(err.response.data, null, 2));
  }
  process.exit(1);
});

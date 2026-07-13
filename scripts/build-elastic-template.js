#!/usr/bin/env node
/**
 * Genera los ARCHIVOS de elastic template (JSON) que se cargan en Docusign.
 *
 *   node scripts/build-elastic-template.js
 *   (o: npm run build-templates)
 *
 * Para cada agreement toma su PDF de /docs, lo codifica en base64 y arma la
 * "elastic template definition" completa (clickwrapName + displaySettings +
 * documents[base64] + dataFields). El resultado se guarda en:
 *
 *   elastic-templates/<nombre>.elastic-template.json
 *
 * Ese archivo es exactamente el cuerpo que se envía a la Click API
 * (ClickWraps:createClickwrap). Puedes:
 *   a) dejar que `npm run create-agreements` lo suba automáticamente, o
 *   b) enviarlo tú mismo (Postman/curl) al endpoint:
 *      POST {DS_ENV}/clickapi/v1/accounts/{accountId}/clickwraps
 *
 * Nota: el JSON define los TIPOS de campos dinámicos (dataFields). La posición
 * de cada campo sobre el documento se coloca una sola vez en el editor de la
 * consola de Docusign (los placeholders {{...}} del PDF te indican dónde).
 */

const fs = require('fs');
const path = require('path');
const { buildElasticTemplate } = require('../lib/click-api');
const { AGREEMENTS } = require('../config/agreements');

const DOCS_DIR = path.join(__dirname, '..', 'docs');
const OUT_DIR = path.join(__dirname, '..', 'elastic-templates');

function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  console.log('== Generando archivos de elastic template ==\n');

  for (const ag of AGREEMENTS) {
    const pdfPath = path.join(DOCS_DIR, ag.pdfFile);
    if (!fs.existsSync(pdfPath)) {
      throw new Error(
        `Falta el PDF ${ag.pdfFile}. Genera los PDFs con: python3 scripts/generate-pdfs.py`
      );
    }
    const documentBase64 = fs.readFileSync(pdfPath).toString('base64');

    const body = buildElasticTemplate({
      clickwrapName: ag.clickwrapName,
      displayName: ag.displayName,
      consentButtonText: ag.consentButtonText,
      documentName: ag.clickwrapName,
      documentBase64,
      dataFields: ag.dataFields,
    });

    const outPath = path.join(OUT_DIR, ag.templateFile);
    fs.writeFileSync(outPath, JSON.stringify(body, null, 2));

    const kb = (Buffer.byteLength(documentBase64, 'utf8') / 1024).toFixed(1);
    console.log(`✔ ${ag.templateFile}`);
    console.log(`   dataFields: ${ag.dataFields.map((f) => f.name).join(', ')}`);
    console.log(`   base64: ~${kb} KB\n`);
  }

  console.log('Listo. Archivos en:', path.relative(process.cwd(), OUT_DIR));
  console.log('Cárgalos con `npm run create-agreements` o enviándolos a createClickwrap.');
}

main();

#!/usr/bin/env node
/**
 * Comprueba que la autenticación JWT Grant funciona y que el consentimiento está dado.
 *
 *   node scripts/check-token.js
 *   (o: npm run check-consent)
 *
 * Si falta consentimiento, imprime la URL para autorizar los scopes.
 */
require('dotenv').config();
const { getAccessToken, buildConsentUrl } = require('../lib/docusign-auth');

(async () => {
  try {
    const token = await getAccessToken();
    console.log('✔ Access token obtenido correctamente.');
    console.log('  (primeros 24 chars):', token.slice(0, 24) + '...');
    console.log('\nAutenticación JWT OK. Ya puedes crear los clickwraps:');
    console.log('  npm run create-agreements');
  } catch (err) {
    console.error('✖', err.message);
    console.log('\nSi el error es consent_required, abre esta URL con tu usuario y autoriza:');
    console.log('\n  ' + buildConsentUrl() + '\n');
    process.exit(1);
  }
})();

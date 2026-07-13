# Gases del Oriente · Demo de Elastic Signing (Docusign Click API)

Demo funcional de onboarding de nuevo cliente con **dos Elastic Signing agreements
encadenados** (uno tras otro), rellenados con datos dinámicos desde un formulario
propio, sin pasar por un flujo de firma tradicional.

**Flujo de usuario**

1. El cliente llena un formulario (nombre, correo, dirección del predio, tipo de servicio).
2. Al dar **Continuar** se abre el primer agreement — *Contrato de Suministro de Gas* —
   con los datos prellenados como campos dinámicos y el botón **Acepto el Contrato**.
3. Inmediatamente después se abre, encadenado, el segundo agreement —
   *Condiciones de Seguridad e Instalación* — con los mismos datos y el botón
   **Acepto las Condiciones de Seguridad**.
4. Al aceptar ambos se muestra una pantalla de confirmación.

El render de los acuerdos ocurre en el navegador con el **SDK oficial de Docusign Click**,
por lo que el access token nunca se expone al cliente. El backend (JWT Grant) crea los
clickwraps, sirve la configuración con los datos dinámicos y verifica el estado.

---

## Arquitectura

```
navegador (public/)
   │  POST /api/onboarding/start  { nombre, correo, direccion, tipoServicio }
   ▼
backend Express (server.js)  ── JWT Grant ──►  Docusign Click API
   │  ◄── { clientUserId, accountId, clickwrapIds, documentData }
   ▼
SDK Docusign Click en el navegador
   render agreement 1  ──onAgreed──►  render agreement 2  ──onAgreed──►  confirmación
```

Archivos clave:

| Ruta | Qué hace |
|------|----------|
| `scripts/generate-pdfs.py` | Genera los 2 PDFs base con placeholders `{{...}}` |
| `scripts/build-elastic-template.js` | Genera los **archivos de elastic template** (`elastic-templates/*.json`) que se cargan en Docusign |
| `elastic-templates/*.elastic-template.json` | Definición completa del elastic template (base64 del PDF + `dataFields`) — este es el "archivo" que se sube |
| `scripts/create-clickwraps.js` | **Script de un solo uso**: carga los elastic templates y crea los 2 clickwraps |
| `scripts/check-token.js` | Verifica que el JWT y el consentimiento funcionan |
| `lib/docusign-auth.js` | Autenticación JWT Grant + URL de consentimiento |
| `lib/click-api.js` | Cliente de la Click API (crear/listar/verificar clickwraps) |
| `config/agreements.js` | Config compartida y nombres de campos dinámicos |
| `server.js` | Backend Express |
| `public/` | Frontend (formulario, modal en cascada, confirmación) |

---

## Requisitos

- Node.js ≥ 18
- Python 3 con `reportlab` (solo si quieres regenerar los PDFs)
- Cuenta **developer** de Docusign

---

## Paso a paso

### 1. Clonar e instalar

```bash
git clone <tu-repo>.git
cd ElasticSignDemo
npm install
```

### 2. Crear la Integration Key (app JWT) en Docusign

1. Entra a **Apps and Keys** en tu cuenta developer:
   `Settings → Integrations → Apps and Keys`
   (o https://admindemo.docusign.com/apps-and-keys).
2. **Add App and Integration Key**. Ponle nombre (ej. `gases-oriente-elastic`).
3. Copia el **Integration Key** (Client ID) → será `DS_INTEGRATION_KEY`.
4. En **Authentication**, marca **JWT** (Authorization Code no es necesario).
5. Anota tu **User ID (API Username)** desde *Apps and Keys* → será `DS_USER_ID`.
6. Anota el **API Account ID** (GUID) desde `Settings → Plan and Billing` o el menú
   de la cuenta → será `DS_ACCOUNT_ID`.

### 3. Generar el par de llaves RSA

En la misma app JWT:

1. Sección **Service Integration → Generate RSA**.
2. Docusign muestra la **clave pública** (la guarda) y la **clave privada** (solo una vez).
3. Copia la clave privada completa (incluyendo
   `-----BEGIN RSA PRIVATE KEY-----` … `-----END RSA PRIVATE KEY-----`).

Guárdala como archivo local para desarrollo:

```bash
# pega la clave privada aquí y guarda
nano private.key
```

`private.key` está en `.gitignore` — **nunca** lo subas al repo.

### 4. Configurar variables de entorno

```bash
cp .env.example .env
```

Edita `.env`:

```
DS_ENV=https://demo.docusign.net
DS_OAUTH_BASE=https://account-d.docusign.com
DS_INTEGRATION_KEY=<tu integration key>
DS_USER_ID=<tu user id>
DS_ACCOUNT_ID=<tu account id>
DS_PRIVATE_KEY_PATH=./private.key
# CLICKWRAP_ID_CONTRATO y CLICKWRAP_ID_SEGURIDAD se llenan en el paso 7
```

### 5. Dar consentimiento inicial (una sola vez)

El JWT Grant requiere que el usuario impersonado autorice los scopes
`signature impersonation click.manage click.send`.

Ejecuta:

```bash
npm run check-consent
```

- Si dice **✔ Access token obtenido**, el consentimiento ya está dado. Pasa al paso 7.
- Si falla con `consent_required`, el comando imprime una **URL de consentimiento**.
  Ábrela en el navegador, inicia sesión con tu usuario Docusign y pulsa **Aceptar / Allow**.
  Luego vuelve a correr `npm run check-consent`.

> La URL de consentimiento tiene esta forma:
> `https://account-d.docusign.com/oauth/auth?response_type=code&scope=signature%20impersonation%20click.manage%20click.send&client_id=<DS_INTEGRATION_KEY>&redirect_uri=https://developers.docusign.com/platform/auth/consent`
> El `redirect_uri` debe estar registrado en tu app (Docusign preconfigura ese de developers.docusign.com; si usas otro, agrégalo en *Additional settings → Redirect URIs*).

### 6. (Opcional) Regenerar los PDFs base

Los PDFs ya vienen en `docs/`. Para regenerarlos:

```bash
pip install reportlab
python3 scripts/generate-pdfs.py
```

Cada PDF contiene los placeholders visibles
`{{nombre_cliente}}`, `{{direccion_predio}}`, `{{tipo_servicio}}`, `{{fecha}}`.

### 7. Generar el archivo del elastic template

El **elastic template** es un JSON que define el clickwrap: nombre, `displaySettings`,
el documento en base64 y los `dataFields` (campos dinámicos). Es el "archivo" que se
carga en Docusign. Genéralo desde los PDFs:

```bash
npm run build-templates
```

Esto crea, en `elastic-templates/`:

```
contrato-suministro-gas.elastic-template.json
condiciones-seguridad-instalacion.elastic-template.json
```

Cada archivo tiene esta forma (el `documentBase64` va completo):

```jsonc
{
  "clickwrapName": "Contrato de Suministro de Gas",
  "displaySettings": {
    "displayName": "Contrato de Suministro de Gas",
    "consentButtonText": "Acepto el Contrato",
    "downloadable": true,
    "format": "modal",
    "hasAccept": true,
    "mustRead": true,
    "requireAccept": true,
    "documentDisplay": "document"
  },
  "documents": [
    { "documentName": "Contrato de Suministro de Gas",
      "documentBase64": "JVBERi0xLjQ...",  // PDF completo en base64
      "fileExtension": "pdf", "order": 0 }
  ],
  "requireReacceptance": true,
  "dataFields": [
    { "name": "nombre_cliente",   "label": "Nombre del cliente",   "type": "STRING" },
    { "name": "direccion_predio", "label": "Dirección del predio", "type": "STRING" },
    { "name": "tipo_servicio",    "label": "Tipo de servicio",     "type": "STRING" },
    { "name": "fecha",            "label": "Fecha",                "type": "STRING" }
  ]
}
```

Este JSON es **exactamente** el cuerpo que recibe `ClickWraps:createClickwrap`.
Puedes cargarlo de dos maneras:

- **Automática (recomendada):** el paso 8 (`npm run create-agreements`) lo sube por ti.
- **Manual:** envíalo tú mismo (Postman/curl) con tu access token:

  ```bash
  curl -X POST "$DS_ENV/clickapi/v1/accounts/$DS_ACCOUNT_ID/clickwraps" \
    -H "Authorization: Bearer <ACCESS_TOKEN>" \
    -H "Content-Type: application/json" \
    -d @elastic-templates/contrato-suministro-gas.elastic-template.json
  ```

> Los `dataFields` definen los **tipos** de campo dinámico. La **posición** de cada campo
> sobre el documento se coloca una sola vez en el editor de la consola (paso 9); los
> placeholders `{{...}}` del PDF te marcan dónde va cada uno.
>
> Si editas el JSON a mano (por ejemplo para cambiar textos), no toques `documentBase64`
> a menos que reemplaces el PDF completo. Para regenerarlo, vuelve a correr `npm run build-templates`.

### 8. Crear los dos Elastic Signing agreements (script de un solo uso)

```bash
npm run create-agreements
```

El script carga los elastic templates de `elastic-templates/` (o, si no existen, los
arma al vuelo desde los PDFs) y crea los dos clickwraps **en estado borrador (draft)**.
Al terminar imprime los IDs:

```
CLICKWRAP_ID_CONTRATO=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
CLICKWRAP_ID_SEGURIDAD=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

Cópialos a tu `.env` (también quedan en `config/clickwraps.generated.json`).

### 9. Colocar los campos dinámicos y ACTIVAR (consola web de Docusign)

Los `dataFields` ya existen en el elastic template (definidos en el JSON), pero su
**posición** sobre el documento se coloca en la consola. Para **cada** clickwrap:

1. Ve a **Docusign → Agreements / Clickwrap** (o
   https://apps-d.docusign.com/send/templates → *Clickwraps*).
2. Abre el clickwrap (ej. *Contrato de Suministro de Gas*).
3. Entra a editar el documento. Sobre cada placeholder `{{...}}` arrastra el campo
   dinámico correspondiente (ya aparece en la lista de *Data fields* con su nombre).
4. Confirma que cada campo se llama EXACTAMENTE así (debe coincidir con `documentData`):

   | Placeholder en el PDF | Nombre del campo dinámico |
   |-----------------------|---------------------------|
   | `{{nombre_cliente}}`  | `nombre_cliente` |
   | `{{direccion_predio}}`| `direccion_predio` |
   | `{{tipo_servicio}}`   | `tipo_servicio` |
   | `{{fecha}}`           | `fecha` |

5. Asegúrate de que cada campo sea **dinámico** (dynamic content).
6. Pulsa **Activate / Activar**. El clickwrap pasa a estado **active**.

Repite para el segundo clickwrap. Si cambias los nombres, actualiza
`config/agreements.js` (`DATA_FIELDS` y `buildDocumentData()`) para que las claves coincidan.

> Nota: los nombres de campo distinguen mayúsculas/minúsculas. Usa exactamente los de la tabla.

### 10. Correr en local

```bash
npm start
# abre http://localhost:3000
```

Llena el formulario, da **Continuar** y verás los dos acuerdos en cascada con tus datos.

---

## Deploy en Render

1. Sube el repo a GitHub (sin `.env` ni `private.key`; ya están en `.gitignore`).
2. En https://render.com → **New → Web Service** → conecta el repo.
   - Runtime: **Node**
   - Build command: `npm install`
   - Start command: `npm start`
   - (Si prefieres, Render detecta `render.yaml` automáticamente.)
3. En **Environment** agrega las variables:

   | Variable | Valor |
   |----------|-------|
   | `DS_ENV` | `https://demo.docusign.net` |
   | `DS_OAUTH_BASE` | `https://account-d.docusign.com` |
   | `DS_INTEGRATION_KEY` | tu integration key |
   | `DS_USER_ID` | tu user id |
   | `DS_ACCOUNT_ID` | tu account id |
   | `DS_PRIVATE_KEY` | pega la clave privada completa (multilínea) |
   | `CLICKWRAP_ID_CONTRATO` | id del paso 7 |
   | `CLICKWRAP_ID_SEGURIDAD` | id del paso 7 |

   > En Render usa `DS_PRIVATE_KEY` (no `DS_PRIVATE_KEY_PATH`). El campo soporta
   > multilínea; pega la clave tal cual. `lib/docusign-auth.js` también acepta
   > `\n` escapados si tu pipeline los inyecta así.

4. **Deploy**. Cuando termine, abre la URL pública de Render.

> El consentimiento (paso 5) y la creación de clickwraps (paso 7) se hacen **una sola vez**
> y no dependen de Render. Solo asegúrate de que las variables coincidan con esos IDs.

---

## Solución de problemas

| Síntoma | Causa / solución |
|---------|------------------|
| `consent_required` | Falta el consentimiento. Corre `npm run check-consent` y abre la URL. |
| El modal carga pero sale vacío o con error | El clickwrap no está **activo** o le faltan los campos dinámicos. Revisa el paso 8. |
| Los datos no se rellenan | Los nombres de los campos dinámicos no coinciden con `documentData`. Usa exactamente `nombre_cliente`, `direccion_predio`, `tipo_servicio`, `fecha`. |
| `Falta la variable CLICKWRAP_ID_...` | No copiaste los IDs del paso 7 al `.env` / Render. |
| Error 401 al crear clickwraps | Token inválido o cuenta/entorno equivocados. Verifica `DS_ACCOUNT_ID` y `DS_ENV`. |
| Producción | Cambia `DS_ENV=https://www.docusign.net` y `DS_OAUTH_BASE=https://account.docusign.com`, y repite consentimiento + creación en la cuenta de producción. |

---

## Notas técnicas

- **Scopes JWT:** `signature impersonation click.manage click.send`.
- **Encadenamiento:** el segundo agreement se renderiza dentro del callback `onAgreed`
  del primero (`public/app.js`), logrando la cascada sin recargar la página.
- **clientUserId:** lo genera el backend por sesión de onboarding; identifica al firmante
  en Docusign y permite verificar el estado en `/api/onboarding/status`.
- **Datos dinámicos:** se envían al SDK vía `documentData`. Las claves deben coincidir con
  los nombres de los campos dinámicos marcados en la consola.

# Ejecutor (Compatibilidad, fuera de Fase 1)

Este agente no es núcleo de esta skill Fase 1, pero se documenta para continuidad de pipeline.

## Guía de comentarios
Para comentarios por TC, resumen en US y cierre de task de ejecución, usar:
- `references/agentes/09-templates-comentarios.md`

## Guías relacionadas (lectura recomendada)
- `references/configuracion-app.md` (navegación, roles, ambiente)
- `references/agentes/08-gestor-evidencias-compat.md` (inventario y subida)
- `references/agentes/10-reporter-bugs-detallado.md` (reglas de bug)
- `references/agentes/11-execute-and-publish-generico.md` (flujo transversal de publicación)

## Flujo genérico `execute_and_publish` (obligatorio)
Ejecutar EXACTAMENTE en este orden por cada historia:

1. Descubrir contexto por historia
- Input mínimo: `project`, `userStoryId`.
- Resolver automáticamente:
  - `planId` (plan activo del sprint/proyecto)
  - `suiteId` de la historia (convención de nombre o relación)
  - `testCaseIds` vinculados a la historia (`Tested By`) o contenidos en la suite

2. Resolver Test Points (obligatorio)
- Obtener test points por `planId + suiteId`.
- Construir mapa: `testCaseId -> { testPointId, revision, title }`.
- Validar cobertura:
  - si falta test point para un test case esperado, marcar `BLOCKED_SETUP`,
  - registrar diagnóstico en `decisions_log`,
  - no publicar resultados hasta completar setup.

3. Crear run planificado
- Crear run con `plan.id` y `pointIds`.
- Guardar `runId`.
- Mecanismo obligatorio: ver sección **"Estrategia de publicación de resultados"** más abajo.

4. Publicar resultados (por lote)
- Para cada caso ejecutado publicar:
  - `testPointId`
  - `testCaseId`
  - `testCaseRevision`
  - `testCaseTitle`
  - `outcome` (`Passed|Failed|Blocked|NotApplicable`)
  - `state: Completed`
  - `comment`
- Guardar `resultId` por TC (requerido para subir adjuntos en paso 4b).
- Mecanismo obligatorio: ver sección **"Estrategia de publicación de resultados"** más abajo.

4b. Comprimir y subir evidencias al run (obligatorio, gate de cierre)
- **Paso previo obligatorio — compresión zip por TC:**
  - Comprimir todos los PNGs de `TC-<tc_id>/` en un único archivo: `evidencias-TC-<tc_id>.zip`
  - Ruta: `outputs/evidencias/<sprint>/US-<us_id>/TC-<tc_id>/evidencias-TC-<tc_id>.zip`
  - Comando: `cd outputs/evidencias/<sprint>/US-<us_id>/TC-<tc_id>/ && zip evidencias-TC-<tc_id>.zip *.png`
  - Actualizar `manifest.json` del TC: añadir campo `zip_file = "evidencias-TC-<tc_id>.zip"`.
  - El zip es el **único archivo** que se sube al ADO test runner (una sola interacción de upload).
- Subir `evidencias-TC-<tc_id>.zip` al run y validar que queda visible en ADO.
- Actualizar `manifest.json`: `upload_status = UPLOADED_VERIFIED` al confirmar el zip adjunto.
- Si el zip no se confirma: NO cerrar run → registrar `BLOCKED_EVIDENCE`.
- Mecanismo obligatorio: ver sección **"Estrategia de subida de evidencias"** más abajo.

5. Cerrar run
- Cerrar run con `state: Completed`.
- Solo ejecutar si todos los TCs tienen `upload_status = UPLOADED_VERIFIED`.
- Mecanismo obligatorio: ver sección **"Estrategia de publicación de resultados"** más abajo.

6. Trazabilidad
- Actualizar `pipeline-state.json`:
  - `execute_run_id`
  - `execute_url`
  - conteos de resultados
  - `us_ejecutadas[]`
- Comentar en QA Task de ejecución:
  - resumen
  - URL del run

## Contrato recomendado de entrada (genérico)
```json
{
  "project": "MisResultados",
  "userStoryId": 140508,
  "executionDate": "2026-03-24",
  "results": [
    { "testCaseId": 143482, "outcome": "Passed", "comment": "..." },
    { "testCaseId": 143485, "outcome": "Blocked", "comment": "..." }
  ],
  "metadata": {
    "tester": "qa.user@empresa.com",
    "environment": "qa",
    "baseUrl": "https://qa.example.com/"
  }
}
```

## Reglas de robustez `execute_and_publish` (obligatorias)
1. Idempotencia:
- Si existe run abierto para `userStoryId + executionDate`, reutilizar.
- No crear runs duplicados.

2. Validaciones previas:
- Sin `suiteId` o `planId`: abortar con error claro (`BLOCKED_SETUP`).
- Sin test points: no publicar resultados; dejar diagnóstico.

3. Reintentos:
- Reintentar `429/5xx` con backoff.
- No reintentar `4xx` funcionales.

4. Consistencia:
- Publicar siempre contra run planificado (`plan + pointIds`).
- No publicar contra run genérico sin `pointIds`.

5. Seguridad:
- PAT solo por variable de entorno (`AZURE_DEVOPS_EXT_PAT`).
- Nunca hardcodear ni loguear PAT.

## Identidad y autenticación (portable para cualquier equipo)
Principio:
- Nunca usar `assigned_to` fijo ni IDs de usuario hardcodeados.
- Tomar usuario actual desde sesión/token activa de Azure DevOps MCP.

Modos soportados:
- `interactive` (usuario inicia sesión con su cuenta)
- `pat` vía `AZURE_DEVOPS_EXT_PAT`

Configuración mínima recomendada:
```yaml
auth:
  mode: auto
  pat_env: AZURE_DEVOPS_EXT_PAT
identity:
  source: mcp_authenticated_user
execution:
  publish_to_execute: true
  resolve_context_from_story: true
```

## Qué hace
- **FASE 1:** Ejecuta TCs con Playwright MCP en la aplicación bajo prueba, capturando evidencias por paso.
- **FASE 2:** Comprime evidencias por TC en archivos zip.
- **FASE 3:** Navega al ADO Test Runner con Playwright, selecciona todos los TCs, marca outcomes y sube evidencias (zips) uno a uno.
- **FASE 4:** Crea bugs por fallos, comenta resultados en TCs y US, actualiza estados de QA Task y US.
- Genera evidencias segmentadas por `US/TC` con manifiesto por caso.
- Actualiza `app-context-learning.md` con hallazgos de cada ejecución.

## Dependencias y verificación obligatoria
Antes de ejecutar TCs, verificar disponibilidad de automatización web:

1. Playwright MCP habilitado:
- Validar que existan herramientas `browser_navigate`, `browser_snapshot`, `browser_click`, `browser_type`, `browser_take_screenshot`.
- Si el runtime del navegador no está instalado, ejecutar `browser_install`.
- Regla: usar `browser_snapshot` antes de interactuar con el DOM.
- Regla: no usar `browser_fill`; usar `browser_type`.

2. Playwright CLI (fallback operativo, si el flujo usa CLI):
- Verificar disponibilidad (`playwright --version` o `npx playwright --version`).
- Si no está disponible, instalar dependencias de proyecto y navegador:
  - `npm i -D playwright @playwright/test`
  - `npm install -g @playwright/cli@latest`
  - `npx playwright install`

3. Si no hay MCP ni CLI operativo:
- Marcar ejecución como `BLOCKED` con motivo `dependencia_playwright_no_disponible`.
- Registrar comentario en US con acción requerida.

## Política anti-flaky (obligatoria)
Antes de marcar un TC como `FAILED` o crear bug:
- Reintentar el paso/validación fallida hasta `policies.flaky_retry_max_attempts` (recomendado: 2).
- Si en reintento pasa: marcar resultado final `PASS_WITH_RETRY` en trazabilidad interna y `PASS` en ADO, registrando incidencia flaky.
- Si persiste el fallo tras reintentos: marcar `FAILED` y habilitar flujo de bug.

Regla:
- No crear bug por fallo único no reproducible cuando el reintento controlado lo descarta.

## Timeouts y retries operativos
Aplicar límites para evitar bloqueos largos:
- Timeout por paso: `policies.step_timeout_seconds` (recomendado: 30s).
- Timeout por TC completo: `policies.test_case_timeout_seconds` (recomendado: 300s).
- Retry por paso de interacción inestable: `policies.step_retry_max_attempts` (recomendado: 2).

Si se supera timeout de paso o TC:
- marcar `BLOCKED` o `FAILED` según evidencia,
- registrar `reason_code = RETRY_EXHAUSTED` o causa específica en comentario.

## Mascaramiento de datos sensibles en evidencias
Antes de guardar/subir screenshots:
- ocultar o difuminar datos sensibles visibles (tokens, passwords, cookies, PII).
- aplicar reglas de `policies.evidence_masking` (patrones/labels/selectores).
- evitar capturar pantallas con secretos en texto plano cuando exista alternativa.

Ejemplos de patrones sensibles:
- `password`, `token`, `authorization`, `bearer`, `cookie`, `set-cookie`, `documento`, `email`.

## Flujo paso a paso (operativo) — ACTUALIZADO

### FASE 1: Ejecución de Pruebas con Playwright (en la app)

1. Inicialización
- Leer `inputs/project-config.json`.
- Leer `outputs/pipeline-state.json` y seleccionar US con QA Task ejecución en `New|Doing`.
- Si la task de ejecución ya está `Closed`, marcar `SKIP`.
- Leer `app-context-learning.md` para conocer navegación, selectores y patrones de la app.
- Crear estructura de evidencias por sprint/US/TC:
  - `outputs/evidencias/<sprint>/US-<us_id>/`
  - `outputs/evidencias/<sprint>/US-<us_id>/TC-<tc_id>/`

2. Verificaciones previas por ambiente
- Verificar acceso a app (`APP_BASE_URL`) y estado de conectividad.
- Verificar credenciales por rol antes de iniciar corrida masiva.
- Si falla credencial de un rol, marcar TCs de ese rol como `BLOCKED`.

3. Preparación de TCs
- Listar TCs de suite por US desde Azure DevOps.
- Leer cada TC y extraer:
  - `Microsoft.VSTS.TCM.Steps` (XML),
  - `System.Description`,
  - rol requerido.
- Agrupar TCs por rol para minimizar cambios de sesión.

4. Ejecución de TCs con Playwright (en la aplicación bajo prueba)
- Login del rol usando MCP Playwright (`browser_navigate`, `browser_type`, `browser_click`).
- Verificación de pantalla inicial y contexto (`browser_snapshot`).
- Antes de ejecutar TCs:
  - si QA Task ejecución está en `New|To Do`, mover a `Doing` en Azure DevOps.
- **Ejecutar cada TC del grupo siguiendo los pasos del XML:**
  - Captura pre-ejecución (`STEP-000-PRE-attempt-1-<timestamp>.png`) en carpeta del TC.
  - Recorrer pasos del XML (acción + validación esperada).
  - Por cada paso:
    - Ejecutar acción en la app con Playwright.
    - Validar resultado esperado.
    - Capturar screenshot (`STEP-<nnn>-<PASSED|FAILED|BLOCKED>-attempt-<n>-<timestamp>.png`).
    - Actualizar `manifest.json` del TC: `steps_executed++`, `capture_status`, `upload_status=PENDING`.
  - Captura final del TC (`RESULT-<PASSED|FAILED|BLOCKED>-<timestamp>.png`).
  - Actualizar `manifest.json` con resultado final del TC.
- Si cambia rol, hacer logout y continuar.
- **Al finalizar todos los TCs: todas las evidencias están capturadas en carpetas locales.**

### FASE 2: Compresión de Evidencias por TC

5. Comprimir evidencias por TC (obligatorio antes de subir)
- Por cada TC ejecutado:
  - Navegar a `outputs/evidencias/<sprint>/US-<us_id>/TC-<tc_id>/`.
  - Comprimir todos los PNGs en un único zip:
    ```bash
    cd outputs/evidencias/<sprint>/US-<us_id>/TC-<tc_id>/
    zip evidencias-TC-<tc_id>.zip *.png
    ```
  - Actualizar `manifest.json` del TC: `zip_file = "evidencias-TC-<tc_id>.zip"`.
  - El zip es el **único archivo** que se subirá al ADO runner.

### FASE 3: Carga de Evidencias en Azure DevOps Test Runner

6. Navegar al ADO Test Runner con Playwright
- Usar MCP Playwright para navegar al runner:
  ```
  browser_navigate → https://dev.azure.com/{org}/{project}/_testPlans/execute?planId={planId}&suiteId={suiteId}
  browser_snapshot → verificar carga del runner y listar TCs visibles
  ```

7. Seleccionar todos los TCs y ejecutarlos en el runner
- **Seleccionar todos los TCs de la suite** (checkbox de selección múltiple o selección individual).
- Iniciar ejecución en el runner (esto crea el run automáticamente).

8. Marcar outcome y subir evidencias por cada TC (uno a uno)
- **Por cada TC en orden:**
  - Seleccionar el TC en el runner (`browser_click` en la fila del TC).
  - Verificar que el panel de ejecución lateral está abierto (`browser_snapshot`).
  - **Marcar outcome del TC:**
    - Si el TC pasó: click en ícono "Passed".
    - Si el TC falló: click en ícono "Failed" y marcar el paso específico que falló.
    - Si el TC está bloqueado: click en ícono "Blocked".
  - **Subir el zip de evidencias:**
    - Click en botón "Add attachment" o ícono de clip.
    - `browser_file_upload` → ruta absoluta del zip (`evidencias-TC-<tc_id>.zip`).
    - Verificar que el zip aparece como adjunto (`browser_snapshot`).
    - Capturar screenshot de confirmación (`UPLOAD-VERIFIED-TC-<tc_id>-<timestamp>.png`).
    - Actualizar `manifest.json`: `upload_status = UPLOADED_VERIFIED`.
  - **Agregar comentario al TC (si aplica):**
    - Si el TC falló, agregar comentario con detalle del fallo y referencia al bug.
    - Si el TC está bloqueado, agregar comentario con razón del bloqueo.
  - Pasar al siguiente TC.

9. Cerrar el runner
- Una vez completados todos los TCs, cerrar el runner con "Save and Close".
- El run se cierra automáticamente con todos los outcomes y evidencias cargadas.

### FASE 4: Actualización de Estados en Azure DevOps

10. Crear bugs por fallos (si aplica)
- Para cada TC `FAILED`, crear bug solo si el flujo/política lo permite.
- Aplicar regla de asignación de bug definida abajo.
- Vincular bug con US y TC.

11. Comentar resultados en TCs y US
- Comentar cada TC en Azure DevOps con:
  - resultado,
  - paso fallido (si aplica),
  - evidencias (referencia al zip),
  - bug asociado (si aplica).
- Comentar en la US resumen ejecutivo:
  - total/pass/fail/blocked,
  - bugs creados,
  - evidencias clave,
  - acción requerida.

12. Actualizar estados de QA Task y US
- **QA Task de ejecución:**
  - Si todos los TCs fueron ejecutados (Passed o Failed) y evidencia completa: `Doing -> Closed`.
  - Si existen TCs `BLOCKED` o evidencia incompleta: mantener en `Doing`.
- **User Story:**
  - Si todos los TCs pasaron: mover a `PO Review`.
  - Si existen bugs: mover a `On Hold`.
  - Si existen TCs bloqueados: mantener en `On Hold`.

13. Persistencia
- Actualizar `stages.ejecucion` en `pipeline-state`.
- Registrar en `decisions_log` el resultado de la ejecución.
- Publicar reporte `outputs/reports/ejecutor-[YYYY-MM-DD].md`.
- **Actualizar `app-context-learning.md` con hallazgos de la ejecución** (selectores confirmados, lecciones aprendidas, datos de prueba).

## Regla de asignación de bug (cuando el Ejecutor crea bug)
- Resolver `bug_assignee` con la misma política del ReporterBugs:
1. Último asignado en revisiones de la US distinto al usuario autenticado en el MCP de Azure DevOps.
2. Si no existe, asignado actual de la US distinto al usuario autenticado en el MCP de Azure DevOps.
3. Si no existe, fallback manual configurable (si es distinto al usuario autenticado en el MCP de Azure DevOps).
4. Si no hay candidato válido, crear bug sin asignado y dejar comentario de advertencia.

## Evidencias obligatorias por TC y por paso
Capturar y persistir evidencia mínima:
- Carpeta base por caso:
  - `outputs/evidencias/<sprint>/US-<us_id>/TC-<tc_id>/`
- Archivos mínimos por caso:
  - `STEP-000-PRE-attempt-1-<timestamp>.png`
  - `STEP-<nnn>-<PASSED|FAILED|BLOCKED>-attempt-<n>-<timestamp>.png` (cada paso ejecutado)
  - `RESULT-<PASSED|FAILED|BLOCKED>-<timestamp>.png`
  - `manifest.json` (registro transaccional del TC)
  - `evidencias-TC-<tc_id>.zip` (archivo zip obligatorio con todos los PNGs del TC)

### ⚠️ Regla obligatoria de compresión de evidencias (ZIP por TC)
Una vez capturadas todas las evidencias de un TC, **antes de adjuntarlas al runner**:

1. Comprimir todos los archivos de la carpeta `TC-<tc_id>/` (excepto `manifest.json`) en un único ZIP:
   ```bash
   cd "outputs/evidencias/<sprint>/US-<us_id>/TC-<tc_id>"
   zip TC-<tc_id>-evidencias.zip STEP-*.png RESULT-*.png network-requests.json 2>/dev/null || true
   ```
2. El ZIP **debe quedar dentro de la misma carpeta del TC**:
   - Ruta correcta: `outputs/evidencias/<sprint>/US-<us_id>/TC-<tc_id>/TC-<tc_id>-evidencias.zip`
   - ❌ Incorrecto: `outputs/evidencias/<sprint>/US-<us_id>/TC-<tc_id>-evidencias.zip` (nivel US)

3. Adjuntar **únicamente el ZIP** al runner (no los archivos individuales). Esto reduce el número de operaciones de upload de N a 1 por TC.

4. Verificar que el contador de adjuntos del runner aumenta a "1" tras la subida.

Reglas:
- Siempre capturar evidencia antes/después de acciones relevantes.
- Nunca guardar evidencia de paso fuera de la carpeta `TC-<tc_id>`.
- El ZIP siempre dentro de la carpeta `TC-<tc_id>/`, nunca a nivel `US-<us_id>/`.
- Nunca detener ejecución global por fallo de un TC; continuar y documentar.
- Mantener naming estable para permitir inventario automático del Gestor de Evidencias.
- **Una vez capturados todos los PNGs del TC, comprimir en zip antes de subir a ADO.**
- El zip se llama `evidencias-TC-<tc_id>.zip` y es el único archivo que se sube al runner.
- No subir PNGs individuales al runner; siempre usar el zip como unidad de subida.

## Handoff obligatorio al Gestor de Evidencias (08)
El Ejecutor debe entregar estructura explícita para carga de evidencias:

```json
{
  "us_id": 12345,
  "us_evidence_dir": "outputs/evidencias/Sprint-24/US-12345",
  "execution_outcomes": [
    {
      "tc_id": 144801,
      "scenario_id": "ESC-HP-01",
      "result": "PASS|FAIL|BLOCKED",
      "failed_step": 0,
      "bug_id": null,
      "tc_evidence_dir": "outputs/evidencias/Sprint-24/US-12345/TC-144801",
      "manifest_file": "outputs/evidencias/Sprint-24/US-12345/TC-144801/manifest.json",
      "steps_executed": 5,
      "steps_with_uploaded_verified_evidence": 5,
      "evidence_files": [
        "outputs/evidencias/Sprint-24/US-12345/TC-144801/STEP-000-PRE-attempt-1-081100.png",
        "outputs/evidencias/Sprint-24/US-12345/TC-144801/STEP-001-PASSED-attempt-1-081130.png",
        "outputs/evidencias/Sprint-24/US-12345/TC-144801/RESULT-PASSED-081500.png"
      ]
    }
  ]
}
```

## Operaciones principales
- ADO: leer/actualizar work items, comentar, vincular, listar TCs de suite.
- Playwright: navegar, interactuar, evidencias (screenshots).

## Contrato de salida útil para fases siguientes
- resultados por TC (`PASS/FAIL/BLOCKED`)
- bugs creados
- evidencias generadas

## Estrategia de publicación de resultados (orden de prioridad)

El agente debe resolver el mecanismo disponible al inicio de cada ejecución y registrar cuál usó en `decisions_log`.

### ⚠️ Advertencia crítica sobre el PAT disponible
El PAT en `AZURE_DEVOPS_EXT_PAT` de este proyecto tiene scope limitado: funciona para workitems (leer/editar/comentar) pero **NO tiene scope de test management**. Las llamadas REST a `/test/runs`, `/test/runs/{runId}/results` y `/test/runs/{runId}/results/{resultId}/attachments` retornan **HTTP 401**.

**Regla obligatoria:** NO intentar REST para operaciones de test runs/results/attachments sin verificar el scope primero. Si la verificación falla, ir directamente a Playwright UI. No reintentar con REST si ya se recibió 401 en endpoint de test.

### Prioridad 1 — REST API via curl (Bash tool)
Solo aplicable si el PAT tiene scope de test management **verificado** con la llamada de prueba siguiente. Para el PAT actual de este proyecto, saltar directamente a Prioridad 2.

**Verificación obligatoria antes de intentar cualquier operación de test por REST:**
```bash
PAT_B64=$(echo -n ":${AZURE_DEVOPS_EXT_PAT}" | base64)
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
  "https://dev.azure.com/{org}/{project}/_apis/test/plans?api-version=7.1" \
  -H "Authorization: Basic ${PAT_B64}")
echo $HTTP_CODE
```
→ Si `200`: continuar con REST. Si `401` o `403`: registrar `BLOCKED_REST_TEST_SCOPE` e ir a Prioridad 2 sin más intentos REST en esta sesión.

**Crear run:**
```bash
PAT_B64=$(echo -n ":${AZURE_DEVOPS_EXT_PAT}" | base64)
curl -s -X POST \
  "https://dev.azure.com/{org}/{project}/_apis/test/runs?api-version=7.1" \
  -H "Authorization: Basic ${PAT_B64}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "QA Run US-{us_id} {executionDate}",
    "plan": {"id": {planId}},
    "pointIds": [{pointId1}, {pointId2}],
    "automated": false
  }'
```
→ Guardar `.id` de la respuesta como `runId`.

**Publicar resultados:**
```bash
curl -s -X POST \
  "https://dev.azure.com/{org}/{project}/_apis/test/runs/{runId}/results?api-version=7.1" \
  -H "Authorization: Basic ${PAT_B64}" \
  -H "Content-Type: application/json" \
  -d '[{"testPoint":{"id":{pointId}},"testCase":{"id":{tcId}},"testCaseRevision":{rev},"testCaseTitle":"{title}","outcome":"Passed","state":"Completed","comment":"{comment}"}]'
```
→ Guardar `.value[n].id` de la respuesta como `resultId` por TC.

**Cerrar run:**
```bash
curl -s -X PATCH \
  "https://dev.azure.com/{org}/{project}/_apis/test/runs/{runId}?api-version=7.1" \
  -H "Authorization: Basic ${PAT_B64}" \
  -H "Content-Type: application/json" \
  -d '{"state": "Completed"}'
```

### Prioridad 2 — Playwright UI visual (mecanismo principal para este proyecto)
Usar para todas las operaciones de test runs, marcado de resultados y subida de evidencias.
El flujo completo está definido en:
`references/agentes/08-gestor-evidencias-compat.md` → sección "Flujo Playwright para ADO test runner".

### Regla de selección de mecanismo
1. Ejecutar verificación de scope del PAT (llamada de prueba a endpoint de test).
2. Si retorna 401/403 (como ocurre con el PAT actual): usar **exclusivamente Prioridad 2 (Playwright UI)** para toda la sesión. No reintentar REST.
3. Registrar en `decisions_log` qué mecanismo se usó y por qué.
4. Si se usa Prioridad 2: el runner crea y cierra el test run; no se necesita `runId` externo.

## Reglas estrictas
- Requiere autorización previa del Orquestador para ejecutar pruebas o mutaciones en Azure DevOps.
- Aplicar contrato I/O estandar (`references/contrato-io-agentes.md`) y codigos de decision (`references/codigos-decision.md`).
- Ejecutar el flujo `execute_and_publish` en orden estricto (contexto -> points -> run -> resultados -> cierre -> trazabilidad).
- Aplicar política anti-flaky antes de declarar `FAILED` o crear bug.
- Respetar timeouts/retries por paso y por TC definidos en `policies`.
- En evidencias, enmascarar datos sensibles antes de adjuntar o comentar.
- Ejecutar gate de ownership antes de correr TCs: solo ejecutar si la QA Task de ejecución está asignada al usuario autenticado en el MCP de Azure DevOps.
- Si `execution_owner != mcp_user`: NO ejecutar TCs, NO crear runs, NO cambiar estado de US, registrar `SKIP` con `EXECUTION_OWNERSHIP_MISMATCH` y comentar la US.
- Solo permitir excepción con instrucción explícita del usuario o reasignación explícita y auditada.
- Sin `planId/suiteId/testPoints` válidos: NO publicar ni cerrar run; registrar `BLOCK` con `reason_code = BLOCKED_SETUP`.
- Sin cobertura completa de evidencia subida/verificada por paso: NO cerrar TC/US/run como completados; registrar `BLOCK` con `reason_code = BLOCKED_EVIDENCE`.
- Al iniciar ejecución desde `Ready for test`, mover QA Task ejecución de `New|To Do` a `Doing`.
- Al iniciar ejecución desde `Ready for test`, mover QA Task ejecución de `New|To Do` a `Doing`.
- **ACTUALIZADO 2026-03-26:** Con `BLOCKED`, NO cerrar QA Task ejecución; mantener `On Hold`.
- **ACTUALIZADO 2026-03-26:** Con `FAIL` pero todos los TCs ejecutados y evidencia completa, SÍ cerrar QA Task ejecución.
- **ACTUALIZADO 2026-03-26:** Cerrar QA Task ejecución cuando todos los TCs fueron ejecutados (Passed o Failed) y evidencia completa. El cierre NO depende del outcome sino de si todos fueron ejecutados.
- Nunca usar asignado fijo; siempre resolver identidad desde MCP Azure DevOps o PAT del ejecutor.
- Nunca usar asignado fijo; siempre resolver identidad desde MCP Azure DevOps o PAT del ejecutor.
- No detener ejecución global por fallo de un TC.
- Tomar evidencia por paso y evidencia final por TC.
- Comentar cada TC y cada US procesada.
- No usar campos prohibidos al crear bug (según `fields_mapping.prohibited_fields`).
- Mantener trazabilidad completa en `pipeline-state`.

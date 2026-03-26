# Execute and Publish (Genérico, Portable)

Guía transversal para ejecutar y publicar resultados de pruebas por historia sin hardcodear usuarios ni contexto.

## Flujo genérico `execute_and_publish`

### 1) Descubrir contexto por historia
Input mínimo:
- `project`
- `userStoryId`

Resolver automáticamente:
- `planId` (plan activo del sprint/proyecto)
- `suiteId` de la historia (convención de nombre o relación)
- `testCaseIds` vinculados a la historia (`Tested By`) o contenidos en la suite

### 2) Resolver Test Points (obligatorio)
- Obtener test points por `planId + suiteId`
- Construir mapa:
  - `testCaseId -> { testPointId, revision, title }`
- Validar cobertura:
  - si falta test point para un test case esperado, marcar `BLOCKED_SETUP` y registrar diagnóstico

### 3) Crear run planificado
- Crear run con `plan.id` y `pointIds`
- Guardar `runId`

Mecanismo (Prioridad 1 — curl via Bash tool):
```bash
PAT_B64=$(echo -n ":${AZURE_DEVOPS_EXT_PAT}" | base64)
curl -s -X POST \
  "https://dev.azure.com/{org}/{project}/_apis/test/runs?api-version=7.1" \
  -H "Authorization: Basic ${PAT_B64}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "QA Run US-{us_id} {executionDate}",
    "plan": {"id": {planId}},
    "pointIds": [{pointId1}, {pointId2}, ...],
    "automated": false
  }'
```
→ Guardar `.id` de la respuesta como `runId` en `pipeline-state.json`.

Mecanismo (Prioridad 2 — Playwright UI, cuando REST no disponible):
- `browser_navigate` → `https://dev.azure.com/{org}/{project}/_testPlans/execute?planId={planId}&suiteId={suiteId}`
- El run se crea implícitamente al marcar el primer outcome en la UI.

### 4) Publicar resultados (por lote)
Para cada caso ejecutado publicar:
- `testPointId`
- `testCaseId`
- `testCaseRevision`
- `testCaseTitle`
- `outcome` (`Passed|Failed|Blocked|NotApplicable`)
- `state: Completed`
- `comment`

Guardar `resultId` por TC (necesario para subir adjuntos en paso 4b).

Mecanismo (Prioridad 1 — curl via Bash tool):
```bash
curl -s -X POST \
  "https://dev.azure.com/{org}/{project}/_apis/test/runs/{runId}/results?api-version=7.1" \
  -H "Authorization: Basic ${PAT_B64}" \
  -H "Content-Type: application/json" \
  -d '[
    {
      "testPoint": {"id": {testPointId}},
      "testCase": {"id": {testCaseId}},
      "testCaseRevision": {revision},
      "testCaseTitle": "{title}",
      "outcome": "Passed",
      "state": "Completed",
      "comment": "{comment}"
    }
  ]'
```
→ Guardar `.value[n].id` de la respuesta como `resultId` por TC.

Mecanismo (Prioridad 2 — Playwright UI visual):
Ver sección **"Flujo Playwright para ADO test runner"** en `08-gestor-evidencias-compat.md`.

### 4b) [NUEVO] Subir evidencias al run (gate obligatorio antes de cerrar)
- Por cada TC, subir todos los archivos de `outputs/evidencias/<sprint>/US-<id>/TC-<id>/`.
- Confirmar que cada adjunto queda visible en ADO.
- Actualizar `manifest.json` con `upload_status = UPLOADED_VERIFIED` por archivo confirmado.
- Si algún archivo no se confirma: NO cerrar run → `BLOCKED_EVIDENCE`.

Mecanismo (Prioridad 1 — curl REST, requiere `resultId`):
```bash
FILE_B64=$(base64 -i "{ruta_archivo}")
curl -s -X POST \
  "https://dev.azure.com/{org}/{project}/_apis/test/runs/{runId}/results/{resultId}/attachments?api-version=7.1" \
  -H "Authorization: Basic ${PAT_B64}" \
  -H "Content-Type: application/json" \
  -d "{
    \"stream\": \"${FILE_B64}\",
    \"fileName\": \"{nombre_archivo}.png\",
    \"comment\": \"Evidencia paso {n} — TC {tc_id}\",
    \"attachmentType\": \"GeneralAttachment\"
  }"
```

Mecanismo (Prioridad 2 — Playwright UI visual):
Ver sección **"Flujo Playwright para ADO test runner"** en `08-gestor-evidencias-compat.md`.

### 5) Cerrar run
- Cerrar run con `state: Completed`
- Solo ejecutar si todos los TCs tienen `upload_status = UPLOADED_VERIFIED` en su `manifest.json`.

Mecanismo (Prioridad 1 — curl via Bash tool):
```bash
curl -s -X PATCH \
  "https://dev.azure.com/{org}/{project}/_apis/test/runs/{runId}?api-version=7.1" \
  -H "Authorization: Basic ${PAT_B64}" \
  -H "Content-Type: application/json" \
  -d '{"state": "Completed"}'
```

Mecanismo (Prioridad 2 — Playwright UI):
- El run se cierra automáticamente al completar todos los outcomes en la UI de ADO.

### 6) Trazabilidad
Actualizar `pipeline-state.json` con:
- `execute_run_id`
- `execute_url`
- conteos de resultados
- `us_ejecutadas[]`
- métricas de cobertura de evidencia por paso (`steps_executed`, `steps_with_uploaded_verified_evidence`, `missing_evidence_steps`)

Comentar en QA Task de ejecución:
- resumen de resultados
- URL del run
- estado de evidencia por TC (verificada o bloqueada)

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
    "tester": "jorge.vasquez@n5now.com",
    "environment": "qa",
    "baseUrl": "https://qaplatform.n5platform.com/"
  }
}
```

## Reglas de robustez

1. Idempotencia:
- si existe run abierto para `userStoryId + executionDate`, reutilizar
- no crear runs duplicados

2. Validaciones previas:
- sin `suiteId` o `planId` => abortar con error claro
- sin test points => no publicar resultados; dejar diagnóstico
- ante setup incompleto => registrar `BLOCKED_SETUP`, no cambiar estado de US y no cerrar run inexistente

3. Reintentos:
- reintentar llamadas `429/5xx` con backoff
- no reintentar `4xx` funcionales

4. Consistencia:
- publicar siempre contra run planificado (`plan + pointIds`)
- no usar run genérico sin `pointIds`
- guardar evidencias por estructura `outputs/evidencias/<sprint>/US-<us_id>/TC-<tc_id>/`
- no cerrar TC/US/run si falta evidencia subida/verificada por algún paso (`BLOCKED_EVIDENCE`)

5. Seguridad:
- PAT solo por variable de entorno (`AZURE_DEVOPS_EXT_PAT`)
- nunca hardcodear ni loguear PAT

## Identidad y autenticación (cualquier persona)

### Principio clave
La skill nunca usa `assigned_to` fijo ni IDs de usuario hardcodeados.
Siempre toma el usuario actual desde la sesión/token activa de Azure DevOps.

### Autenticación soportada
- `interactive` (cada persona inicia sesión con su cuenta)
- `pat` por variable de entorno (`AZURE_DEVOPS_EXT_PAT`)

Ambos modos deben resolver usuario autenticado actual y usarlo para:
- auditoría
- comentarios
- ownership de ejecución

### Configuración mínima de skill (sugerida)
```yaml
auth:
  mode: auto            # interactive | pat | auto
  pat_env: AZURE_DEVOPS_EXT_PAT
identity:
  source: mcp_authenticated_user
execution:
  publish_to_execute: true
  resolve_context_from_story: true
```

## Flujo por historia para cualquier usuario
1. Detectar usuario actual (`mcp_authenticated_user`).
2. Resolver `planId`, `suiteId`, `testCaseIds` de la historia.
3. Resolver `testPointId` por cada caso.
4. Crear run planificado (`plan + pointIds`).
5. Publicar resultados por caso.
6. Cerrar run.
7. Dejar trazabilidad (`runId/url + comentario`).

## Permisos requeridos
La cuenta (o PAT) de quien ejecute debe tener:
- Test Management: Read & Write
- Work Items: Read & Write (si se comentan tareas/casos)
- acceso al proyecto/sprint/suite

## Qué cambia para “cualquier persona”
Solo cambian sus credenciales (login o PAT).
La skill y el flujo permanecen iguales.

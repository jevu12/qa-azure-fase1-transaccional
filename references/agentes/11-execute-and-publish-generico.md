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

Referencia API (si aplica por integración):
- `POST /test/runs`

### 4) Publicar resultados (por lote)
Para cada caso ejecutado publicar:
- `testPointId`
- `testCaseId`
- `testCaseRevision`
- `testCaseTitle`
- `outcome` (`Passed|Failed|Blocked|NotApplicable`)
- `state: Completed`
- `comment`

Referencia API (si aplica por integración):
- `POST /test/runs/{runId}/results`

### 5) Cerrar run
- Cerrar run con `state: Completed`

Referencia API (si aplica por integración):
- `PATCH /test/runs/{runId}`

### 6) Trazabilidad
Actualizar `pipeline-state.json` con:
- `execute_run_id`
- `execute_url`
- conteos de resultados
- `us_ejecutadas[]`

Comentar en QA Task de ejecución:
- resumen de resultados
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

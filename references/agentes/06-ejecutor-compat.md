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
- Endpoint de referencia: `POST /test/runs`.

4. Publicar resultados (por lote)
- Para cada caso ejecutado publicar:
  - `testPointId`
  - `testCaseId`
  - `testCaseRevision`
  - `testCaseTitle`
  - `outcome` (`Passed|Failed|Blocked|NotApplicable`)
  - `state: Completed`
  - `comment`
- Endpoint de referencia: `POST /test/runs/{runId}/results`.

5. Cerrar run
- Cerrar run con `state: Completed`.
- Endpoint de referencia: `PATCH /test/runs/{runId}`.

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
- Ejecuta TCs con Playwright MCP.
- Comenta resultado en cada TC y resumen en la US.
- Puede crear bugs por fallos.
- Actualiza QA Task de ejecución y `pipeline-state`.
- Publica resultados en run planificado usando test points.

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

## Flujo paso a paso (operativo)
1. Inicialización
- Leer `inputs/project-config.json`.
- Leer `outputs/pipeline-state.json` y seleccionar US con QA Task ejecución en `New|Doing`.
- Si la task de ejecución ya está `Closed`, marcar `SKIP`.
- Crear carpeta de evidencias `outputs/evidencias/[YYYY-MM-DD]/`.

2. Verificaciones previas por ambiente
- Verificar acceso a app (`APP_BASE_URL`) y estado de conectividad.
- Verificar credenciales por rol antes de iniciar corrida masiva.
- Si falla credencial de un rol, marcar TCs de ese rol como `BLOCKED`.

3. Preparación de TCs
- Listar TCs de suite por US.
- Leer cada TC y extraer:
  - `Microsoft.VSTS.TCM.Steps` (XML),
  - `System.Description`,
  - rol requerido.
- Agrupar TCs por rol para minimizar cambios de sesión.

4. Ejecución por rol
- Login del rol.
- Verificación de pantalla inicial y contexto (snapshot).
- Ejecutar cada TC del grupo:
  - captura pre-ejecución,
  - recorrer pasos del XML (acción + validación),
  - screenshot por paso (`passed|failed`),
  - screenshot final del TC (`PASSED|FAILED|BLOCKED`).
- Si cambia rol, hacer logout y continuar.

5. Resultado por TC (obligatorio)
- Comentar cada TC en Azure DevOps con:
  - resultado,
  - paso fallido (si aplica),
  - evidencias,
  - bug asociado (si aplica).

6. Bug por fallo (si aplica)
- Para `FAILED`, crear bug solo si el flujo/política lo permite.
- Aplicar regla de asignación de bug definida abajo.
- Vincular bug con US y TC.

7. Resumen por US (obligatorio)
- Comentar en la US resumen ejecutivo:
  - total/pass/fail/blocked,
  - bugs creados,
  - evidencias clave,
  - acción requerida.

8. Cierre de task de ejecución
- Actualizar QA Task ejecución a estado final del proyecto (normalmente `Closed`).

9. Persistencia
- Actualizar `stages.ejecucion` en `pipeline-state`.
- Publicar reporte `outputs/reports/ejecutor-[YYYY-MM-DD].md`.

## Regla de asignación de bug (cuando el Ejecutor crea bug)
- Resolver `bug_assignee` con la misma política del ReporterBugs:
1. Último asignado en revisiones de la US distinto al usuario autenticado en el MCP de Azure DevOps.
2. Si no existe, asignado actual de la US distinto al usuario autenticado en el MCP de Azure DevOps.
3. Si no existe, fallback manual configurable (si es distinto al usuario autenticado en el MCP de Azure DevOps).
4. Si no hay candidato válido, crear bug sin asignado y dejar comentario de advertencia.

## Evidencias obligatorias por TC y por paso
Capturar y persistir evidencia mínima:
- `TC-{id}-pre-{timestamp}.png` (antes de ejecutar pasos).
- `TC-{id}-paso-{n}-passed.png` o `TC-{id}-paso-{n}-failed.png` (cada paso).
- `TC-{id}-RESULTADO-[PASSED|FAILED|BLOCKED].png` (resultado final del TC).

Reglas:
- Siempre capturar evidencia antes/después de acciones relevantes.
- Nunca detener ejecución global por fallo de un TC; continuar y documentar.
- Mantener naming estable para permitir inventario automático del Gestor de Evidencias.

## Handoff obligatorio al Gestor de Evidencias (08)
El Ejecutor debe entregar estructura explícita para carga de evidencias:

```json
{
  "us_id": 12345,
  "execution_outcomes": [
    {
      "tc_id": 144801,
      "scenario_id": "ESC-HP-01",
      "result": "PASS|FAIL|BLOCKED",
      "failed_step": 0,
      "bug_id": null,
      "evidence_files": [
        "outputs/evidencias/2026-03-21/TC-144801-pre-081100.png",
        "outputs/evidencias/2026-03-21/TC-144801-paso-1-passed.png",
        "outputs/evidencias/2026-03-21/TC-144801-RESULTADO-PASSED.png"
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
- Nunca usar asignado fijo; siempre resolver identidad desde MCP Azure DevOps o PAT del ejecutor.
- No detener ejecución global por fallo de un TC.
- Tomar evidencia por paso y evidencia final por TC.
- Comentar cada TC y cada US procesada.
- No usar campos prohibidos al crear bug (según `fields_mapping.prohibited_fields`).
- Mantener trazabilidad completa en `pipeline-state`.

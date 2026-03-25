# Orquestador (Fase 1)

## Guía de comentarios
Para cualquier comentario en US (estado, impedimentos, cierre), usar:
- `references/agentes/09-templates-comentarios.md`

## Guías relacionadas
- `references/agentes/11-execute-and-publish-generico.md` (flujo transversal para delegar ejecución/publicación)

## Objetivo operativo
Coordinar el flujo, clasificar US y delegar mutaciones a Ingestor/Análisis/Diseño.
Cuando aplique extensión de compatibilidad, delegar además a Ejecutor -> ReporterBugs -> GestorEvidencias.

## Configuración obligatoria de entrada
Leer primero `inputs/project-config.json` y extraer:
- `organization.url`, `project.name`, `project.team`, `project.iteration_path`, `project.area_path`
- `auth.mode`, `auth.pat_env`, `identity.source`
- `qa_assignee.source`, `qa_assignee.email`, `qa_assignee.name`
- `execution.mode`, `execution.publish_to_execute`, `execution.resolve_context_from_story`, `execution.user_stories`, `execution.exclude_technical_keywords`
- `policies.*`, `naming_conventions.*`, `fields_mapping.*`

Compatibilidad:
- Si no existe `project-config.json`, NO iniciar mutaciones.
- Fallback a `inputs/us-list.md` solo en modo diagnóstico (`detection-only`) y con instrucción explícita del usuario.
- En cualquier otro caso: `BLOCK` con `reason_code = CONFIG_INVALID`.

## Preflight operacional del orquestador (orden mínimo)
1. Leer configuración.
2. Verificar MCP Azure DevOps (conectividad, acceso a proyecto/team/sprint, identidad MCP).
3. Activar lock de concurrencia para `pipeline-state.json`.
4. Leer/crear `outputs/pipeline-state.json` y reanudar de forma idempotente.
5. Obtener US objetivo (lista explícita o sprint completo).
6. Ejecutar detección de artefactos por US antes de decidir acciones.
7. Si la US entra a ejecución, resolver contexto `execute_and_publish` (`planId`, `suiteId`, `testCaseIds`, `testPoints`) antes de delegar al Ejecutor.

### Control de concurrencia de `pipeline-state` (obligatorio)
- Antes de escribir en `outputs/pipeline-state.json`, crear lock de ejecución (`outputs/pipeline-state.lock`).
- Si el lock pertenece a otra ejecución activa:
  - no mutar estado,
  - registrar `BLOCK` con `reason_code = CONTRACT_VALIDATION_FAILED`,
  - finalizar con acción requerida para liberar/expirar lock.
- Liberar lock al finalizar o en error controlado.

## Matriz de delegación por `execution.mode` (obligatoria)
| Modo | Agentes permitidos |
|---|---|
| `full-pipeline` | Orquestador, Detector, Ingestor, Analisis, Diseño |
| `analysis-only` | Orquestador, Detector, Ingestor, Analisis |
| `design-only` | Orquestador, Detector, Ingestor, Diseño |
| `execution-only` | Orquestador, Detector, Ingestor, Ejecutor, ReporterBugs, GestorEvidencias (solo extensión compatibilidad) |
| `detection-only` | Orquestador, Detector |

Regla:
- Si el `mode` no habilita un agente candidato, registrar `SKIP_NO_ACTION` con `reason_code = EXECUTION_NOT_REQUIRED`.

## QA Orchestrator Service (gate obligatorio)
Antes de ejecutar cualquier agente especializado, el Orquestador DEBE:
1. Consultar el estado actual de la User Story.
2. Validar si la historia es procesable según las reglas del flujo.
3. Verificar tareas QA, casos de prueba, suites, ejecuciones, bugs, comentarios y evidencias existentes.
4. Aplicar reglas de idempotencia, deduplicación y gobernanza.
5. Decidir si corresponde ejecutar una acción, omitirla o continuar desde un punto previo.
6. Seleccionar el agente adecuado y el foco de ejecución.

Regla de delegación:
- Solo después de esta validación, el orquestador puede delegar a un agente especializado.
- Ningún agente puede ejecutarse directamente sobre Azure DevOps sin autorización previa del orquestador.

## Priorización operativa por US (obligatoria)
Aplicar exactamente este orden de prioridad:
1. `EXECUTE_PENDING`
2. `IN_EXECUTION`
3. Diseño pendiente
4. Análisis pendiente
5. Nuevas sin artefactos

Si dos agentes son candidatos para la misma US en el mismo ciclo:
- ejecutar solo el agente de mayor prioridad,
- registrar el resto como `SKIP_NO_ACTION` por precedencia.

## Validaciones críticas adicionales

### Validación de tipo de artefacto (obligatoria)
- Antes de resumir o registrar cualquier ID, validar `System.WorkItemType`.
- No reportar una Test Suite/Test Plan/Test Run como si fuera User Story.

### Diferenciar US cerrada vs pipeline QA completo (obligatorio)
Definir:
- `CLOSED_US_STATES = ["PO Review", "Done", "Closed"]`
- `EXECUTION_PENDING = (US.state in ["Ready for test", "Testing in progress"]) AND (execution_task.state in ["New", "To Do", "Doing"]) AND (test_runs_count == 0 OR has_pending_tcs == true)`

Regla:
- Si `EXECUTION_PENDING == true`, NO comunicar la US como cerrada/completa.

### Restricción por estado
- `no_action_states` (`Rejected`, `Pending definition`): `SKIP`, sin mutaciones.
- `task_only_states` (`New`, `On Hold`, `Code Review`): solo QA Tasks; no TCs/runs/cambio de estado.
- `Ready for test` o `Testing in progress`: habilitar flujo de ejecución según reglas de ownership y transiciones.

## Política de reintentos y escalamiento
- Reintentos por operación MCP: usar `policies.max_retries_on_mcp_failure`.
- Si una operación falla y se recupera en reintento: registrar `UPDATE_EXISTING` o `CREATE_NEW` con nota de reintento.
- Si agota reintentos en una US: registrar `ERROR_RUNTIME` con `reason_code = RETRY_EXHAUSTED` y continuar con siguiente US.
- Si más del 50% de las US del sprint terminan con error MCP:
  - detener pipeline,
  - registrar `BLOCK_PROCESS` con `reason_code = MCP_NOT_AVAILABLE`,
  - emitir comentario de impedimento global en el resumen.

## Estrategia de compensación transaccional (partial failure)
Cuando una mutación queda parcial (ejemplo: create OK, link FAIL):
1. Registrar estado parcial en `decisions_log` (`decision=ERROR`, `reason_code=CONTRACT_VALIDATION_FAILED`).
2. No eliminar artefactos ya creados.
3. Reintentar únicamente la parte faltante (link/update/comentario) en el siguiente ciclo.
4. Marcar US como `PARTIAL` hasta completar consistencia.

## Human-in-the-loop (WAIT_USER_INPUT)
Si falta definición funcional, testabilidad o dato obligatorio que no pueda inferirse:
- no delegar agente mutador para esa acción,
- registrar `BLOCK_PROCESS` con `reason_code = US_MISSING_REQUIRED_CONTENT`,
- setear `next_action = WAIT_USER_INPUT`,
- comentar en US la pregunta exacta y la acción requerida.

## Acciones concretas
- Lee configuración y estado (`project-config`, `pipeline-state`).
- Evalúa estado de US + artefactos detectados.
- Decide `CREATE/UPDATE/SKIP/BLOCK` por US.
- Evalúa ownership de ejecución (`execution_owner` vs `mcp_user`) antes de delegar a Ejecutor.
- Evalúa elegibilidad técnica de publicación (`planId`, `suiteId`, `testPointIds`) antes de delegar a Ejecutor.
- Si hay mismatch de ownership en ejecución, registrar `SKIP` con `EXECUTION_OWNERSHIP_MISMATCH` y comentar la US.
- Si falta setup de ejecución/publicación, registrar `BLOCK` con `reason_code = BLOCKED_SETUP`, `next_action = WAIT_USER_INPUT` y comentario en US.
- Validar cobertura de evidencia por paso (`steps_executed == steps_with_uploaded_verified_evidence`) antes de autorizar cierre de TC/US/run.
- Si falta evidencia verificada, registrar `BLOCK` con `reason_code = BLOCKED_EVIDENCE` y no cerrar transición.
- Al iniciar ejecución en US `Ready for test`, forzar QA Task ejecución `New|To Do -> Doing`.
- Con `FAIL` o `BLOCKED`, mantener QA Task ejecución en `Doing`.
- Solo permitir QA Task ejecución `Doing -> Closed` cuando US califica para `PO Review`.
- Actualiza estado de US solo si política lo permite.
- Comenta impedimentos o transiciones en la US.

## Gate para delegación a Ejecutor (`execute_and_publish`)
Antes de autorizar al Ejecutor, validar en este orden:
1. `US.state` habilita ejecución (`Ready for test` o `Testing in progress`).
2. Ownership válido (`execution_owner == mcp_user`) o excepción explícita auditada.
3. Contexto resuelto por historia:
  - `planId` presente,
  - `suiteId` presente,
  - `testCaseIds` identificados.
4. Test points completos para todos los TCs objetivo.

Si falla (3) o (4):
- no delegar ejecución,
- no permitir creación/publicación/cierre de run,
- registrar `BLOCK_PROCESS` con `reason_code = BLOCKED_SETUP`,
- dejar comentario con acción requerida para completar setup.

## Operaciones típicas
- `wit_get_work_item`, `wit_get_work_items_by_query`
- `wit_update_work_item` (estado US)
- `wit_add_work_item_comment`

## Plantilla breve de comentario
`🤖 Orquestador QA — Pipeline QA Automatizado — [timestamp]`

## Salida mínima
- `decisions_log` actualizado
- `decisions_log` con campos de ownership: `execution_owner`, `mcp_user`, `ownership_check`, `skip_reason_code`
- `decisions_log` con `decision_code`, `reason_code` y `error_code` (si aplica), según `references/codigos-decision.md`
- `stages` del pipeline actualizados
- resumen por US con razones

## Plantilla de salida estructurada por US (obligatoria)
```json
{
  "us_id": 12345,
  "us_state": "Ready for test",
  "mode": "full-pipeline",
  "decision": "SKIP",
  "decision_code": "SKIP_NO_ACTION",
  "reason_code": "EXECUTION_OWNERSHIP_MISMATCH",
  "reason": "Execution owner distinto al usuario MCP autenticado",
  "next_agent": "Ejecutor",
  "next_action": "WAIT_USER_INPUT",
  "artifacts_snapshot": {
    "analysis_task_id": 1001,
    "design_task_id": 1002,
    "execution_task_id": 1003,
    "test_cases_ready": 8,
    "test_runs_count": 0
  }
}
```

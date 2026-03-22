# Orquestador (Fase 1)

## Guía de comentarios
Para cualquier comentario en US (estado, impedimentos, cierre), usar:
- `references/agentes/09-templates-comentarios.md`

## Objetivo operativo
Coordinar el flujo, clasificar US y delegar mutaciones a Ingestor/Análisis/Diseño.

## Configuración obligatoria de entrada
Leer primero `inputs/project-config.json` y extraer:
- `organization.url`, `project.name`, `project.team`, `project.iteration_path`, `project.area_path`
- `qa_assignee.source`, `qa_assignee.email`, `qa_assignee.name`
- `execution.mode`, `execution.user_stories`, `execution.exclude_technical_keywords`
- `policies.*`, `naming_conventions.*`, `fields_mapping.*`

Compatibilidad:
- Si no existe `project-config.json`, fallback a `inputs/us-list.md`.

## Preflight operacional del orquestador (orden mínimo)
1. Leer configuración.
2. Verificar MCP Azure DevOps (conectividad, acceso a proyecto/team/sprint, identidad MCP).
3. Leer/crear `outputs/pipeline-state.json` y reanudar de forma idempotente.
4. Obtener US objetivo (lista explícita o sprint completo).
5. Ejecutar detección de artefactos por US antes de decidir acciones.

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

## Acciones concretas
- Lee configuración y estado (`project-config`, `pipeline-state`).
- Evalúa estado de US + artefactos detectados.
- Decide `CREATE/UPDATE/SKIP/BLOCK` por US.
- Evalúa ownership de ejecución (`execution_owner` vs `mcp_user`) antes de delegar a Ejecutor.
- Si hay mismatch de ownership en ejecución, registrar `SKIP` con `EXECUTION_OWNERSHIP_MISMATCH` y comentar la US.
- Actualiza estado de US solo si política lo permite.
- Comenta impedimentos o transiciones en la US.

## Operaciones típicas
- `wit_get_work_item`, `wit_get_work_items_by_query`
- `wit_update_work_item` (estado US)
- `wit_add_work_item_comment`

## Plantilla breve de comentario
`🤖 Orquestador QA — Pipeline QA Automatizado — [timestamp]`

## Salida mínima
- `decisions_log` actualizado
- `decisions_log` con campos de ownership: `execution_owner`, `mcp_user`, `ownership_check`, `skip_reason_code`
- `stages` del pipeline actualizados
- resumen por US con razones

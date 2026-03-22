# Ingestor (Fase 1)

## Guía de comentarios
Para bloqueos o notificaciones en US, usar:
- `references/agentes/09-templates-comentarios.md`

## Objetivo operativo
Crear QA Tasks faltantes y dejar el contexto listo para análisis/diseño.

## Configuración obligatoria de entrada
Leer primero `inputs/project-config.json` y extraer:
- `organization.url`, `project.name`, `project.team`, `project.iteration_path`, `project.area_path`
- `qa_assignee.source`, `qa_assignee.email`, `qa_assignee.name`
- `execution.mode`, `execution.user_stories`, `execution.exclude_technical_keywords`
- `policies.*`, `naming_conventions.*`, `fields_mapping.*`

Compatibilidad:
- Si no existe `project-config.json`, fallback a `inputs/us-list.md`.

## Operaciones típicas
- `wit_get_work_item` (US y tasks)
- `wit_get_work_items_by_query` (listar US del sprint)
- `wit_create_work_item` (QA Tasks)
- `wit_add_link` (parent-child)
- `wit_add_work_item_comment` (US bloqueadas/impedimentos)
- `wit_update_work_item` (cuando aplique)

## Flujo detallado (orden recomendado)
1. Inicializar `pipeline-state`:
- Crear/leer `outputs/pipeline-state.json`.
- Marcar `stages.ingestor.status = IN_PROGRESS`.

2. Obtener US objetivo:
- Si `execution.user_stories` trae IDs, usar esa lista.
- Si no, consultar todas las US de `project.iteration_path`.

3. Leer y normalizar cada US:
- Extraer `id`, `title`, `state`, `description`, `acceptance_criteria`, `area`, `iteration`, `children`, `tags`.

4. Clasificar por filtros:
- Estado (`blocked_us_states`, `review_us_states`, `processable_us_states`).
- Filtro técnico por `exclude_technical_keywords`.
- Contenido mínimo (`description` y `acceptance_criteria`).

5. Aplicar reglas por estado:
- `task_only_states`: solo crear/completar QA Tasks, sin ejecución.
- `no_action_states`: no crear nada; registrar `IGNORED`.

6. Detectar QA Tasks existentes:
- Buscar hijos por títulos esperados:
  - análisis: `naming_conventions.analysis_task_title`
  - diseño: `naming_conventions.design_task_title`
  - ejecución: `naming_conventions.execution_task_title`

6.1 Resolver colisiones de título:
- Si existe mismo título pero intención diferente (ej. task manual no QA), no asumir equivalencia automática.
- Confirmar equivalencia por combinación:
  - relación hija directa con la US,
  - `System.WorkItemType` esperado,
  - tags QA (`policies.qa_task_tag`),
  - trazabilidad previa en `decisions_log` (si existe).
- Si hay colisión no resoluble: registrar `BLOCK` con `reason_code = CONTRACT_VALIDATION_FAILED` y no crear duplicado ciego.

7. Crear faltantes (idempotente):
- Solo crear task si no existe equivalente como hija directa.
- Crear en `System.State = New`.
- Vincular de inmediato como hija de US.

7.1 Comportamiento transaccional create task + link:
- Secuencia obligatoria:
  1. `wit_create_work_item`
  2. `wit_add_link` (Task -> US)
- Si falla el link:
  - NO borrar la task creada.
  - Registrar `ERROR` parcial con `reason_code = CONTRACT_VALIDATION_FAILED`.
  - Marcar `status = PARTIAL` para esa task.
  - Reintentar solo el link en siguiente ciclo (idempotente).

8. Registrar contexto de salida por US:
- `clasificacion`, `qa_tasks.{analisis,diseno,ejecucion}`, `status`, `ignore_reason`, `processed_at`.
- `qa_tasks_status` por cada task esperada: `created|existing|skipped|partial|error`.

9. Cierre de etapa:
- Actualizar `stages.ingestor` (`full_pipeline`, `execution_only`, `in_execution`, `completed`, `ignored`, `blocked`, `errors`).
- Generar reporte `outputs/reports/ingestor-[YYYY-MM-DD].md`.

## Campos obligatorios al crear QA Task
- `System.Title` (según naming_conventions)
- `System.AreaPath` (US area)
- `System.IterationPath` (`project.iteration_path`)
- `System.Tags` (`policies.qa_task_tag`)
- `System.State` = `New`
- `System.AssignedTo`:
  - Si `qa_assignee.source = mcp_authenticated_user`: usar identidad MCP (u omitir para autoasignación ADO).
  - Si `manual`: usar `qa_assignee.email`.

## Plantilla mínima de creación (Task)
```json
{
  "project": "[project.name]",
  "workItemType": "[policies.qa_task_work_item_type]",
  "fields": [
    { "name": "System.Title", "value": "[titulo_task]" },
    { "name": "System.AreaPath", "value": "[us_area]" },
    { "name": "System.IterationPath", "value": "[project.iteration_path]" },
    { "name": "System.Tags", "value": "[policies.qa_task_tag]" },
    { "name": "System.State", "value": "New" }
  ]
}
```

## Salida obligatoria por task esperada
Registrar por US:

```json
{
  "us_id": 12345,
  "qa_tasks_status": {
    "analisis": "created|existing|skipped|partial|error",
    "diseno": "created|existing|skipped|partial|error",
    "ejecucion": "created|existing|skipped|partial|error"
  },
  "qa_tasks_ids": {
    "analisis": 2001,
    "diseno": 2002,
    "ejecucion": 2003
  }
}
```

## Reglas estrictas
- Requiere autorización previa del Orquestador para ejecutar mutaciones en Azure DevOps.
- Aplicar contrato I/O estandar (`references/contrato-io-agentes.md`) y codigos de decision (`references/codigos-decision.md`).
- No crear tasks duplicadas.
- No hardcodear proyecto/sprint/assignee.
- No procesar US técnicas.
- No ejecutar acciones fuera de estado permitido.
- Nunca sobrescribir `System.AssignedTo` en QA Tasks existentes si ya está asignada a otro usuario distinto al autenticado en MCP de Azure DevOps, salvo instrucción explícita del usuario.
- Registrar toda decisión en `decisions_log`.

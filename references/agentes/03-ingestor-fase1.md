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

7. Crear faltantes (idempotente):
- Solo crear task si no existe equivalente como hija directa.
- Crear en `System.State = New`.
- Vincular de inmediato como hija de US.

8. Registrar contexto de salida por US:
- `clasificacion`, `qa_tasks.{analisis,diseno,ejecucion}`, `status`, `ignore_reason`, `processed_at`.

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

## Reglas estrictas
- No crear tasks duplicadas.
- No hardcodear proyecto/sprint/assignee.
- No procesar US técnicas.
- No ejecutar acciones fuera de estado permitido.
- Nunca sobrescribir `System.AssignedTo` en QA Tasks existentes si ya está asignada a otro usuario distinto al autenticado en MCP de Azure DevOps, salvo instrucción explícita del usuario.
- Registrar toda decisión en `decisions_log`.

# ReporterBugs (Compatibilidad, fuera de Fase 1)

## Guía principal
Para ejecución real del flujo de reporte de bugs, usa como referencia normativa:
- `references/agentes/10-reporter-bugs-detallado.md`
- `references/agentes/09-templates-comentarios.md` (plantillas de comentarios en US/bugs)

Este archivo (`07`) funciona como resumen rápido de compatibilidad.

## Qué hace
- Evalúa resultados `FAIL`/`BLOCKED`.
- Verifica duplicados de bug por US/TC.
- Aplica umbral de confianza para creación automática.
- Crea y vincula bug con contexto reproducible.
- Asigna el bug al desarrollador objetivo según historial de asignación de la US.

## Operaciones principales
- `wit_get_work_items_by_query` (deduplicación)
- `wit_get_work_item` (US actual)
- `wit_list_work_item_revisions` (historial de asignación de la US)
- `wit_create_work_item` (Bug)
- `wit_add_link` (Bug <-> US, Bug <-> TC)
- `wit_add_work_item_comment` (hallazgos bajo umbral/impedimentos)

## Regla clave
No crear bug si confianza < `policies.bug_confidence_threshold`.

## Regla obligatoria de asignación de bug
Al crear un bug, `System.AssignedTo` NO debe quedar en el usuario autenticado en el MCP de Azure DevOps si existe un desarrollador candidato.

Algoritmo:
1. Obtener el usuario actual autenticado en el MCP de Azure DevOps.
2. Leer revisiones de la US y buscar el último `System.AssignedTo` no vacío y distinto al usuario autenticado en el MCP de Azure DevOps.
3. Si existe, asignar el bug a ese usuario.
4. Si no existe en revisiones, usar `System.AssignedTo` actual de la US si es distinto al usuario autenticado en el MCP de Azure DevOps.
5. Si tampoco existe candidato, fallback:
- `qa_assignee.email` solo si es distinto al usuario autenticado en el MCP de Azure DevOps.
- Si no hay fallback válido, crear bug sin `System.AssignedTo` y registrar advertencia en comentario.

Regla de trazabilidad:
- Registrar en `pipeline-state` el `bug_assignee` resuelto y la `assignee_source` (`us_revisions`, `us_current`, `fallback_manual`, `none`).

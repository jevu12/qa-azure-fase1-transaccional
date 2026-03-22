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

## Regla de orquestación obligatoria
- Requiere autorización previa del Orquestador para ejecutar acciones en Azure DevOps.
- No crear/actualizar bugs ni comentarios si no existe decisión previa del Orquestador en `decisions_log`.
- Aplicar contrato I/O estandar (`references/contrato-io-agentes.md`) y codigos de decision (`references/codigos-decision.md`).

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

## Matriz de severidad/prioridad por tipo de falla (base)
| Tipo de falla | Severidad sugerida | Prioridad sugerida |
|---|---|---|
| Bloqueo total de flujo crítico | 1 - Critical | 1 |
| Error funcional crítico con workaround nulo | 1 - Critical | 1 |
| Error funcional alto impacto con workaround parcial | 2 - High | 2 |
| Error de validación/media | 3 - Medium | 2 |
| Defecto visual menor/no bloqueante | 4 - Low | 3 |
| Issue de datos no crítico | 3 - Medium | 2 |

Regla:
- Si el proyecto define matriz propia en `project-config`, usar la del proyecto sobre esta base.

## Regla explícita: reabrir bug existente vs crear nuevo
- Reabrir bug existente cuando:
  - hay evidencia funcionalmente equivalente,
  - el bug está en `Resolved|Closed`,
  - misma US/TC/causa raíz probable.
- Crear bug nuevo cuando:
  - el síntoma o causa difiere de forma material,
  - cambió contexto funcional o criterio afectado,
  - no existe trazabilidad suficiente para reabrir de forma segura.

## Evidencia mínima obligatoria para crear bug
Todo bug creado debe incluir referencia concreta a evidencia:
- `evidence_file` (ruta/archivo),
- `failed_step` (número de paso),
- `actual` y `expected` resumidos.

Si falta evidencia concreta:
- no crear bug automático,
- registrar hallazgo con `BLOCK` o `SKIP` según política y solicitar evidencia faltante.

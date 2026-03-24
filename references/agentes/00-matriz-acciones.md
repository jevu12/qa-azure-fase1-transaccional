# Matriz de Acciones por Agente (Portable)

Esta matriz define quién ejecuta qué, en qué `mode`, con qué entradas/salidas mínimas, precondiciones y códigos de decisión.

## Alcance operativo de esta skill

- **Núcleo Fase 1 (default):** detección + QA Tasks + análisis + diseño + creación/vinculación de TCs/suite.
- **Extensión de compatibilidad (solo si el usuario lo pide explícitamente):** ejecución, reporter de bugs y gestión de evidencias.
- Si no hay instrucción explícita de ejecutar pruebas o reportar bugs, se opera solo en núcleo Fase 1.

## Agentes por mode (explícito)

`✅` corre en ese mode. `⚠️` solo compatibilidad (requiere instrucción explícita + autorización del Orquestador). `❌` no corre.

| Agente | Tipo | full-pipeline | analysis-only | design-only | execution-only | detection-only |
|---|---|---|---|---|---|---|
| Orquestador | Núcleo Fase 1 | ✅ | ✅ | ✅ | ✅ | ✅ |
| DetectorArtefactos | Núcleo Fase 1 | ✅ | ✅ | ✅ | ✅ | ✅ |
| Ingestor | Núcleo Fase 1 | ✅ | ✅ | ✅ | ✅ | ❌ |
| Analisis | Núcleo Fase 1 | ✅ | ✅ | ❌ | ❌ | ❌ |
| Diseño | Núcleo Fase 1 | ✅ | ❌ | ✅ | ❌ | ❌ |
| Ejecutor | Compatibilidad | ⚠️ | ❌ | ❌ | ✅ | ❌ |
| ReporterBugs | Compatibilidad | ⚠️ | ❌ | ❌ | ✅ | ❌ |
| GestorEvidencias | Compatibilidad | ⚠️ | ❌ | ❌ | ✅ | ❌ |

## Matriz operativa detallada por agente

| Agente | Tipo | Input mínimo | Output mínimo | Precondición | Códigos de decisión frecuentes |
|---|---|---|---|---|---|
| Orquestador | Núcleo Fase 1 | `project-config`, `pipeline-state`, snapshot de artefactos por US | plan por US + `next_agent/next_action` + `decisions_log` | Preflight MCP OK + gate QA Orchestrator Service | `CREATE_NEW`, `UPDATE_EXISTING`, `SKIP_NO_ACTION`, `BLOCK_PROCESS`, `ERROR_RUNTIME` |
| DetectorArtefactos | Núcleo Fase 1 | `us_id`, contexto proyecto/sprint | inventario de tasks/tcs/suites/runs/bugs/comentarios/evidencias + madurez QA | Invocación explícita del Orquestador | `SKIP_NO_ACTION`, `ERROR_RUNTIME` |
| Ingestor | Núcleo Fase 1 | US procesables + `naming_conventions` + `policies` | QA Tasks creadas/completadas + links US<-Task + `decisions_log` | Autorización del Orquestador + no estar en `no_action_states` | `CREATE_NEW`, `UPDATE_EXISTING`, `SKIP_NO_ACTION`, `ERROR_RUNTIME` |
| Analisis | Núcleo Fase 1 | US + QA Task análisis + criterios de aceptación | análisis ISTQB en task + handoff a diseño + `decisions_log` | Autorización del Orquestador + task análisis existente/creada | `UPDATE_EXISTING`, `SKIP_NO_ACTION`, `BLOCK_PROCESS`, `ERROR_RUNTIME` |
| Diseño | Núcleo Fase 1 | US + análisis + QA Task diseño + config de campos | TCs en `Ready`, suite/links consistentes + `decisions_log` | Autorización del Orquestador + historia testeable + `Custom.Component` resuelto | `CREATE_NEW`, `UPDATE_EXISTING`, `SKIP_NO_ACTION`, `BLOCK_PROCESS`, `ERROR_RUNTIME` |
| Ejecutor | Compatibilidad | TCs `Ready`, ownership validado, contexto de ejecución | `execution_outcomes`, `execute_run_id/execute_url`, comentarios TC/US, evidencias + `decisions_log` | Instrucción explícita + autorización del Orquestador + `execution_owner == mcp_user` (o excepción auditada) + setup `planId/suiteId/testPoints` completo + evidencia por paso en estructura `US/TC` | `UPDATE_EXISTING`, `SKIP_NO_ACTION`, `BLOCK_PROCESS`, `ERROR_RUNTIME` (`reason_code`: `BLOCKED_SETUP`/`BLOCKED_EVIDENCE`) |
| ReporterBugs | Compatibilidad | `execution_outcomes`, `us_context`, umbral de confianza | `bugs_created/skipped`, vínculos y asignación + `decisions_log` | Instrucción explícita + autorización del Orquestador + deduplicación previa | `CREATE_NEW`, `SKIP_NO_ACTION`, `BLOCK_PROCESS`, `ERROR_RUNTIME` |
| GestorEvidencias | Compatibilidad | inventario de archivos + outcomes de ejecución | archivos adjuntados/enlazados/omitidos + comentario resumen + `decisions_log` | Instrucción explícita + autorización del Orquestador + carpetas `US/TC` y `manifest.json` por TC | `UPDATE_EXISTING`, `SKIP_NO_ACTION`, `BLOCK_PROCESS`, `ERROR_RUNTIME` (`reason_code`: `BLOCKED_EVIDENCE`) |

Referencia obligatoria de códigos y contratos:
- `references/codigos-decision.md`
- `references/contrato-io-agentes.md`
- `references/agentes/11-execute-and-publish-generico.md`

## Regla de precedencia por US (cuando dos agentes compiten)

1. El Orquestador decide siempre; ningún agente se auto-dispara.
2. Para una misma US, primero se ejecuta detección (Detector) y luego un solo agente mutador por ciclo.
3. Precedencia funcional (alineada a reglas del motor):
   - `EXECUTE_PENDING`
   - `IN_EXECUTION`
   - diseño pendiente
   - análisis pendiente
   - nuevas sin artefactos
4. Traducción a agentes:
   - si hay ejecución pendiente/en curso: `Ejecutor -> ReporterBugs -> GestorEvidencias` (solo compatibilidad habilitada)
   - si no hay ejecución y falta diseño: `Diseño`
   - si no hay ejecución/diseño y falta análisis: `Analisis`
   - si faltan tasks base: `Ingestor`
5. Si el `mode` no habilita un agente, se registra `SKIP_NO_ACTION` y no se fuerza ejecución.

## Reglas transversales
- Toda ejecución de agente especializado requiere autorización previa del Orquestador (QA Orchestrator Service).
- Ningún agente especializado puede operar directo en Azure DevOps sin decisión previa en `decisions_log`.
- Todo agente debe respetar el contrato I/O estándar: `references/contrato-io-agentes.md`.
- Todo agente debe usar códigos normalizados de decisión: `references/codigos-decision.md`.
- Detectar antes de crear (idempotencia).
- No duplicar artefactos equivalentes.
- Usar identidad MCP (`qa_assignee.source`).
- En bugs: asignar al último responsable de la US distinto al usuario autenticado en el MCP de Azure DevOps.
- Registrar decisiones en `decisions_log`.
- Respetar estados permitidos antes de mutar artefactos.

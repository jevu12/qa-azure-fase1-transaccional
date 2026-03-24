# Contrato I/O Estandar por Agente

## Objetivo
Definir entradas, salidas y errores minimos por agente para ejecucion consistente entre equipos.

## Regla global
- Ningun agente especializado puede mutar Azure DevOps sin autorizacion previa del Orquestador y decision registrada en `decisions_log`.

## Formato comun de salida por agente
- `status`: `SUCCESS|PARTIAL|SKIP|BLOCK|ERROR`
- `us_id`
- `agent`
- `summary`
- `artifacts_created[]`
- `artifacts_updated[]`
- `artifacts_skipped[]`
- `decisions_log_append[]`

## 00 - Matriz de acciones (referencial)
- Input: N/A (documentacion).
- Output: N/A (documentacion).
- Error: N/A.

## 01 - Orquestador
- Input minimo:
  - `inputs/project-config.json`
  - `outputs/pipeline-state.json` (si existe)
  - estado de US + artefactos detectados
- Output minimo:
  - plan por US (`CREATE|UPDATE|SKIP|BLOCK|ERROR`)
  - `next_agent` y `next_action`
  - actualizacion de `stages.*` y `decisions_log`
- Errores clave:
  - `MCP_NOT_AVAILABLE`, `PROJECT_NOT_ACCESSIBLE`, `ITERATION_NOT_ACCESSIBLE`, `CONFIG_INVALID`

## 02 - Detector de artefactos
- Input minimo:
  - `us_id`, `project.name`, `project.iteration_path`
- Output minimo:
  - snapshot de artefactos: tasks, tcs, suites, runs, bugs, comentarios, evidencias
  - madurez QA (`NONE|PARTIAL_TASKS|FULL_TASKS|DESIGNED|EXECUTED|COMPLETE`)
- Errores clave:
  - `CONTRACT_VALIDATION_FAILED`, `UNEXPECTED_EXCEPTION`

## 03 - Ingestor
- Input minimo:
  - US objetivo + naming/policies + asignacion QA
- Output minimo:
  - `qa_tasks`: `{analisis, diseno, ejecucion}` con `id/state`
  - links creados US<-Task
  - decisiones por cada task esperada (`created|existing|skipped`)
- Errores clave:
  - `ALREADY_EXISTS_EQUIVALENT`, `RETRY_EXHAUSTED`, `UNEXPECTED_EXCEPTION`

## 04 - Analisis
- Input minimo:
  - US + QA Task analisis + criterios de aceptacion
- Output minimo:
  - contenido ISTQB en `System.Description`
  - clasificacion 2 capas (ISTQB + dominio)
  - handoff a diseno con condiciones de prueba
- Errores clave:
  - `US_MISSING_REQUIRED_CONTENT`, `CONTRACT_VALIDATION_FAILED`

## 05 - Diseno
- Input minimo:
  - US + analisis + task diseno + configuracion de campos
- Output minimo:
  - TCs en `Ready` con campos obligatorios
  - membresia de suite
  - trazabilidad TC->US y TC->Task diseno
- Errores clave:
  - `US_MISSING_REQUIRED_CONTENT`, `CONTRACT_VALIDATION_FAILED`, `RETRY_EXHAUSTED`

## 06 - Ejecutor (compat)
- Input minimo:
  - TCs en `Ready`, ownership validado, `configuracion-app`/credenciales
  - contexto `execute_and_publish`: `project`, `userStoryId`, `executionDate`, `results[]`, `metadata` (o equivalentes internos)
- Output minimo:
  - `execution_outcomes[]` por TC
  - `execute_run_id`, `execute_url`
  - comentarios TC/US
  - evidencias en inventario estandar
  - estructura por evidencia `US/TC` + `manifest.json` por TC
  - `steps_executed`, `steps_with_uploaded_verified_evidence` por TC
  - trazabilidad de publicación (`planId`, `suiteId`, `pointIds_resolved`)
- Errores clave:
  - `EXECUTION_OWNERSHIP_MISMATCH`, `BLOCKED_SETUP`, `BLOCKED_EVIDENCE`, `MCP_NOT_AVAILABLE`, `RETRY_EXHAUSTED`

## 07 - ReporterBugs (compat)
- Input minimo:
  - `execution_outcomes[]`, contexto US, umbral de confianza
- Output minimo:
  - `bugs_created[]`, `bugs_skipped[]`, `impediments_registered[]`
  - asignacion `bug_assignee` + `assignee_source`
- Errores clave:
  - `ALREADY_EXISTS_EQUIVALENT`, `MCP_IDENTITY_UNRESOLVED`, `RETRY_EXHAUSTED`

## 08 - GestorEvidencias (compat)
- Input minimo:
  - inventario de archivos por `US/TC` + `execution_outcomes[]`
  - `manifest.json` por TC con estados de subida por paso
- Output minimo:
  - `files_uploaded`, `files_linked`, `files_skipped`
  - `steps_with_uploaded_verified_evidence`, `missing_evidence_steps`
  - comentario resumen en US (o fallback)
- Errores clave:
  - `ALREADY_EXISTS_EQUIVALENT`, `BLOCKED_EVIDENCE`, `RETRY_EXHAUSTED`

## 09 - Templates de comentarios
- Input: placeholders de contexto.
- Output: contenido markdown listo para publicar.
- Error: `CONTRACT_VALIDATION_FAILED` si faltan placeholders obligatorios.

## 10 - ReporterBugs detallado
- Input minimo:
  - `execution_outcomes`, `us_context`, `project_config`
- Output minimo:
  - bug draft final, links y trazabilidad
- Errores clave:
  - `RETRY_EXHAUSTED`, `UNEXPECTED_EXCEPTION`

## 11 - Execute and Publish (guia transversal de compatibilidad)
- Input minimo:
  - `project`, `userStoryId`
  - `results[]` con outcome por TC
- Output minimo:
  - run planificado creado/reusado (`run_id`)
  - resultados publicados por test point
  - run cerrado y comentario de trazabilidad en QA Task de ejecución
- Errores clave:
  - `BLOCKED_SETUP`, `EXECUTION_OWNERSHIP_MISMATCH`, `RETRY_EXHAUSTED`

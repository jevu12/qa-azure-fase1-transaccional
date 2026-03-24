# Contratos de Datos Relevantes (Fase 1)

## Contratos embebidos en la skill
Esta skill es portable: todos los contratos requeridos viven dentro de `references/contracts/`.
- `references/contracts/pipeline-state.schema.json`
- `references/contracts/story-context.schema.json`
- `references/contracts/execution-outcome.schema.json`
- `references/contracts/bug-draft.schema.json`

Estandares transversales complementarios:
- `references/contrato-io-agentes.md`
- `references/codigos-decision.md`
- `references/agentes/11-execute-and-publish-generico.md`

## Contratos mínimos usados en Fase 1

### PipelineState
- Archivo: `outputs/pipeline-state.json`
- Rol: memoria compartida entre etapas/agentes.
- Claves esenciales: `execution_id`, `proyecto`, `sprint`, `modo`, `stages`, `decisions_log`.
- En ejecución/publicación (compat), incluir trazabilidad de run: `execute_run_id`, `execute_url`, conteos y `us_ejecutadas[]`.

### StoryContext
- Rol: representar US con artefactos detectados y contexto funcional.
- Uso en Fase 1: detección y decisión de creación/actualización/omisión.

### ExecutionOutcome
- Rol: resultado de ejecución por caso.
- Uso en Fase 1: opcional, solo para interoperabilidad con etapas posteriores.
- En compat de ejecución: incluye evidencia segmentada por carpeta `US/TC`, `manifest.json` y cobertura de subida verificada por paso.

### BugDraft
- Rol: borrador de bug con contexto.
- Uso en Fase 1: opcional, no es foco funcional principal.

## Requisito de consistencia
Toda escritura en `pipeline-state.json` debe mantener compatibilidad con `references/contracts/pipeline-state.schema.json`.
Adicionalmente, `decisions_log` debe usar codigos del catalogo en `references/codigos-decision.md`.

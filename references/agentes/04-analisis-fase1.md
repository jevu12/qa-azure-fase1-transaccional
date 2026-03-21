# Análisis (Fase 1)

## Guía de comentarios
Para comentarios de inicio/cierre de análisis en QA Task, usar:
- `references/agentes/09-templates-comentarios.md`

## Objetivo operativo
Completar la QA Task de análisis con contenido ISTQB y cerrarla correctamente.

## Acciones concretas
- Toma QA Task de análisis existente (si falta, fallback de creación controlada).
- Mueve task a `Doing`.
- Publica análisis en `System.Description` con `format: Html`.
- Verifica contenido y cierra en `Closed`.
- Actualiza `stages.analisis` y reporte.

## Operaciones típicas
- `wit_get_work_item`
- `wit_update_work_item` (estado/estimación/description)

## Reglas duras
- No dejar contenido genérico ni placeholders.
- No cerrar sin verificar descripción guardada.
- Mantener trazabilidad en pipeline-state.

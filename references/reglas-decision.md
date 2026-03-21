# Reglas de Decisión (Resumen Operativo)

## Entrada mínima para decidir
- Configuración: `inputs/project-config.json`.
- Estado compartido: `outputs/pipeline-state.json`.
- Estado real de cada US y sus relaciones en Azure DevOps.

## Secuencia de decisión
1. Leer US y relaciones.
2. Validar contenido mínimo (`description`, criterios de aceptación).
3. Filtrar por keywords técnicas.
4. Clasificar por estado.
5. Detectar artefactos existentes.
6. Determinar acción: `CREATE`, `UPDATE`, `SKIP`, `BLOCK`, `ERROR`.
7. Registrar decisión en `decisions_log`.

## Reglas por estado (Fase 1)
- `Rejected`, `Pending definition`: `SKIP` sin acciones.
- `New`, `On Hold`, `Code Review`: solo preparar/completar artefactos QA permitidos por Fase 1, sin forzar ejecución.
- `Ready for test`: habilitado para completar artefactos faltantes de diseño/estructura.
- `PO Review`, `Done`, `Closed`: `SKIP` (completada).

## Regla de seguridad
Si hay duda entre crear o no crear, prevalece `SKIP` y se registra motivo para revisión.

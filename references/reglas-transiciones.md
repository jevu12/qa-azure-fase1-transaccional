# Reglas de Estado para Fase 1

## Alcance
Estas reglas delimitan qué acciones transaccionales están permitidas sobre la US en Fase 1.

## Estados sin acción
- `Rejected`
- `Pending definition`

Acción: `SKIP`, registrar motivo.

## Estados de preparación
- `New`
- `On Hold`
- `Code Review`

Acción: crear/completar artefactos QA de preparación (tasks/casos/suite según corresponda), sin forzar ejecución de pruebas.

## Estado listo para QA
- `Ready for test`

Acción: completar estructura QA faltante para dejar la US ejecutable (sin entrar en flujos avanzados fuera de Fase 1).

## Estados cerrados
- `PO Review`
- `Done`
- `Closed`

Acción: `SKIP` por completitud, salvo verificación explícita solicitada.

## Regla transversal
No ejecutar cambios de estado fuera de políticas configuradas en `project-config.json`.

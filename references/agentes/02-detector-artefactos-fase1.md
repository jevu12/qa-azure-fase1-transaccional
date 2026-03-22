# Detector de Artefactos (Fase 1)

## Objetivo operativo
Detectar TODO lo existente antes de cualquier creación.

## Acciones concretas
- Lee US con relaciones.
- Detecta QA Tasks hijas (análisis/diseño/ejecución).
- Detecta TCs vinculados, suites, runs, bugs, comentarios QA, evidencias.
- Calcula nivel de madurez QA (`NONE`, `PARTIAL_TASKS`, `FULL_TASKS`, `DESIGNED`, `EXECUTED`, `COMPLETE`).

## Operaciones típicas
- `wit_get_work_item`
- `testplan_list_test_plans`
- `testplan_list_test_suites`
- `testplan_list_test_cases`

## Regla dura
- No crea ni modifica nada; solo reporta.
- Solo se ejecuta por invocación del Orquestador (no ejecución directa autónoma).

## Salida mínima
Objeto de artefactos existentes por US para motor de decisiones.

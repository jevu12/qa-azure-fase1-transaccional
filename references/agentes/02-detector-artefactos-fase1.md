# Detector de Artefactos (Fase 1)

## Objetivo operativo
Detectar TODO lo existente antes de cualquier creación.

## Acciones concretas
- Lee US con relaciones.
- Detecta QA Tasks hijas (análisis/diseño/ejecución).
- Detecta TCs vinculados, suites, runs, bugs, comentarios QA, evidencias.
- Verifica `System.WorkItemType` en cada hallazgo para evitar falsos positivos.
- Identifica artefactos huérfanos/inconsistentes.
- Calcula nivel de madurez QA (`NONE`, `PARTIAL_TASKS`, `FULL_TASKS`, `DESIGNED`, `EXECUTED`, `COMPLETE`).

## Operaciones típicas
- `wit_get_work_item`
- `testplan_list_test_plans`
- `testplan_list_test_suites`
- `testplan_list_test_cases`

## Verificación de tipo por hallazgo (obligatoria)
Para cada artefacto detectado, registrar:
- `id`
- `work_item_type` (`System.WorkItemType`)
- `type_check` (`valid|invalid`)
- `type_check_reason`

Reglas:
- Si el tipo no coincide con el esperado del hallazgo, marcar `invalid` y excluir de decisiones de creación/actualización.
- Nunca tratar `Test Suite`, `Test Plan` o `Test Run` como `User Story`.

## Detección de artefactos huérfanos/inconsistentes
Detectar y reportar al menos:
- TC sin vínculo `Tests/Tested By` a la US objetivo.
- QA Task con título esperado pero no vinculada como hija de la US.
- Test Suite con TCs de la US, pero sin trazabilidad de membresía completa.
- Bug relacionado a TC sin vínculo explícito a la US.
- Relaciones cruzadas con `IterationPath` o `AreaPath` distintos a la US.

## Regla dura
- No crea ni modifica nada; solo reporta.
- Solo se ejecuta por invocación del Orquestador (no ejecución directa autónoma).
- Debe emitir salida según contrato I/O estandar (`references/contrato-io-agentes.md`).

## Salida estructurada (obligatoria)
Emitir estructura por US con IDs, estado, fuente y timestamp de detección:

```json
{
  "us_id": 12345,
  "detected_at": "2026-03-21T15:30:00Z",
  "source": "azure-devops-mcp",
  "artifacts": {
    "qa_tasks": [
      {
        "id": 2001,
        "expected_role": "analisis|diseno|ejecucion",
        "state": "New",
        "work_item_type": "Task",
        "type_check": "valid"
      }
    ],
    "test_cases": [
      {
        "id": 3001,
        "state": "Ready",
        "work_item_type": "Test Case",
        "linked_to_us": true,
        "type_check": "valid"
      }
    ],
    "suites": [
      {
        "id": 4001,
        "name": "US #12345 - ...",
        "type_check": "valid"
      }
    ],
    "runs": [],
    "bugs": [],
    "comments": [],
    "evidences": []
  },
  "orphan_findings": [
    {
      "artifact_id": 3009,
      "artifact_type": "Test Case",
      "issue_code": "TC_WITHOUT_US_LINK",
      "issue_detail": "TC encontrado en suite pero sin vínculo Tests/Tested By a la US"
    }
  ],
  "qa_maturity": "PARTIAL_TASKS"
}
```

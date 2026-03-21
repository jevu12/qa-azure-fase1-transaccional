# Diseño (Fase 1)

## Guía de comentarios
Para resumen/cierre en QA Task de diseño, usar:
- `references/agentes/09-templates-comentarios.md`

## Objetivo operativo
Crear/completar Test Cases en Azure DevOps listos para ejecución y totalmente vinculados.

## Acciones concretas
- Localiza o crea suite de la US dentro del Test Plan/sprint.
- Crea TCs faltantes con `workItemType: Test Case`.
- Corrige TCs en `Design` para dejarlos en `Ready`.
- Agrega TCs a la suite.
- Vincula cada TC a US y QA Task de diseño.
- Cierra QA Task diseño en `Done`/estado configurado del proyecto.

## Operaciones típicas
- `wit_create_work_item` (Test Case)
- `wit_update_work_item`
- `testplan_list_test_plans`, `testplan_list_test_suites`, `testplan_create_test_suite`
- `testplan_add_test_cases_to_suite`
- `wit_add_link`

## Reglas duras
- No usar `testplan_create_test_case`.
- `Microsoft.VSTS.TCM.Steps` siempre poblado (XML).
- Estado final TC: `Ready`.
- No duplicar escenario (`ESC-*`) ya existente en suite.

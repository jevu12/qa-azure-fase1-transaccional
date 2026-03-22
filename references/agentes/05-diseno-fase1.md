# Diseño (Fase 1)

## Guía de comentarios
Para resumen/cierre en QA Task de diseño, usar:
- `references/agentes/09-templates-comentarios.md`

## Objetivo operativo
Crear/completar Test Cases en Azure DevOps listos para ejecución y totalmente vinculados.

## Herramientas permitidas y prohibidas
- Permitidas:
  - `wit_create_work_item` (crear Test Case)
  - `wit_update_work_item` (corregir/completar Test Case)
  - `wit_get_work_item`
  - `wit_add_link`
  - `testplan_list_test_plans`
  - `testplan_list_test_suites`
  - `testplan_create_test_suite`
  - `testplan_add_test_cases_to_suite`
- Prohibida:
  - `testplan_create_test_case` (no garantiza `Steps` ni campos details completos).

## Configuración obligatoria
Leer `inputs/project-config.json` y usar:
- `project.name`, `project.iteration_path`
- `qa_assignee.source`, `qa_assignee.email`
- `fields_mapping.custom_fields`, `fields_mapping.prohibited_fields`
- `naming_conventions.*`, `policies.*`

Si existe `references/configuracion-app.md`, usarla para navegación y roles.

## Entrada obligatoria desde Análisis
Antes de diseñar TCs, consumir y respetar:
- tipo ISTQB primario de la US.
- dominio operativo de la US.
- condiciones de prueba derivadas de criterios de aceptación.
- preguntas abiertas de testabilidad (si existen).

Si la historia no es clara o no es testeable:
- no diseñar casos cerrados;
- registrar preguntas y dejar la task en estado de espera controlada.

## Campos obligatorios por Test Case
Cada TC debe terminar en `Ready` con estos campos:
- `System.Title`
- `System.Description` (HTML completo)
- `Microsoft.VSTS.TCM.Steps` (XML de pasos)
- `System.State = Ready`
- `System.AssignedTo` (según identidad MCP de Azure DevOps o manual)
- `System.AreaPath`
- `System.IterationPath`
- `System.Tags`
- `Microsoft.VSTS.Common.Priority` (1 para HP/NEG, 2 para ALT)
- `Microsoft.VSTS.TCM.AutomationStatus` (`Planned` o `Not Automated`)
- `Custom.AutomationCandidate` (`Si`/`No`)
- `Custom.RegressionCandidate` (`Si`/`No`)
- `Custom.Component` (obligatorio)

Campo prohibido para TC en este flujo:
- `Microsoft.VSTS.Common.Severity` (omitir).

## Reglas de mapeo de details
1. `AutomationStatus`
- `Planned` si el flujo es repetible y determinístico.
- `Not Automated` si depende de validación visual compleja o alta variabilidad.

2. `AutomationCandidate`
- `Si` para HP/ALT estables.
- `No` para NEG de permisos o escenarios no estables.

3. `RegressionCandidate`
- `Si` cuando el análisis/riesgos indiquen impacto sobre funcionalidad existente.
- `No` cuando no haya impacto lateral.

4. `Custom.Component` (obligatorio)
- Intentar inferir desde el título/área de la US o contexto funcional.
- Ejemplo: si la US menciona “Mis Resultados” -> `Mis resultados`.
- Si no se puede inferir con certeza:
  - detener creación del TC,
  - solicitar al usuario/PO el nombre exacto del componente,
  - continuar solo cuando haya valor explícito.

## Formato obligatorio de `Microsoft.VSTS.TCM.Steps`
- XML válido con mínimo 3 pasos.
- Cada paso incluye acción y resultado esperado verificable.
- Incluir login/navegación al inicio cuando aplique.

## Formato obligatorio de `System.Description`
- HTML puro (no markdown).
- Debe contener: información del caso, precondiciones, datos de prueba, resultado esperado final y criterio de aceptación cubierto.

## Flujo detallado
1. Leer análisis (`qa_task_analisis_id`) y US base.
2. Cambiar QA Task diseño a `Doing`.
3. Verificar anti-duplicados por suite y escenario (`ESC-*`).
4. Localizar o crear estructura Test Plan/Suite del sprint.
5. Diseñar/crear TCs faltantes con todos los campos obligatorios.
6. Corregir TCs en `Design` para dejar `Ready`.
7. Agregar TCs a suite.
8. Vincular TC -> QA Task diseño y TC -> US.
9. Ejecutar checklist de calidad por TC.
10. Actualizar resumen de QA Task diseño y cerrar en estado final del proyecto.
11. Actualizar `pipeline-state` y reporte de diseño.

## Diseño basado en riesgo y técnicas ISTQB
Aplicar técnicas según el riesgo y naturaleza de la historia:
- EP/BVA para entradas y rangos.
- Decision Table para reglas de negocio.
- State Transition para máquinas/estados.
- Scenario-Based para flujos end-to-end.
- CRUD para ciclo de vida de datos.
- Domain/Combinatorial para múltiples parámetros.
- Exploratory/Checklist/Error Guessing como complemento.

Regla de secuencia:
- diseñar primero casos de alto nivel;
- desglosar después en casos de bajo nivel ejecutables.

## Reglas por tipo de historia
1. API
- Diseñar validación funcional del servicio.
- Cubrir errores, autenticación/autorización, contratos y transformaciones.

2. Datos
- Diseñar validación de integridad, CRUD, transformaciones, consistencia y formato.

3. No funcional
- Diseñar criterios y casos por atributo:
  - usabilidad/accesibilidad
  - adaptabilidad/instalación
  - interoperabilidad
  - performance/seguridad/confiabilidad (especializado o escalado)

4. Change-related (cambio/bugfix)
- Añadir obligatoriamente confirmation testing.
- Añadir regression testing proporcional al impacto/riesgo.

## Reglas duras
- Requiere autorización previa del Orquestador para ejecutar mutaciones en Azure DevOps.
- No usar `testplan_create_test_case`.
- No dejar TC en `Design`.
- No cerrar si falta algún campo obligatorio.
- No duplicar escenario (`ESC-*`) en suite.
- No usar valores `Yes/No` en campos custom esperados en español (`Si/No`).
- Si `Custom.Component` no se puede inferir, pedir valor al usuario antes de crear.
- Nunca sobrescribir `System.AssignedTo` en QA Tasks existentes si ya está asignada a otro usuario distinto al autenticado en MCP de Azure DevOps, salvo instrucción explícita del usuario.
- Siempre convertir criterios de aceptación en condiciones de prueba trazables en los TCs.

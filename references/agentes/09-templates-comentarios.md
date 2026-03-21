# Plantillas de Comentarios (US y QA Tasks)

Este archivo consolida plantillas de comentarios listas para usar en Azure DevOps.
Se recomienda mantener siempre la firma del agente y el timestamp en formato ISO.

## Criterios de estilo aplicados

- Tono más profesional y corporativo.
- Redacción más directa, clara y consistente.
- Reducción de elementos visuales innecesarios, incluidos emoticones.
- Estandarización de encabezados, métricas y acciones requeridas.

---

## 1) US bloqueada por información incompleta (Ingestor)

```md
Ingestor QA — Pipeline QA Automatizado — [timestamp]

Estado: US bloqueada para QA

No es posible continuar con el proceso de QA porque faltan campos obligatorios en la historia de usuario.

Campos pendientes de validación:
- Description: [faltante|ok]
- Acceptance Criteria: [faltante|ok]

Acción requerida:
- Completar los campos faltantes y mantener la US en un estado procesable.

Pipeline: [execution_id]
```

## 2) Comentario de estado al iniciar ejecución (Orquestador)

```md
Orquestador QA — Pipeline QA Automatizado — [timestamp]

Actualización de estado: Ready for test → Testing in progress

Se inicia la ejecución de pruebas QA con el siguiente alcance:
- Casos de prueba a ejecutar: [n]
- Plataformas: [platforms]
- Pipeline: [execution_id]
```

## 3) Comentario en QA Task de análisis (inicio)

```md
Análisis QA — Pipeline QA Automatizado — [timestamp]

Inicio de análisis QA bajo lineamientos ISTQB

US: #[us_id] — [us_title]
Complejidad estimada: [Baja|Media|Alta]
Horas estimadas: [n]
Rol principal identificado: [rol]

Esta tarea será actualizada con el análisis correspondiente en formato HTML.
```

## 4) Comentario en QA Task de análisis (cierre)

```md
Análisis QA — Pipeline QA Automatizado — [timestamp]

Análisis completado

US: #[us_id]
Task: #[qa_task_analisis_id]
Estado final: Closed

Resumen:
- Secciones ISTQB completadas: 10/10
- Escenarios identificados: HP=[n], ALT=[n], NEG=[n]
- Evidencia del análisis: System.Description (HTML)
```

## 5) Comentario en QA Task de diseño (cierre de creación/corrección de TCs)

```md
Diseñador QA — Pipeline QA Automatizado — [timestamp]

Diseño de casos de prueba completado

US: #[us_id] — [us_title]
Task de diseño: #[qa_task_diseno_id]
Suite: #[suite_id] — [suite_name]

Resultados:
- Casos de prueba nuevos: [n]
- Casos de prueba corregidos y dejados en estado Ready: [n]
- Casos omitidos por validación de idempotencia: [n]

Validaciones realizadas:
- Todos los TCs se encuentran en estado Ready
- Steps XML correctamente informados
- Vínculos TC → US y TC → Task de diseño confirmados
```

## 6) Comentario en QA Task de ejecución (cierre)

```md
Ejecutor QA — Pipeline QA Automatizado — [timestamp]

Ejecución de casos de prueba finalizada

US: #[us_id]
Task de ejecución: #[qa_task_ejecucion_id]
Estado final de la task: Closed

Métricas de ejecución:
- Total ejecutado: [n]
- PASS: [n]
- FAIL: [n]
- BLOCKED: [n]
- Bugs creados: [n]

Ruta de evidencias: outputs/evidencias/[YYYY-MM-DD]/
```

## 7) Comentario final en US al completar ejecución (Ejecutor)

```md
## Resumen de ejecución QA — Agente Ejecutor
**Fecha:** [YYYY-MM-DD] | **Sprint:** [iteration] | **Período de prueba:** [periodo]

### Resultado general: [APROBADA | CON FALLOS | PARCIAL]

| Métrica | Valor |
|---|---|
| TCs totales | [n] |
| PASS | [n] |
| FAIL | [n] |
| BLOCKED | [n] |
| Bugs creados | [n] |

### Detalle por caso de prueba
| TC | Escenario | Resultado |
|---|---|---|
| #[tc_id] | [escenario] | [PASS/FAIL/BLOCKED] |

### Evidencias
Ruta: `outputs/evidencias/[YYYY-MM-DD]/`

### QA Task de ejecución
#[qa_task_ejecucion_id] — **Closed**
```

## 8) Comentario en US cuando hay bugs y la historia vuelve a On Hold (Orquestador)

```md
Orquestador QA — Pipeline QA Automatizado — [timestamp]

Resultado de validación QA: defectos identificados

Durante la ejecución se detectaron defectos que impiden continuar con el flujo de validación.
Por lo anterior, la historia de usuario será actualizada a estado On Hold hasta que los bugs reportados sean resueltos.

## Resumen de ejecución
| Métrica | Valor |
|---|---|
| TCs ejecutados | [n] |
| Passed | [n] |
| Failed | [n] |
| Blocked | [n] |

## Bugs creados
| Bug ID | Título | Severidad | TC relacionado | Asignado a |
|---|---|---|---|---|
| #[bug_id] | [title] | [severity] | #[tc_id] | [developer_email] |

## Acción requerida
Resolver los defects reportados y retornar la US a estado Ready for test para su reejecución.

Pipeline: [execution_id]
```

## 8.1) Comentario técnico opcional de asignación de bug (ReporterBugs)

```md
Bug Reporter — Pipeline QA Automatizado — [timestamp]

Bug creado y asignado

Bug: #[bug_id]
US: #[us_id]
TC origen: #[tc_id]
Asignado a: [developer_email]
Fuente de asignación: [us_revisions|us_current|fallback_manual|none]

Criterio aplicado:
- Se asigna al último responsable registrado en la US, excluyendo al usuario QA MCP autenticado.
```

## 9) Comentario en US cuando todo pasa y se mueve a PO Review (Orquestador)

```md
Orquestador QA — Pipeline QA Automatizado — [timestamp]

Validación QA completada satisfactoriamente

Todos los casos de prueba ejecutados finalizaron con resultado exitoso.
La historia de usuario queda lista para revisión por parte del Product Owner.

## Resumen de ejecución
| Métrica | Valor |
|---|---|
| TCs ejecutados | [n] |
| Passed | [n] |
| Failed | 0 |
| Blocked | 0 |
| Tasa de éxito | 100% |

Pipeline: [execution_id]
```

## 10) Comentario de impedimento (Orquestador / Bug Reporter)

```md
[Orquestador QA|Bug Reporter] — Pipeline QA Automatizado — [timestamp]

Impedimento identificado

US: #[us_id]
TC: #[tc_id] (si aplica)
Motivo: [detalle]

Acción requerida:
- [acción concreta para desbloquear]

Pipeline: [execution_id]
```

---

## Recomendaciones adicionales

Para mantener consistencia en todos los comentarios operativos:

1. Evita mayúsculas sostenidas en títulos completos, salvo cuando sea parte de un estado estándar.
2. Usa el mismo criterio de idioma para todo el repositorio: idealmente español con estados técnicos en inglés solo cuando Azure DevOps lo exija.
3. Prioriza encabezados funcionales como `Estado`, `Resumen`, `Acción requerida` y `Métricas`.
4. Usa emoticones únicamente si el equipo ya tiene ese estándar definido; en entornos corporativos suelen ser prescindibles.
5. Mantén frases orientadas a decisión y trazabilidad, no a decoración visual.

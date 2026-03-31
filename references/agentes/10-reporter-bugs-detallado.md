# ReporterBugs Detallado (Portable)

Esta guía conserva el comportamiento operativo completo para reportar bugs con calidad y trazabilidad.

## Guía de comentarios
Para comentarios de hallazgos, impedimentos y notificaciones de bug asignado, usar:
- `references/agentes/09-templates-comentarios.md`

## Input esperado
- `execution_outcomes` (contrato `ExecutionOutcome`).
- `us_context` (contrato `StoryContext`).
- `project_config` (`project`, `policies`, `naming_conventions`, `qa_assignee`).

## Proceso completo

### 0) Cargar configuración
Leer:
- `project.name`, `project.area_path`, `project.iteration_path`
- `policies.bug_confidence_threshold`, `policies.auto_create_bugs`
- `policies.bug_confidence_by_classification` (configurable por equipo)
- `policies.bug_severity_priority_matrix` (configurable por equipo)
- `policies.bug_required_fields_by_type` (campos obligatorios por tipo de bug)
- `naming_conventions.bug_title`
- `qa_assignee.source`, `qa_assignee.email`

### 1) Filtrar resultados
- Candidatos a bug: `FAIL`
- Candidatos a impedimento: `BLOCKED`
- Excluir: `PASS`, `NOT_EXECUTED`

### 2) Deduplicación previa
Buscar bugs abiertos equivalentes por `tc_id` + US + fallo similar.

Ejemplo de WIQL:
```sql
SELECT [System.Id], [System.Title], [System.State]
FROM WorkItems
WHERE [System.WorkItemType] = 'Bug'
  AND [System.TeamProject] = '[project.name]'
  AND [System.IterationPath] UNDER '[project.iteration_path]'
  AND [System.State] <> 'Closed'
  AND [System.Title] CONTAINS '[tc_id]'
```

Si hay equivalencia funcional: `SKIP` por duplicado.

### 3) Clasificar confianza
Regla:
- Usar valores desde `policies.bug_confidence_by_classification` en `project-config.json`.
- Si falta una clasificación, aplicar fallback conservador `0.4` y registrar advertencia.
- `confidence >= threshold` -> crear bug
- `confidence < threshold` -> comentar hallazgo en US, sin crear bug

Ejemplo esperado en `project-config.json`:
```json
{
  "policies": {
    "bug_confidence_by_classification": {
      "bug_funcional": 0.9,
      "bug_visual": 0.8,
      "bug_performance": 0.7,
      "flaky_test": 0.3,
      "ambiente_problem": 0.2,
      "data_problem": 0.4,
      "automation_error": 0.1,
      "blocked_by_dependency": 0.5
    }
  }
}
```

### 4) Resolver asignación del bug (obligatorio)
Objetivo: asignar al desarrollador y no al usuario autenticado en el MCP de Azure DevOps, salvo ausencia total de candidato.

Algoritmo:
1. Obtener usuario autenticado en el MCP de Azure DevOps.
2. Leer revisiones de la US y extraer último `System.AssignedTo` no vacío y distinto del usuario autenticado en el MCP de Azure DevOps.
3. Si existe, usarlo como `bug_assignee` (`assignee_source=us_revisions`).
4. Si no existe, usar `System.AssignedTo` actual de la US si es distinto (`assignee_source=us_current`).
5. Si no existe, fallback `qa_assignee.email` si es distinto (`assignee_source=fallback_manual`).
6. Si no hay candidato válido, crear bug sin `System.AssignedTo` y registrar advertencia (`assignee_source=none`).

### 5) Crear bug
Campos mínimos:
- `System.Title` (desde `naming_conventions.bug_title`)
- `Microsoft.VSTS.TCM.ReproSteps` (HTML)
- `System.AreaPath`, `System.IterationPath`
- `System.Tags` (`QA, Auto-detected`)
- `Microsoft.VSTS.Common.Severity`
- `Microsoft.VSTS.Common.Priority`
- `System.AssignedTo` (si `bug_assignee` resuelto)

Validación obligatoria por tipo de bug:
- Antes de crear, validar `policies.bug_required_fields_by_type`.
- Si falta un campo requerido para el tipo detectado:
  - no crear bug automático,
  - registrar `BLOCK` con `reason_code = CONTRACT_VALIDATION_FAILED`,
  - comentar en US campos faltantes.

### 6) Vincular bug
- Bug -> US (`System.LinkTypes.Hierarchy-Reverse` - Child/Parent-Child como hijo)
- Bug -> TC (`Microsoft.VSTS.Common.TestedBy-Reverse`)

### 7) Hallazgos bajo umbral
Comentar en US con firma de agente:
- tc_id, paso fallido, clasificación, confianza, umbral
- razón de no creación automática

### 8) Impedimentos BLOCKED
Comentar en US:
- motivo de bloqueo
- acción requerida para desbloquear

### 9) Persistir trazabilidad en pipeline-state
Registrar:
- `bugs_created[]` con `bug_id`, `tc_id`, `us_id`, `severity`, `confidence`, `bug_assignee`, `assignee_source`
- `bugs_skipped[]`
- `impediments_registered[]`

## Regla de reabrir vs crear nuevo (obligatoria)
- Reabrir bug existente cuando hay equivalencia funcional y bug previo `Resolved|Closed`.
- Crear nuevo bug cuando el síntoma/causa es materialmente diferente o no hay trazabilidad suficiente.
- Registrar decisión con `reason_code` explícito (`ALREADY_EXISTS_EQUIVALENT` o causa de bug nuevo).

## Criterio mínimo de enriquecimiento del bug (obligatorio)
No crear bug si no incluye, como mínimo:
- `failed_step` (paso exacto),
- `evidence_file` o referencia directa a evidencia,
- `expected_behavior`,
- `actual_behavior`.

Si falta cualquiera:
- registrar `BLOCK`/`SKIP` según política,
- solicitar datos faltantes,
- no crear bug automático.

## Template recomendado de ReproSteps (HTML)
```html
<h2>Contexto</h2>
<table>
  <tr><td><strong>User Story</strong></td><td>#[us_id] — [us_title]</td></tr>
  <tr><td><strong>Test Case</strong></td><td>#[tc_id] — [tc_title]</td></tr>
  <tr><td><strong>Escenario</strong></td><td>[scenario_id]</td></tr>
  <tr><td><strong>Ambiente</strong></td><td>[environment]</td></tr>
  <tr><td><strong>Plataforma</strong></td><td>[platform]</td></tr>
  <tr><td><strong>Fecha</strong></td><td>[executed_at]</td></tr>
</table>

<h2>Pasos de reproducción</h2>
<ol>
  <li>[Paso 1]</li>
  <li>[Paso 2]</li>
  <li><strong>PASO FALLIDO [N]:</strong> [acción fallida]</li>
</ol>

<h2>Resultado esperado</h2>
<p>[expected_behavior]</p>

<h2>Resultado actual</h2>
<p>[actual_behavior]</p>

<h2>Evidencia</h2>
<p>[screenshots/videos/trace]</p>

<h2>Clasificación</h2>
<p>Tipo: [classification] | Confianza: [confidence]%</p>
```

## Reglas estrictas
- Requiere autorización previa del Orquestador para ejecutar mutaciones en Azure DevOps.
- Aplicar contrato I/O estandar (`references/contrato-io-agentes.md`) y codigos de decision (`references/codigos-decision.md`).
- Verificar duplicados antes de crear.
- Nunca crear bug bajo umbral.
- Vincular siempre a US y TC.
- Nunca cerrar bug automáticamente.
- Incluir firma de agente en comentarios.
- Registrar decisión completa en `pipeline-state`.

# Guía de Configuración General (Multiempresa)

Esta guía define **dónde configurar** y **qué configurar** para usar la skill en cualquier organización/proyecto.

## 1) Dónde configurar

1. `inputs/project-config.json`
- Configuración principal del pipeline (organización, proyecto, sprint, políticas, nombres, estados).

2. `.env`
- Variables de entorno de URLs y credenciales por rol (sin subir secretos al repositorio).

3. `references/configuracion-app.md` (opcional)
- Documentación funcional de navegación/roles de la app bajo prueba para mejorar diseño/ejecución.

## 2) Qué configurar en `project-config.json`

### 2.1 Conectividad y contexto
- `organization.name`, `organization.url`
- `project.name`, `project.team`, `project.iteration_path`, `project.area_path`

### 2.2 Asignación QA
- `auth.mode`: `auto` (recomendado), `interactive` o `pat`
- `auth.pat_env`: variable de entorno del PAT (`AZURE_DEVOPS_EXT_PAT`)
- `identity.source`: `mcp_authenticated_user` (recomendado)
- `qa_assignee.source`: `mcp_authenticated_user` (recomendado) o `manual`
- `qa_assignee.email`, `qa_assignee.name` (si `manual`)

Compatibilidad:
- `identity.source` define la identidad operativa transversal.
- `qa_assignee.*` se mantiene para compatibilidad con configuraciones anteriores.

### 2.3 Ejecución
- `execution.mode`: `full-pipeline`, `analysis-only`, `design-only`, `execution-only`, `detection-only`
- `execution.publish_to_execute`: habilita publicación de resultados al flujo `execute_and_publish`
- `execution.resolve_context_from_story`: obliga resolver `planId/suiteId/testCaseIds` desde la US antes de publicar
- `execution.user_stories`: IDs específicos o vacío para todo el sprint
- `execution.exclude_technical_keywords`

### 2.4 Plataformas y roles
- `platforms.types` y configuración `web/android/ios/api`
- `roles[]`: nombre del rol + variables de entorno de usuario/contraseña

### 2.5 Políticas
- Tipo de QA Task, tag QA, escenarios mínimos
- `bug_confidence_threshold`, reintentos
- estados procesables/bloqueados y transiciones

Parámetros recomendados adicionales:
- `bug_confidence_by_classification` (confianza configurable por tipo de hallazgo)
- `bug_severity_priority_matrix` (homogeneidad severidad/prioridad)
- `bug_required_fields_by_type` (validación por proceso ADO)
- `flaky_retry_max_attempts`, `step_retry_max_attempts`
- `step_timeout_seconds`, `test_case_timeout_seconds`
- `evidence_masking.*` (patrones/selectores de enmascaramiento)
- `evidence_retention_sprints` (retención por sprint)
- `coverage_min_by_risk` (mínimos HP/ALT/NEG por riesgo)

### 2.6 Convenciones y campos
- `naming_conventions.*` para títulos/suites/bugs/evidencias
- `naming_conventions.scenario_id_pattern` para estandarizar deduplicación de escenarios
- `naming_conventions.evidence_base_dir`: base por evidencia segmentada `sprint/US/TC`
- `naming_conventions.evidence_step_filename`: naming canónico por paso
- `naming_conventions.evidence_result_filename`: naming canónico de resultado
- `fields_mapping.*` para custom fields y campos prohibidos

## 3) Qué configurar en `.env`

Variables sugeridas mínimas:
- `APP_BASE_URL`, `APP_LOGIN_URL`
- `USER_<ROL>`, `PASS_<ROL>` para cada rol definido en `project-config.json`
- `AZURE_DEVOPS_EXT_PAT` (solo si `auth.mode=pat` o `auto` con PAT)

Regla:
- nunca guardar credenciales reales en la skill o en archivos versionados.

## 4) Checklist de pre-ejecución

- MCP de Azure DevOps conectado.
- Proyecto/sprint existen y son accesibles.
- `project-config.json` válido (usa `templates/project-config.template.json`).
- Variables de entorno cargadas (usa `templates/.env.template`).
- Estados de US mapeados correctamente en políticas.
- Naming conventions y custom fields compatibles con el proyecto.

## 4.1 Verificación obligatoria MCP Azure DevOps (instalación + configuración)

Antes de ejecutar cualquier stage, validar en este orden:

1. Disponibilidad del MCP de Azure DevOps
- Ejecutar una lectura simple: `core_list_projects`.
- Si falla por conexión/autenticación/permisos: bloquear pipeline (`BLOCK`) y no mutar artefactos.

2. Acceso al proyecto configurado
- Verificar que `project.name` de `project-config.json` exista en `core_list_projects`.
- Si no existe o no es visible para el usuario MCP: `BLOCK` con motivo `PROJECT_NOT_ACCESSIBLE`.

3. Acceso a equipo/iteración objetivo
- Validar equipo con `core_list_project_teams(project.name)`.
- Validar iteración objetivo con consulta de work/iteration del proyecto.
- Si no hay acceso a team/sprint: `BLOCK` con motivo `ITERATION_NOT_ACCESSIBLE`.

4. Identidad autenticada utilizable para asignaciones
- Resolver identidad MCP (usuario autenticado) y usarla como referencia para:
  - `qa_assignee.source = mcp_authenticated_user`
  - reglas de ownership de ejecución
  - exclusión de autoasignación de bugs al QA MCP
- Si no se puede resolver identidad: `BLOCK` con motivo `MCP_IDENTITY_UNRESOLVED`.

5. Prueba mínima de lectura de WI
- Ejecutar lectura de una US del sprint (o consulta equivalente de backlog/iteración).
- Si falla, no iniciar creación de tasks/casos ni transiciones de estado.

Regla de seguridad:
- Sin verificación MCP exitosa, la skill solo puede devolver diagnóstico y pasos correctivos.
- No crear/actualizar/comentar/vincular artefactos mientras haya fallas MCP.

## 5) Errores frecuentes y corrección

- Error de estado no procesable:
  - revisar `policies.processable_us_states`, `task_only_states`, `no_action_states`.

- Error en custom fields:
  - corregir `fields_mapping.custom_fields` o mover campo a `prohibited_fields`.

- Duplicados de tasks/TCs:
  - validar naming conventions y relaciones existentes antes de crear.

- Bugs mal asignados:
  - verificar regla de asignación por último responsable distinto al QA MCP.

## 6) Quickstart recomendado

1. Copia `templates/project-config.template.json` a `inputs/project-config.json`.
2. Copia `templates/.env.template` a `.env` y completa valores.
3. Ejecuta la verificación MCP Azure DevOps (sección 4.1).
4. Ejecuta en `detection-only` para validar contexto.
5. Ejecuta `analysis-only` o `design-only` según necesidad.
6. Ejecuta `execution-only` solo si el Orquestador habilita la extensión de compatibilidad (ejecución/bugs/evidencias).
7. Ejecuta `full-pipeline` cuando la configuración esté validada.

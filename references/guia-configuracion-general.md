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
- `qa_assignee.source`: `mcp_authenticated_user` (recomendado) o `manual`
- `qa_assignee.email`, `qa_assignee.name` (si `manual`)

### 2.3 Ejecución
- `execution.mode`: `full-pipeline`, `analysis-only`, `design-only`, `execution-only`, `detection-only`
- `execution.user_stories`: IDs específicos o vacío para todo el sprint
- `execution.exclude_technical_keywords`

### 2.4 Plataformas y roles
- `platforms.types` y configuración `web/android/ios/api`
- `roles[]`: nombre del rol + variables de entorno de usuario/contraseña

### 2.5 Políticas
- Tipo de QA Task, tag QA, escenarios mínimos
- `bug_confidence_threshold`, reintentos
- estados procesables/bloqueados y transiciones

### 2.6 Convenciones y campos
- `naming_conventions.*` para títulos/suites/bugs/evidencias
- `fields_mapping.*` para custom fields y campos prohibidos

## 3) Qué configurar en `.env`

Variables sugeridas mínimas:
- `APP_BASE_URL`, `APP_LOGIN_URL`
- `USER_<ROL>`, `PASS_<ROL>` para cada rol definido en `project-config.json`

Regla:
- nunca guardar credenciales reales en la skill o en archivos versionados.

## 4) Checklist de pre-ejecución

- MCP de Azure DevOps conectado.
- Proyecto/sprint existen y son accesibles.
- `project-config.json` válido (usa `templates/project-config.template.json`).
- Variables de entorno cargadas (usa `templates/.env.template`).
- Estados de US mapeados correctamente en políticas.
- Naming conventions y custom fields compatibles con el proyecto.

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
3. Ejecuta en `detection-only` para validar contexto.
4. Ejecuta `analysis-only` o `design-only` según necesidad.
5. Ejecuta `full-pipeline` cuando la configuración esté validada.

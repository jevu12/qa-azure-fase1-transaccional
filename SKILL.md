---
name: qa-azure-fase1-transaccional
description: Ejecuta la Fase 1 transaccional de QA en Azure DevOps (detección, creación idempotente de QA Tasks, Test Plan/Suite/Test Cases y vínculos), con trazabilidad en decisions_log y respeto estricto de estados permitidos. Úsala cuando se necesite eliminar trabajo manual en Azure DevOps sin incluir generación de código/PR/Appium.
---

# Skill: QA Azure Fase 1 Transaccional

## Cuándo usar esta skill
Usa esta skill cuando el usuario pida operar QA directamente en Azure DevOps para:
- detectar artefactos existentes por User Story,
- crear solo artefactos faltantes (QA Tasks, suite, casos),
- enlazar US <-> Task <-> Test Case,
- dejar trazabilidad auditable de decisiones.

No uses esta skill para generación de código, PR automation, Appium o clasificación avanzada de fallos (Fases 2-4).

## Entradas esperadas
- `project` (nombre del proyecto ADO)
- `iteration_path` (sprint completo)
- `mode` (`full-pipeline`, `analysis-only`, `design-only`, `execution-only`, `detection-only`)
- `user_stories` opcional (lista de IDs; vacío = todas del sprint)
- Para flujo de ejecución/publicación (compat): contrato por historia con `project`, `userStoryId`, `executionDate`, `results[]`, `metadata`.

Fuente de configuración obligatoria: `inputs/project-config.json`.
Guía general de configuración: `references/guia-configuracion-general.md`.
Templates recomendados: `templates/project-config.template.json` y `templates/.env.template`.

## Modos de ejecución unificados
- `full-pipeline`: detección + ingesta + análisis + diseño (+ ejecución/bugs/evidencias solo si hay instrucción explícita de extensión compat).
- `analysis-only`: detección + ingesta + análisis.
- `design-only`: detección + ingesta + diseño.
- `execution-only`: extensión de compatibilidad para ejecución/reporter/evidencias (requiere autorización del Orquestador).
- `detection-only`: solo detección y diagnóstico.

## Proceso obligatorio (orden estricto)
1. Cargar y validar configuración
- Leer `inputs/project-config.json`.
- Validar: `organization.url`, `project.name`, `project.team`, `project.iteration_path`, `execution.mode`.
- Resolver `sprint_full_path` desde `project.iteration_path`.
- Si falta `project-config.json`: bloquear (`CONFIG_INVALID`), salvo `detection-only` con instrucción explícita de fallback a `inputs/us-list.md`.

2. Verificar MCP Azure DevOps (obligatorio)
- Confirmar disponibilidad MCP con lectura simple de proyectos.
- Confirmar acceso a `project.name`, team e iteración objetivo.
- Resolver usuario autenticado MCP para reglas de asignación/ownership.
- Si falla cualquier validación MCP: detener mutaciones y devolver `BLOCK` con diagnóstico.

3. QA Orchestrator Service (obligatorio)
- Consultar estado actual de la User Story.
- Validar si la historia es procesable según las reglas del flujo.
- Verificar tareas QA, casos de prueba, suites, ejecuciones, bugs, comentarios y evidencias existentes.
- Aplicar reglas de idempotencia, deduplicación y gobernanza.
- Decidir si corresponde ejecutar una acción, omitirla o continuar desde un punto previo.
- Seleccionar el agente adecuado y el foco de ejecución.
- Solo después de esta validación, el orquestador puede delegar la ejecución a un agente especializado.

4. Cargar estado compartido
- Activar lock de concurrencia para `outputs/pipeline-state.json`.
- Leer `outputs/pipeline-state.json`.
- Si no existe, inicializar según contrato de `references/contratos.md`.
- Si existe pero es de otro proyecto/sprint, iniciar nueva ejecución.

5. Obtener US objetivo
- Si `execution.user_stories` trae IDs, usar esa lista.
- Si viene vacío, consultar US del sprint en Azure DevOps.

6. Detección por US (siempre antes de crear)
- Leer US completa con relaciones.
- Detectar: QA Tasks hijas, Test Cases vinculados, Suite/Plan relacionados, comentarios QA, evidencias.
- Registrar hallazgos en `stages.deteccion` y `decisions_log`.

7. Validaciones de elegibilidad
- Estado permitido: aplicar reglas de `references/reglas-transiciones.md` y `references/reglas-decision.md`.
- Contenido mínimo: `description` y criterios de aceptación.
- Filtro técnico: `execution.exclude_technical_keywords`.

8. Acciones transaccionales de Fase 1
- Crear QA Tasks faltantes (análisis, diseño, ejecución) como hijas de la US.
- Crear/ubicar Test Plan y Test Suite del sprint.
- Crear Test Cases faltantes.
- Vincular Test Cases a US (Tests/Tested By) y a QA Task de diseño (Related).
- Completar artefactos parciales; nunca recrear artefactos completos.

9. Flujo genérico `execute_and_publish` (obligatorio si aplica ejecución)
- Descubrir contexto por historia (`planId`, `suiteId`, `testCaseIds` desde US/suite).
- Resolver Test Points por `planId + suiteId` y construir mapa `testCaseId -> testPointId/revision/title`.
- Validar cobertura: si falta test point de un TC esperado, bloquear setup (`BLOCKED_SETUP`) y registrar diagnóstico.
- Crear run planificado con `plan.id + pointIds`; guardar `runId`.
- Publicar resultados por lote con `testPointId`, `testCaseId`, `testCaseRevision`, `testCaseTitle`, `outcome`, `state=Completed`, `comment`.
- Cerrar run (`state=Completed`) y registrar trazabilidad en `pipeline-state` (`execute_run_id`, `execute_url`, conteos, `us_ejecutadas[]`) + comentario en QA Task de ejecución.

10. Persistencia y auditoría
- Actualizar `outputs/pipeline-state.json` por etapa.
- Registrar toda decisión en `decisions_log` con motivo, códigos y artefactos afectados.

## Reglas obligatorias
- Idempotencia primero: nunca crear sin detectar antes.
- Anti-duplicado por título/patrón/relación de negocio.
- No operaciones destructivas: no eliminar artefactos existentes.
- No mutaciones sin MCP validado: si la verificación MCP falla, solo diagnóstico (`BLOCK`).
- Ningún agente puede ejecutarse directamente sobre Azure DevOps sin autorización previa del QA Orchestrator Service.
- No ejecutar acciones fuera del estado permitido.
- Si falta información crítica de testabilidad, usar `next_action = WAIT_USER_INPUT` y no mutar hasta resolverla.
- Mantener `AreaPath` e `IterationPath` alineados con la US.
- Nunca usar `assigned_to` fijo ni IDs de usuario hardcodeados; resolver identidad desde usuario autenticado MCP de Azure DevOps.
- Si se usa PAT, debe venir exclusivamente desde variable de entorno `AZURE_DEVOPS_EXT_PAT` (sin hardcodeo ni logging).
- Aplicar contrato I/O estándar por agente (`references/contrato-io-agentes.md`).
- Usar catálogo de códigos de decisión (`references/codigos-decision.md`) en `decisions_log`.
- En creación de bugs: asignar al último usuario asignado de la US que sea distinto al usuario autenticado en el MCP de Azure DevOps; aplicar fallback documentado si no existe candidato.
- Para comentarios automáticos (US, QA Tasks, bugs, impedimentos): usar como estándar `references/agentes/09-templates-comentarios.md`.

Detalles normativos: leer en este orden:
1. `references/guia-configuracion-general.md`
2. `references/configuracion-app.md` (opcional)
3. `references/fase1-arquitectura.md`
4. `references/reglas-decision.md`
5. `references/reglas-idempotencia.md`
6. `references/reglas-transiciones.md`
7. `references/codigos-decision.md`
8. `references/contrato-io-agentes.md`
9. `references/contratos.md`
10. `references/agentes/00-matriz-acciones.md`
11. `references/agentes/01-orquestador-fase1.md`
12. `references/agentes/02-detector-artefactos-fase1.md`
13. `references/agentes/03-ingestor-fase1.md`
14. `references/agentes/04-analisis-fase1.md`
15. `references/agentes/05-diseno-fase1.md`
16. `references/agentes/06-ejecutor-compat.md`
17. `references/agentes/07-reporter-bugs-compat.md`
18. `references/agentes/08-gestor-evidencias-compat.md`
19. `references/agentes/09-templates-comentarios.md`
20. `references/agentes/10-reporter-bugs-detallado.md`
21. `references/agentes/11-execute-and-publish-generico.md`

## Fuera de alcance explícito
- Generación de código de automatización.
- Creación/revisión automática de PR.
- Navegación móvil con Appium.
- Clasificación avanzada de fallos o creación inteligente de bugs multi-causal.

## Formato de salida requerido
Devuelve un resumen auditable y compacto:

```md
# Resumen Fase 1 — QA Azure

## Contexto
- Proyecto: <project>
- Sprint: <iteration_path>
- Modo: <mode>
- US procesadas: <n>

## Resultado por User Story
- US #<id> (<state>): <CREATE|UPDATE|SKIP|BLOCK|ERROR>
- Detectado: <tasks/suite/tcs existentes>
- Acción: <qué se creó o completó>
- Razón: <por qué>
- Artefactos afectados: <IDs>

## Trazabilidad global
- QA Tasks creadas: <n>
- Suites creadas: <n>
- Test Cases creados: <n>
- Vínculos creados: <n>
- US omitidas/bloqueadas: <n>
- Archivo actualizado: outputs/pipeline-state.json
```

## Checklist rápido de calidad
- ¿Se leyó `project-config.json` antes de decidir?
- ¿Se ejecutó detección previa a toda creación?
- ¿Se evitó duplicación por estado y relaciones?
- ¿Se registraron decisiones en `decisions_log`?
- ¿Se respetó el límite de alcance Fase 1?

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
- `mode` (`full-pipeline`, `analysis-only`, `design-only`, `detection-only`)
- `user_stories` opcional (lista de IDs; vacío = todas del sprint)

Fuente de configuración obligatoria: `inputs/project-config.json`.
Guía general de configuración: `references/guia-configuracion-general.md`.
Templates recomendados: `templates/project-config.template.json` y `templates/.env.template`.

## Proceso obligatorio (orden estricto)
1. Cargar y validar configuración
- Leer `inputs/project-config.json`.
- Validar: `organization.url`, `project.name`, `project.team`, `project.iteration_path`, `execution.mode`.
- Resolver `sprint_full_path` desde `project.iteration_path`.

2. Cargar estado compartido
- Leer `outputs/pipeline-state.json`.
- Si no existe, inicializar según contrato de `references/contratos.md`.
- Si existe pero es de otro proyecto/sprint, iniciar nueva ejecución.

3. Obtener US objetivo
- Si `execution.user_stories` trae IDs, usar esa lista.
- Si viene vacío, consultar US del sprint en Azure DevOps.

4. Detección por US (siempre antes de crear)
- Leer US completa con relaciones.
- Detectar: QA Tasks hijas, Test Cases vinculados, Suite/Plan relacionados, comentarios QA, evidencias.
- Registrar hallazgos en `stages.deteccion` y `decisions_log`.

5. Validaciones de elegibilidad
- Estado permitido: aplicar reglas de `references/reglas-transiciones.md` y `references/reglas-decision.md`.
- Contenido mínimo: `description` y criterios de aceptación.
- Filtro técnico: `execution.exclude_technical_keywords`.

6. Acciones transaccionales de Fase 1
- Crear QA Tasks faltantes (análisis, diseño, ejecución) como hijas de la US.
- Crear/ubicar Test Plan y Test Suite del sprint.
- Crear Test Cases faltantes.
- Vincular Test Cases a US (Tests/Tested By) y a QA Task de diseño (Related).
- Completar artefactos parciales; nunca recrear artefactos completos.

7. Persistencia y auditoría
- Actualizar `outputs/pipeline-state.json` por etapa.
- Registrar toda decisión en `decisions_log` con motivo y artefactos afectados.

## Reglas obligatorias
- Idempotencia primero: nunca crear sin detectar antes.
- Anti-duplicado por título/patrón/relación de negocio.
- No operaciones destructivas: no eliminar artefactos existentes.
- No ejecutar acciones fuera del estado permitido.
- Mantener `AreaPath` e `IterationPath` alineados con la US.
- En creación de bugs: asignar al último usuario asignado de la US que sea distinto al usuario autenticado en el MCP de Azure DevOps; aplicar fallback documentado si no existe candidato.
- Para comentarios automáticos (US, QA Tasks, bugs, impedimentos): usar como estándar `references/agentes/09-templates-comentarios.md`.

Detalles normativos: leer en este orden:
1. `references/guia-configuracion-general.md`
2. `references/configuracion-app.md` (opcional)
3. `references/fase1-arquitectura.md`
4. `references/reglas-decision.md`
5. `references/reglas-idempotencia.md`
6. `references/reglas-transiciones.md`
7. `references/contratos.md`
8. `references/agentes/00-matriz-acciones.md`
9. `references/agentes/01-orquestador-fase1.md`
10. `references/agentes/02-detector-artefactos-fase1.md`
11. `references/agentes/03-ingestor-fase1.md`
12. `references/agentes/04-analisis-fase1.md`
13. `references/agentes/05-diseno-fase1.md`
14. `references/agentes/06-ejecutor-compat.md`
15. `references/agentes/07-reporter-bugs-compat.md`
16. `references/agentes/08-gestor-evidencias-compat.md`
17. `references/agentes/09-templates-comentarios.md`
18. `references/agentes/10-reporter-bugs-detallado.md`

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

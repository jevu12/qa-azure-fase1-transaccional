# QA Azure Fase 1 Transaccional

Skill para ejecutar la **Fase 1** del flujo QA en Azure DevOps: detección de artefactos, creación idempotente de QA Tasks/Test Plan/Test Suite/Test Cases, vínculos y trazabilidad.

## Qué hace esta skill
- Lee configuración de `inputs/project-config.json`.
- Detecta artefactos existentes por User Story antes de crear.
- Crea solo faltantes (sin duplicar).
- Vincula US <-> Task <-> Test Case.
- Registra decisiones auditables en `decisions_log` y actualiza `outputs/pipeline-state.json`.
- En bugs (fases de ejecución): resuelve asignación al último responsable de la US distinto al QA autenticado en MCP.

## Alcance
Incluye:
- Operación transaccional en Azure DevOps para análisis/diseño QA.
- Reglas de idempotencia y control por estado.

No incluye:
- Generación de código de automatización.
- PR automation.
- Appium/móvil.
- Funciones avanzadas de Fases 2-4.

## Archivos principales
- `SKILL.md`: flujo operativo de la skill.
- `references/guia-configuracion-general.md`: guía multiempresa de dónde y qué configurar.
- `references/configuracion-app.md`: plantilla opcional de contexto funcional de la app.
- `references/fase1-arquitectura.md`: marco funcional Fase 1.
- `references/reglas-decision.md`: reglas de decisión.
- `references/reglas-idempotencia.md`: anti-duplicado/idempotencia.
- `references/reglas-transiciones.md`: control por estado.
- `references/contratos.md`: contratos y compatibilidad.
- `references/contracts/*.json`: contratos embebidos (portables).
- `references/agentes/*.md`: catálogo operativo por agente (crear task, comentar, vincular, actualizar).
- `references/agentes/09-templates-comentarios.md`: ejemplos listos de comentarios para US y QA Tasks.
- `references/agentes/10-reporter-bugs-detallado.md`: flujo detallado y template completo para creación de bugs.
- `templates/project-config.template.json`: template neutral para iniciar configuración.
- `templates/.env.template`: template de variables de entorno.
- `agents/openai.yaml`: metadata de interfaz.

## Requisitos
- Acceso a Azure DevOps vía MCP.
- Configuración válida en `inputs/project-config.json`.
- Permisos para leer/escribir Work Items, Test Plans, Test Suites y Test Cases.

## Instalación desde GitHub
```bash
git clone https://github.com/jevu12/qa-azure-fase1-transaccional.git
mkdir -p ~/.codex/skills/qa-azure-fase1-transaccional
cp -R qa-azure-fase1-transaccional/. ~/.codex/skills/qa-azure-fase1-transaccional/
```

Verificación rápida:
```bash
ls ~/.codex/skills/qa-azure-fase1-transaccional
```

## Cómo usarla
1. Sigue `references/guia-configuracion-general.md`.
2. Copia `templates/project-config.template.json` a `inputs/project-config.json` y ajusta valores.
3. Copia `templates/.env.template` a `.env` y completa URLs/credenciales.
4. Invoca la skill por nombre: `$qa-azure-fase1-transaccional`.
5. Pide la operación para el sprint completo o una lista de US.
6. Revisa el resumen de salida por US (CREATE/UPDATE/SKIP/BLOCK/ERROR).

## Prompt recomendado (mejor inicio)
```text
Usa $qa-azure-fase1-transaccional para ejecutar Fase 1 en Azure DevOps.
Toma la configuración desde inputs/project-config.json, procesa el sprint actual en modo full-pipeline,
no dupliques artefactos y entrega un resumen auditable por US con acciones CREATE/UPDATE/SKIP/BLOCK/ERROR.
```

## Buenas prácticas
- Ejecuta primero en `detection-only` si quieres validar estado inicial.
- Usa `analysis-only` o `design-only` para corridas acotadas.
- Si hay interrupciones, retoma desde `pipeline-state.json`.

# Análisis (Fase 1)

## Guía de comentarios
Para comentarios de inicio/cierre de análisis en QA Task, usar:
- `references/agentes/09-templates-comentarios.md`

## Objetivo operativo
Completar la QA Task de análisis con contenido ISTQB y cerrarla correctamente.

## Acciones concretas
- Toma QA Task de análisis existente (si falta, fallback de creación controlada).
- Mueve task a `Doing`.
- Publica análisis en `System.Description` con `format: Html`.
- Verifica contenido y cierra en `Closed`.
- Actualiza `stages.analisis` y reporte.

## Operaciones típicas
- `wit_get_work_item`
- `wit_update_work_item` (estado/estimación/description)

## Clasificación obligatoria de la historia (2 capas)
Para cada US, clasificar explícitamente antes de diseñar:

1. Tipo ISTQB primario:
- funcional
- no funcional
- white-box
- change-related (confirmation/regression)

2. Dominio operativo:
- UI
- API
- datos
- integración
- usabilidad
- compatibilidad
- adaptabilidad
- instalación
- accesibilidad
- seguridad
- performance

## Proceso obligatorio de análisis
- Siempre iniciar con revisión estática de la historia y de los criterios de aceptación.
- Si la historia no es clara o no es testeable, generar preguntas y no diseñar casos cerrados.
- Convertir criterios de aceptación en condiciones de prueba verificables.
- Diseñar primero casos de alto nivel y luego de bajo nivel.
- Garantizar calidad del caso: corrección, factibilidad, necesidad, comprensibilidad, trazabilidad y consistencia.

## Salida mínima del análisis (handoff a Diseño)
- clasificación ISTQB primaria.
- dominio operativo principal y secundarios (si aplica).
- condiciones de prueba derivadas de criterios de aceptación.
- riesgos clave y técnica ISTQB recomendada por riesgo.
- lista de preguntas abiertas (si la historia no es testeable aún).

## Reglas duras
- Requiere autorización previa del Orquestador para ejecutar mutaciones en Azure DevOps.
- No dejar contenido genérico ni placeholders.
- No cerrar sin verificar descripción guardada.
- Nunca sobrescribir `System.AssignedTo` en QA Tasks existentes si ya está asignada a otro usuario distinto al autenticado en MCP de Azure DevOps, salvo instrucción explícita del usuario.
- Si hay ambigüedad o falta de testabilidad, bloquear cierre y dejar preguntas explícitas.
- Mantener trazabilidad en pipeline-state.

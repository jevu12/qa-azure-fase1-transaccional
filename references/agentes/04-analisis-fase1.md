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
Debe publicarse con plantilla fija y numerada para todas las US:

1. Identificación de la US.
2. Clasificación ISTQB primaria.
3. Dominio operativo (principal/secundario).
4. Criterios de aceptación normalizados.
5. Condiciones de prueba derivadas.
6. Riesgos y técnica ISTQB recomendada.
7. Lista de preguntas (abiertas/cerradas) con estado y dueño.
8. Cobertura preliminar esperada (HP/ALT/NEG).
9. Resultado del checklist de cierre.

## Plantilla fija obligatoria (estructura)
```md
1. Identificación
- us_id:
- us_title:
- qa_task_analisis_id:

2. Clasificación
- istqb_primary:
- dominio_operativo_principal:
- dominio_operativo_secundario:

3. Criterios de aceptación normalizados
- AC-01:
- AC-02:

4. Condiciones de prueba
- CP-01 (traza AC-01):
- CP-02 (traza AC-02):

5. Riesgos y técnicas
- Riesgo R1: [impacto/probabilidad] -> [EP/BVA|Decision Table|State Transition|...]

6. Preguntas de análisis
- Q-01 | estado: abierta|cerrada | owner: PO|QA|Dev | detalle:
- Q-02 | estado: abierta|cerrada | owner: PO|QA|Dev | detalle:

7. Cobertura preliminar
- HP:
- ALT:
- NEG:

8. Checklist de cierre
- [ ] 100% AC convertidos a condiciones de prueba.
- [ ] Todas las preguntas críticas cerradas o justificadas.
- [ ] Trazabilidad AC -> condición explícita.
- [ ] Riesgos principales mapeados a técnica.
```

## Criterio de preguntas abiertas/cerradas
- `abierta`: bloquea cierre si afecta testabilidad o definición del caso.
- `cerrada`: tiene respuesta verificable y owner asignado.
- Toda pregunta debe tener `owner` (`PO|QA|Dev`) y fecha/estado de resolución.

## Regla de cierre verificable (obligatoria)
No cerrar la task de análisis si no se cumple:
- 100% de criterios de aceptación convertidos a condiciones de prueba.
- 0 preguntas abiertas críticas de testabilidad.
- checklist de cierre completo.

## Reglas duras
- Requiere autorización previa del Orquestador para ejecutar mutaciones en Azure DevOps.
- Aplicar contrato I/O estandar (`references/contrato-io-agentes.md`) y codigos de decision (`references/codigos-decision.md`).
- No dejar contenido genérico ni placeholders.
- No cerrar sin verificar descripción guardada.
- Nunca sobrescribir `System.AssignedTo` en QA Tasks existentes si ya está asignada a otro usuario distinto al autenticado en MCP de Azure DevOps, salvo instrucción explícita del usuario.
- Si hay ambigüedad o falta de testabilidad, bloquear cierre y dejar preguntas explícitas.
- Mantener trazabilidad en pipeline-state.

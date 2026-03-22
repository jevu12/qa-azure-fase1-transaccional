# Matriz de Acciones por Agente (Portable)

Esta matriz resume qué operaciones ejecuta cada agente y con qué tipo de herramienta.

## Alcance operativo de esta skill

- **Núcleo Fase 1 (default):** detección + QA Tasks + análisis + diseño + creación/vinculación de TCs/suite.
- **Extensión de compatibilidad (solo si el usuario lo pide explícitamente):** ejecución, reporter de bugs y gestión de evidencias.
- Si no hay instrucción explícita de ejecutar pruebas o reportar bugs, se opera solo en núcleo Fase 1.

## Núcleo Fase 1 (en alcance)

| Agente | Crear | Actualizar | Comentar | Vincular | Lectura/Detección |
|---|---|---|---|---|---|
| Orquestador | No (delegado) | Estado de US, pipeline-state | Comentarios de estado/impedimentos en US | No directo (delegado) | Sí |
| DetectorArtefactos | No | No | No | No | Sí (escaneo completo) |
| Ingestor | QA Tasks (análisis/diseño/ejecución) | pipeline-state | Comentario en US bloqueadas | QA Task -> US (hijo) | Sí |
| Analisis | (solo fallback si falta task) | QA Task análisis (Doing/Closed + Description HTML) + pipeline-state | Firma de análisis si aplica | No obligatorio | Sí |
| Diseño | Test Case (con `wit_create_work_item`) + suite faltante | TCs incompletos a Ready + QA Task diseño + pipeline-state | Opcional resumen en task | TC -> US y TC -> QA Task diseño + membresía suite | Sí |

## Extensión de compatibilidad (condicional)

Estos agentes no forman parte del núcleo transaccional por defecto, pero están documentados
para continuidad de pipeline cuando el usuario solicita explícitamente ejecución de pruebas
o gestión de defectos/evidencias.

| Agente | Acción principal |
|---|---|
| Ejecutor | Verifica dependencias Playwright (MCP/CLI), ejecuta TCs, captura evidencias por paso, comenta TC/US, crea bugs en ejecución |
| ReporterBugs | Evalúa FAIL/BLOCKED, deduplica, asigna bug al dev objetivo y crea bugs con umbral |
| GestorEvidencias | Inventaría evidencias por patrón, evita duplicados, sube/adjunta y comenta trazabilidad |

## Reglas transversales
- Toda ejecución de agente especializado requiere autorización previa del Orquestador (QA Orchestrator Service).
- Ningún agente especializado puede operar directo en Azure DevOps sin decisión previa en `decisions_log`.
- Detectar antes de crear (idempotencia).
- No duplicar artefactos equivalentes.
- Usar identidad MCP (`qa_assignee.source`).
- En bugs: asignar al último responsable de la US distinto al usuario autenticado en el MCP de Azure DevOps.
- Registrar decisiones en `decisions_log`.
- Respetar estados permitidos antes de mutar artefactos.

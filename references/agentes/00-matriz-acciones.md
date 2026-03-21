# Matriz de Acciones por Agente (Portable)

Esta matriz resume qué operaciones ejecuta cada agente y con qué tipo de herramienta.

## Fase 1 (en alcance)

| Agente | Crear | Actualizar | Comentar | Vincular | Lectura/Detección |
|---|---|---|---|---|---|
| Orquestador | No (delegado) | Estado de US, pipeline-state | Comentarios de estado/impedimentos en US | No directo (delegado) | Sí |
| DetectorArtefactos | No | No | No | No | Sí (escaneo completo) |
| Ingestor | QA Tasks (análisis/diseño/ejecución) | pipeline-state | Comentario en US bloqueadas | QA Task -> US (hijo) | Sí |
| Analisis | (solo fallback si falta task) | QA Task análisis (Doing/Closed + Description HTML) + pipeline-state | Firma de análisis si aplica | No obligatorio | Sí |
| Diseño | Test Case (con `wit_create_work_item`) + suite faltante | TCs incompletos a Ready + QA Task diseño + pipeline-state | Opcional resumen en task | TC -> US y TC -> QA Task diseño + membresía suite | Sí |

## Fuera de alcance Fase 1 (documentado para compatibilidad)

| Agente | Acción principal |
|---|---|
| Ejecutor | Verifica dependencias Playwright (MCP/CLI), ejecuta TCs, captura evidencias por paso, comenta TC/US, crea bugs en ejecución |
| ReporterBugs | Evalúa FAIL/BLOCKED, deduplica, asigna bug al dev objetivo y crea bugs con umbral |
| GestorEvidencias | Inventaría evidencias por patrón, evita duplicados, sube/adjunta y comenta trazabilidad |

## Reglas transversales
- Detectar antes de crear (idempotencia).
- No duplicar artefactos equivalentes.
- Usar identidad MCP (`qa_assignee.source`).
- En bugs: asignar al último responsable de la US distinto al QA MCP.
- Registrar decisiones en `decisions_log`.
- Respetar estados permitidos antes de mutar artefactos.

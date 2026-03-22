# GestorEvidencias (Compatibilidad, fuera de Fase 1)

## Guía de comentarios
Para fallback de adjuntos y resumen de evidencias en US, usar:
- `references/agentes/09-templates-comentarios.md`

## Qué hace
- Inventaria evidencias por patrón de archivo.
- Evita resubidas duplicadas.
- Adjunta evidencia a TC/US/Bug o comenta fallback.
- Publica resumen de evidencias en la US.

## Input esperado desde Ejecutor
- `us_id`
- `execution_outcomes[]` con `tc_id`, `result`, `bug_id` (si aplica), `evidence_files[]`
- `project_config`

## Inventario detallado (obligatorio)
Clasificar cada archivo por patrón:

| Patrón | Tipo | Destino primario |
|---|---|---|
| `TC-{id}-paso-{n}-passed.png` | Evidencia de paso exitoso | Test Case #{id} |
| `TC-{id}-paso-{n}-failed.png` | Evidencia de paso fallido | Test Case #{id} y Bug asociado |
| `TC-{id}-RESULTADO-PASSED.png` | Resultado final PASS | Test Case #{id} |
| `TC-{id}-RESULTADO-FAILED.png` | Resultado final FAIL | Test Case #{id} y Bug asociado |
| `TC-{id}-RESULTADO-BLOCKED.png` | Resultado final BLOCKED | Test Case #{id} y US |
| `BUG-{id}-evidencia-{n}.png` | Evidencia específica de bug | Bug #{id} |
| `US-{id}-resumen.png` | Resumen visual de US | User Story #{id} |

## Flujo operativo
1. Inventariar archivos de `outputs/evidencias/[YYYY-MM-DD]/`.
2. Resolver destino por archivo (TC/BUG/US).
3. Verificar adjuntos existentes por nombre y checksum (idempotencia robusta).
4. Subir solo faltantes.
5. Si no existe API de adjuntos, registrar comentario con referencia al archivo.
6. Publicar comentario resumen en la US.
7. Actualizar `stages.evidencias` en `pipeline-state`.

## Idempotencia de subida
- Si el filename ya existe en el work item destino -> `SKIP`.
- Si el checksum ya existe en el destino (aunque cambie nombre) -> `SKIP`.
- Nunca subir el mismo archivo dos veces al mismo work item.
- Registrar `files_uploaded`, `files_linked`, `files_skipped`, `files_skipped_by_checksum`.

## Política de nombre canónico y retención
Nombre canónico sugerido por sprint:
- `SPR-{sprint}-US-{us_id}-TC-{tc_id}-STEP-{n}-{result}-{timestamp}.png`

Retención sugerida:
- mantener evidencia de sprint activo + últimos `policies.evidence_retention_sprints` sprints.
- purgar/archivar fuera de retención según política del equipo.

Si un archivo no cumple naming canónico:
- no bloquear carga,
- normalizar nombre al publicar inventario y registrar nombre original.

## Operaciones principales
- `wit_get_work_item` (attachments existentes)
- `wit_add_attachment` (si está disponible)
- `wit_add_work_item_comment` (fallback/resumen)

## Regla clave
Nunca subir dos veces el mismo archivo al mismo destino.

## Regla de orquestación obligatoria
- Requiere autorización previa del Orquestador para adjuntar evidencias o comentar en Azure DevOps.
- No ejecutar cargas/adjuntos directos sin decisión previa en `decisions_log`.
- Aplicar contrato I/O estandar (`references/contrato-io-agentes.md`) y codigos de decision (`references/codigos-decision.md`).

## Fallback estándar cuando no se puede adjuntar
Usar formato único de comentario:

```md
GestorEvidencias — Pipeline QA Automatizado — [timestamp]

No fue posible adjuntar evidencia automáticamente.

US: #[us_id]
TC: #[tc_id] (si aplica)
Bug: #[bug_id] (si aplica)
Archivo: [filename]
Ruta: [absolute_or_repo_relative_path]
Motivo: [error_detail]

Acción requerida:
- Adjuntar manualmente el archivo anterior y mantener esta referencia en la US.

Pipeline: [execution_id]
```

# GestorEvidencias (Compatibilidad, fuera de Fase 1)

## Guía de comentarios
Para fallback de adjuntos y resumen de evidencias en US, usar:
- `references/agentes/09-templates-comentarios.md`

## Qué hace
- Inventaria evidencias por patrón de archivo.
- Evita resubidas duplicadas.
- Adjunta evidencia a TC/US/Bug o comenta fallback.
- Publica resumen de evidencias en la US.
- Enforcea segmentación de evidencias por `US/TC`.

## Input esperado desde Ejecutor
- `us_id`
- `execution_outcomes[]` con `tc_id`, `result`, `bug_id` (si aplica), `evidence_files[]`
- `us_evidence_dir` y `tc_evidence_dir` por cada TC
- `manifest_file` por TC
- `project_config`

## Inventario detallado (obligatorio)
Clasificar cada archivo por patrón:

| Patrón | Tipo | Destino primario |
|---|---|---|
| `STEP-<nnn>-PASSED-attempt-<n>-<ts>.png` | Evidencia de paso exitoso | Test Case #{id} |
| `STEP-<nnn>-FAILED-attempt-<n>-<ts>.png` | Evidencia de paso fallido | Test Case #{id} y Bug asociado |
| `STEP-<nnn>-BLOCKED-attempt-<n>-<ts>.png` | Evidencia de paso bloqueado | Test Case #{id} y US |
| `RESULT-PASSED-<ts>.png` | Resultado final PASS | Test Case #{id} |
| `RESULT-FAILED-<ts>.png` | Resultado final FAIL | Test Case #{id} y Bug asociado |
| `RESULT-BLOCKED-<ts>.png` | Resultado final BLOCKED | Test Case #{id} y US |
| `manifest.json` | Trazabilidad transaccional por paso | Test Case #{id} |
| `BUG-{id}-evidencia-{n}.png` | Evidencia específica de bug | Bug #{id} |
| `US-{id}-resumen.png` | Resumen visual de US | User Story #{id} |

## Flujo operativo
1. Inventariar estructura por sprint/US/TC: `outputs/evidencias/<sprint>/US-<id>/TC-<id>/`.
2. Validar que cada evidencia de paso pertenezca a una carpeta `TC-<tc_id>`.
3. Leer `manifest.json` por TC y cruzar con `evidence_files[]`.
4. Resolver destino por archivo (TC/BUG/US).
5. Verificar adjuntos existentes por nombre y checksum (idempotencia robusta).
6. Subir solo faltantes.
7. Marcar `upload_status = UPLOADED_VERIFIED` en manifest al confirmar adjunto.
8. Si no existe API de adjuntos, registrar comentario con referencia al archivo y dejar `BLOCKED_EVIDENCE`.
9. Publicar comentario resumen en la US.
10. Actualizar `stages.evidencias` en `pipeline-state`.

## Idempotencia de subida
- Si el filename ya existe en el work item destino -> `SKIP`.
- Si el checksum ya existe en el destino (aunque cambie nombre) -> `SKIP`.
- Clave de deduplicación recomendada: `checksum + tc_id + step_number + attempt`.
- Nunca subir el mismo archivo dos veces al mismo work item.
- Registrar `files_uploaded`, `files_linked`, `files_skipped`, `files_skipped_by_checksum`.

## Política de nombre canónico y retención
Nombre canónico sugerido por sprint:
- `outputs/evidencias/{sprint}/US-{us_id}/TC-{tc_id}/STEP-{nnn}-{result}-attempt-{n}-{timestamp}.png`
- `outputs/evidencias/{sprint}/US-{us_id}/TC-{tc_id}/RESULT-{result}-{timestamp}.png`

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

## Regla clave adicional
No permitir cierre de TC/US/run si un paso ejecutado no tiene evidencia `UPLOADED_VERIFIED`.

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
- Mantener el TC en estado bloqueado por evidencia (`BLOCKED_EVIDENCE`) hasta verificación de adjunto.

Pipeline: [execution_id]
```

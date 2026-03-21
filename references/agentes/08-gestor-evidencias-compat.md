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
3. Verificar adjuntos existentes por nombre (idempotencia).
4. Subir solo faltantes.
5. Si no existe API de adjuntos, registrar comentario con referencia al archivo.
6. Publicar comentario resumen en la US.
7. Actualizar `stages.evidencias` en `pipeline-state`.

## Idempotencia de subida
- Si el filename ya existe en el work item destino -> `SKIP`.
- Nunca subir el mismo archivo dos veces al mismo work item.
- Registrar `files_uploaded`, `files_linked`, `files_skipped`.

## Operaciones principales
- `wit_get_work_item` (attachments existentes)
- `wit_add_attachment` (si está disponible)
- `wit_add_work_item_comment` (fallback/resumen)

## Regla clave
Nunca subir dos veces el mismo archivo al mismo destino.

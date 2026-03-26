# GestorEvidencias (Compatibilidad, fuera de Fase 1)

## Guía de comentarios
Para fallback de adjuntos y resumen de evidencias en US, usar:
- `references/agentes/09-templates-comentarios.md`

## Qué hace
- Inventaria evidencias por patrón de archivo.
- Comprime evidencias por TC en archivos zip.
- Carga evidencias en el ADO Test Runner usando Playwright (navegación visual).
- Evita resubidas duplicadas.
- Publica resumen de evidencias en la US.
- Enforcea segmentación de evidencias por `US/TC`.
- **NOTA:** La carga de evidencias se hace SIEMPRE en el ADO Test Runner con Playwright, NO con REST API.

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

## Estrategia de subida de evidencias — ACTUALIZADO

### ÚNICA ESTRATEGIA: Playwright UI visual en ADO Test Runner

**IMPORTANTE:** La carga de evidencias se hace SIEMPRE mediante navegación visual en el ADO Test Runner con Playwright MCP. NO se usa REST API para subir evidencias.

**Razón:** El flujo de ejecución requiere que el tester (o agente) seleccione todos los TCs, los ejecute en el runner, marque outcomes y suba evidencias uno a uno en la interfaz visual. Esto garantiza trazabilidad completa y visibilidad en Azure DevOps.

#### Flujo Playwright para ADO test runner

**Prerrequisito:** confirmar que el browser puede navegar ADO (sesión activa o login previo).

**Paso 1 — Navegar al runner de la suite:**
```
browser_navigate → https://dev.azure.com/{org}/{project}/_testPlans/execute?planId={planId}&suiteId={suiteId}
browser_snapshot → verificar carga del runner y listar TCs visibles
```

**Paso 2 — Por cada TC (repetir en orden):**

2a. Seleccionar el TC:
```
browser_snapshot → identificar fila del TC por título
browser_click → fila del TC para abrir panel de ejecución lateral
browser_snapshot → verificar que el panel de ejecución está abierto
```

2b. Marcar outcome:
```
browser_snapshot → identificar controles de outcome (íconos Passed/Failed/Blocked)
browser_click → ícono del outcome correspondiente (ej. "Passed")
browser_snapshot → verificar que el outcome cambió visualmente en la fila
browser_take_screenshot → OUTCOME-SET-TC-{id}-{timestamp}.png (evidencia del marcado)
```

2c. Comprimir y subir evidencias del TC (obligatorio — zip único):
```
Antes de abrir el diálogo de adjunto, comprimir todos los PNGs del TC:
  cd outputs/evidencias/<sprint>/US-<id>/TC-<id>/
  zip evidencias-TC-{tc_id}.zip *.png
  → Ruta resultante: outputs/evidencias/<sprint>/US-<id>/TC-<id>/evidencias-TC-{tc_id}.zip
  → El zip es el ÚNICO archivo a subir. No subir PNGs individuales.

Subir el zip (una sola interacción):
Por cada archivo a subir (solo el zip: evidencias-TC-{tc_id}.zip):
  browser_snapshot → identificar botón "Add attachment" o ícono de clip en el panel del TC
  browser_click → botón "Add attachment"
  browser_snapshot → verificar que el diálogo/input de archivo se abrió
  browser_file_upload → {ruta_absoluta_del_archivo}
  browser_snapshot → verificar que el nombre del archivo aparece en el panel como adjunto cargado
  browser_take_screenshot → UPLOAD-VERIFIED-TC-{id}-STEP-{n}-{timestamp}.png
  → actualizar manifest.json: upload_status = UPLOADED_VERIFIED para ese archivo
```

2d. Verificación final del TC:
```
browser_snapshot → confirmar outcome + adjuntos visibles en el runner
browser_take_screenshot → TC-{id}-RUNNER-FINAL-{timestamp}.png
```

**Paso 3 — Al finalizar todos los TCs:**
```
browser_snapshot → verificar vista general de la suite con todos los outcomes marcados
browser_take_screenshot → SUITE-FINAL-{suiteId}-{timestamp}.png
```

## Flujo operativo — ACTUALIZADO

### FASE 1: Inventario y Compresión
1. Inventariar estructura por sprint/US/TC: `outputs/evidencias/<sprint>/US-<id>/TC-<id>/`.
2. Validar que cada evidencia de paso pertenezca a una carpeta `TC-<tc_id>`.
3. Leer `manifest.json` por TC y cruzar con `evidence_files[]`.
4. **Comprimir evidencias por TC:**
   - Por cada TC con evidencias capturadas:
     ```bash
     cd outputs/evidencias/<sprint>/US-<id>/TC-<id>/
     zip evidencias-TC-<tc_id>.zip *.png
     ```
   - Actualizar `manifest.json`: `zip_file = "evidencias-TC-<tc_id>.zip"`.

### FASE 2: Carga en ADO Test Runner (Playwright UI)
5. Navegar al ADO Test Runner:
   ```
   browser_navigate → https://dev.azure.com/{org}/{project}/_testPlans/execute?planId={planId}&suiteId={suiteId}
   browser_snapshot → verificar carga del runner
   ```

6. Seleccionar todos los TCs y ejecutarlos en el runner.

7. Por cada TC, marcar outcome y subir zip:
   - Seleccionar TC en el runner.
   - Marcar outcome (Passed/Failed/Blocked).
   - Click en "Add attachment".
   - `browser_file_upload` → ruta absoluta del zip.
   - Verificar adjunto visible (`browser_snapshot`).
   - Marcar `upload_status = UPLOADED_VERIFIED` en `manifest.json`.

8. Cerrar el runner con "Save and Close".

### FASE 3: Validación y Trazabilidad
9. Validar que todos los TCs tienen `upload_status = UPLOADED_VERIFIED`.
10. Si algún TC no tiene evidencia verificada: registrar `BLOCKED_EVIDENCE` en `decisions_log`.
11. Publicar comentario resumen en la US.
12. Actualizar `stages.evidencias` en `pipeline-state`.

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
- `wit_get_work_item` — verificar adjuntos existentes antes de subir (idempotencia)
- `wit_add_work_item_comment` — comentario de resumen en US y fallback de referencia
- curl via Bash tool — subida REST de adjuntos a test results (Prioridad 1)
- Playwright MCP (`browser_navigate`, `browser_click`, `browser_file_upload`, `browser_snapshot`, `browser_take_screenshot`) — subida visual en ADO test runner (Prioridad 2)

Nota: `wit_add_attachment` no existe en el MCP disponible. No usar.

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

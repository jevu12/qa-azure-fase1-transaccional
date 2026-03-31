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

## ⚠️ Regla de compresión ZIP (obligatoria antes de subir)

Antes de subir cualquier evidencia al runner ADO, comprimir **todos** los archivos de evidencia del TC en un único ZIP:

```bash
cd "outputs/evidencias/<sprint>/US-<us_id>/TC-<tc_id>"
zip TC-<tc_id>-evidencias.zip STEP-*.png RESULT-*.png network-requests.json 2>/dev/null || true
```

**Reglas críticas:**
- El ZIP **debe quedar DENTRO de la carpeta del TC**: `TC-<tc_id>/TC-<tc_id>-evidencias.zip`
- ❌ **Nunca** crear el ZIP a nivel de la carpeta US (`US-<us_id>/TC-<tc_id>-evidencias.zip`)
- Subir **únicamente el ZIP** al runner (no archivos individuales). Esto reduce el número de uploads de N a 1 por TC.
- Verificar que el contador de adjuntos del runner muestra "1" tras la subida.

## Estrategia de subida de evidencias (orden de prioridad)

### Prioridad 1 — REST API via curl (requiere `runId` + `resultId` con scope de test management)
⚠️ El PAT actual (`AZURE_DEVOPS_EXT_PAT`) **no tiene scope de test management**. Las llamadas a endpoints `/test/runs/{runId}/results/{resultId}/attachments` retornan HTTP 401. Saltar directamente a Prioridad 2.

Solo aplicar Prioridad 1 si el PAT tiene scope de test management verificado:
```bash
PAT_B64=$(echo -n ":${AZURE_DEVOPS_EXT_PAT}" | base64)
# Subir el ZIP (no archivos individuales)
FILE_B64=$(base64 -i "outputs/evidencias/<sprint>/US-<id>/TC-<id>/TC-<id>-evidencias.zip")
curl -s -X POST \
  "https://dev.azure.com/{org}/{project}/_apis/test/runs/{runId}/results/{resultId}/attachments?api-version=7.1" \
  -H "Authorization: Basic ${PAT_B64}" \
  -H "Content-Type: application/json" \
  -d "{
    \"stream\": \"${FILE_B64}\",
    \"fileName\": \"TC-{tc_id}-evidencias.zip\",
    \"comment\": \"Evidencias TC {tc_id}\",
    \"attachmentType\": \"GeneralAttachment\"
  }"
```
→ Si respuesta HTTP 200/201: marcar `upload_status = UPLOADED_VERIFIED` en `manifest.json`.
→ Si respuesta 401/403: registrar `BLOCKED_REST_TEST_SCOPE` en `decisions_log` y pasar a Prioridad 2.

### Prioridad 2 — Playwright UI visual (mecanismo principal para este proyecto)

#### Flujo Playwright para ADO test runner (validado en ejecución real)

**Prerrequisito:** el browser ya tiene sesión activa en ADO.

**Paso 1 — Navegar al plan de pruebas y abrir el runner:**
```
browser_navigate → https://dev.azure.com/{org}/{project}/_testPlans/execute?planId={planId}&suiteId={suiteId}
browser_snapshot → verificar que se listan los test points de la suite
# Seleccionar todos los TCs (checkbox encabezado) y hacer clic en "Run for web application"
# → se abre una nueva pestaña (tab index 1) con el runner en: _testExecution/Index
browser_tabs → confirmar que la nueva pestaña está activa (tab 1)
```

**Paso 2 — Por cada TC en el runner (en orden, de 1 a N):**

2a. Verificar que se está en el TC correcto:
```
browser_snapshot (tab 1) → verificar título "Test X of N" y nombre del TC activo
```

2b. Marcar cada paso como PASSED/FAILED/BLOCKED:
```
Por cada paso del TC:
  browser_snapshot → identificar botón "Pass test step" o "Fail test step" del paso
  browser_click → botón del resultado del paso
  browser_snapshot → verificar que el paso cambió de estado (checked)
# Para TCs BLOCKED: no marcar pasos individuales; ir directo al paso 2c
```

2c. Adjuntar el ZIP de evidencias:
```
browser_click → botón "Add information to test result" (toolbar superior)
browser_snapshot → verificar que aparece menú con "Add attachment"
browser_click → "Add attachment"
browser_snapshot → verificar que se abre el diálogo "Add attachment" con botón "Browse..."
browser_click → "Browse..."
# Se activa el file chooser
browser_file_upload → ["outputs/evidencias/<sprint>/US-<us_id>/TC-<tc_id>/TC-<tc_id>-evidencias.zip"]
browser_snapshot → verificar que el nombre del ZIP aparece en el diálogo con su tamaño
browser_click → "OK"
browser_snapshot → verificar que el contador de adjuntos del runner muestra "1"
```

2d. Marcar resultado global del TC:
```
browser_click → botón "Mark test case result" (en toolbar del TC, no de la barra superior)
browser_snapshot → verificar que se despliega menú: Pass/Fail/Block test
browser_click → "Pass test" | "Fail test" | "Block test" según resultado
browser_snapshot → verificar que el TC muestra el resultado final
```

2e. Avanzar al siguiente TC:
```
browser_click → botón "next" (si no es el último TC)
# Si es el último TC: "next" estará deshabilitado
```

**Paso 3 — Cerrar el runner al finalizar todos los TCs:**
```
# El runner tiene iconos en la barra superior sin texto visible.
# El segundo ícono (ref variable) cierra el runner y guarda los resultados.
browser_click → segundo ícono de la barra de herramientas (después de "Save")
# Alternativamente: browser_click → botón "Save" primero, luego cerrar pestaña
browser_snapshot (tab 0) → verificar que se volvió a la vista del test plan con outcomes actualizados
browser_take_screenshot → confirmar tabla de TCs con resultados Passed/Blocked/Failed
```

**Notas de comportamiento conocidas del runner:**
- Tooltips pueden interceptar clicks en los botones de paso → si ocurre, ejecutar `browser_evaluate` para dispatch `Escape` y reintentar.
- El runner abre en tab 1; el test plan permanece en tab 0.
- Al cerrar el runner vía el segundo ícono de toolbar, los resultados quedan guardados sin necesidad de "Save and Close" explícito.

## Flujo operativo
1. Inventariar estructura por sprint/US/TC: `outputs/evidencias/<sprint>/US-<id>/TC-<id>/`.
2. Validar que cada evidencia de paso pertenezca a una carpeta `TC-<tc_id>`.
3. Leer `manifest.json` por TC y cruzar con `evidence_files[]`.
4. **Comprimir evidencias en ZIP dentro de la carpeta del TC** (ver regla de compresión ZIP arriba).
   - Verificar que el ZIP existe en `TC-<tc_id>/TC-<tc_id>-evidencias.zip` antes de proceder.
   - Si el ZIP no existe, crearlo. Si ya existe, usar el existente (idempotencia).
5. Verificar adjuntos existentes en el runner/work item por nombre (idempotencia).
6. Subir el ZIP usando la estrategia de prioridad definida arriba (solo el ZIP, no archivos individuales).
7. Marcar `upload_status = UPLOADED_VERIFIED` en manifest al confirmar el contador de adjuntos en "1".
8. Si no se puede confirmar el adjunto visualmente o por API: dejar `BLOCKED_EVIDENCE` y registrar en `decisions_log`.
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

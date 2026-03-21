# Ejecutor (Compatibilidad, fuera de Fase 1)

Este agente no es núcleo de esta skill Fase 1, pero se documenta para continuidad de pipeline.

## Guía de comentarios
Para comentarios por TC, resumen en US y cierre de task de ejecución, usar:
- `references/agentes/09-templates-comentarios.md`

## Qué hace
- Ejecuta TCs con Playwright MCP.
- Comenta resultado en cada TC y resumen en la US.
- Puede crear bugs por fallos.
- Actualiza QA Task de ejecución y `pipeline-state`.

## Dependencias y verificación obligatoria
Antes de ejecutar TCs, verificar disponibilidad de automatización web:

1. Playwright MCP habilitado:
- Validar que existan herramientas `browser_navigate`, `browser_snapshot`, `browser_click`, `browser_type`, `browser_take_screenshot`.
- Si el runtime del navegador no está instalado, ejecutar `browser_install`.

2. Playwright CLI (fallback operativo, si el flujo usa CLI):
- Verificar disponibilidad (`playwright --version` o `npx playwright --version`).
- Si no está disponible, instalar dependencias de proyecto y navegador:
  - `npm i -D playwright @playwright/test`
  - `npm install -g @playwright/cli@latest`
  - `npx playwright install`

3. Si no hay MCP ni CLI operativo:
- Marcar ejecución como `BLOCKED` con motivo `dependencia_playwright_no_disponible`.
- Registrar comentario en US con acción requerida.

## Regla de asignación de bug (cuando el Ejecutor crea bug)
- Resolver `bug_assignee` con la misma política del ReporterBugs:
1. Último asignado en revisiones de la US distinto al usuario QA MCP.
2. Si no existe, asignado actual de la US distinto al usuario QA MCP.
3. Si no existe, fallback manual configurable (si es distinto al QA MCP).
4. Si no hay candidato válido, crear bug sin asignado y dejar comentario de advertencia.

## Evidencias obligatorias por TC y por paso
Capturar y persistir evidencia mínima:
- `TC-{id}-pre-{timestamp}.png` (antes de ejecutar pasos).
- `TC-{id}-paso-{n}-passed.png` o `TC-{id}-paso-{n}-failed.png` (cada paso).
- `TC-{id}-RESULTADO-[PASSED|FAILED|BLOCKED].png` (resultado final del TC).

Reglas:
- Siempre capturar evidencia antes/después de acciones relevantes.
- Nunca detener ejecución global por fallo de un TC; continuar y documentar.
- Mantener naming estable para permitir inventario automático del Gestor de Evidencias.

## Handoff obligatorio al Gestor de Evidencias (08)
El Ejecutor debe entregar estructura explícita para carga de evidencias:

```json
{
  "us_id": 12345,
  "execution_outcomes": [
    {
      "tc_id": 144801,
      "scenario_id": "ESC-HP-01",
      "result": "PASS|FAIL|BLOCKED",
      "failed_step": 0,
      "bug_id": null,
      "evidence_files": [
        "outputs/evidencias/2026-03-21/TC-144801-pre-081100.png",
        "outputs/evidencias/2026-03-21/TC-144801-paso-1-passed.png",
        "outputs/evidencias/2026-03-21/TC-144801-RESULTADO-PASSED.png"
      ]
    }
  ]
}
```

## Operaciones principales
- ADO: leer/actualizar work items, comentar, vincular, listar TCs de suite.
- Playwright: navegar, interactuar, evidencias (screenshots).

## Contrato de salida útil para fases siguientes
- resultados por TC (`PASS/FAIL/BLOCKED`)
- bugs creados
- evidencias generadas

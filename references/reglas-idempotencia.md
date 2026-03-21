# Reglas de Idempotencia y Anti-duplicado

## Regla principal
Antes de crear cualquier artefacto, detectar si ya existe un equivalente funcional.

## Criterios de duplicado
- QA Tasks: título esperado como hijo directo de la US.
- Test Suite: nombre de suite coincidente para US/sprint.
- Test Case: scenario_id o patrón de título ya vinculado a la US.
- Comentario QA: firma del agente con contenido equivalente.
- Evidencia: nombre de archivo ya adjunto.

## Comportamiento esperado
- Existe completo: `SKIP`.
- Existe parcial: `UPDATE` solo de faltantes.
- No existe: `CREATE`.

## Reglas duras
- Nunca eliminar artefactos existentes.
- Nunca recrear un artefacto completo.
- Registrar todo en `decisions_log` con razón y artefactos afectados.

## Reanudación
Usar `pipeline-state.json` para continuar por etapas:
- `COMPLETED`: no repetir.
- `IN_PROGRESS`: retomar.
- `FAILED`: reintentar solo lo fallido.
- `PARTIAL`: completar pendientes.

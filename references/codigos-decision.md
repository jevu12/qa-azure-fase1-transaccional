# Catalogo de Codigos de Decision (Estandar)

## Objetivo
Unificar los codigos usados en `decisions_log` para que todos los agentes reporten decisiones de forma consistente y auditable.

## Campos minimos obligatorios en `decisions_log`
- `timestamp`
- `us_id`
- `agent`
- `decision` (`CREATE|UPDATE|SKIP|BLOCK|ERROR`)
- `decision_code`
- `reason`
- `reason_code`
- `action_taken`
- `artifacts_affected`

Campos condicionales recomendados:
- `next_agent`
- `next_action`
- `error_code` (obligatorio si `decision=ERROR`)
- `execution_owner`, `mcp_user`, `ownership_check`, `skip_reason_code` (cuando aplique ownership)

## Valores permitidos de `decision_code`
- `CREATE_NEW`
- `UPDATE_EXISTING`
- `SKIP_NO_ACTION`
- `BLOCK_PROCESS`
- `ERROR_RUNTIME`

## Catalogo base de `reason_code`

### Procesabilidad / Estado
- `US_NOT_PROCESSABLE_STATE`
- `US_TECHNICAL_EXCLUDED`
- `US_MISSING_REQUIRED_CONTENT`
- `TASK_ONLY_STATE_RESTRICTION`
- `US_ALREADY_COMPLETED`

### Idempotencia / Duplicados
- `ALREADY_EXISTS_EQUIVALENT`
- `ARTIFACT_PARTIAL_CONTINUE`
- `REASSIGNMENT_EXPLICIT_APPROVAL`

### Ejecucion / Ownership
- `EXECUTE_PENDING`
- `EXECUTION_OWNERSHIP_MISMATCH`
- `EXECUTION_NOT_REQUIRED`
- `BLOCKED_SETUP`

### Configuracion / MCP
- `MCP_NOT_AVAILABLE`
- `PROJECT_NOT_ACCESSIBLE`
- `ITERATION_NOT_ACCESSIBLE`
- `MCP_IDENTITY_UNRESOLVED`
- `CONFIG_INVALID`

### Integracion / Error
- `RETRY_EXHAUSTED`
- `CONTRACT_VALIDATION_FAILED`
- `UNEXPECTED_EXCEPTION`

## Catalogo de `next_action` recomendado
- `DETECT_ONLY`
- `INGEST_TASKS`
- `ANALYZE_STORY`
- `DESIGN_TESTS`
- `EXECUTE_PENDING`
- `REPORT_BUGS`
- `MANAGE_EVIDENCE`
- `NO_OP`
- `WAIT_USER_INPUT`

## Reglas de uso
- Todo `SKIP` debe tener `reason_code` explicito.
- Todo `BLOCK` debe incluir accion requerida en `reason`.
- Todo `ERROR` debe incluir `error_code` y si hubo reintentos.
- No inventar codigos ad-hoc fuera de este catalogo sin actualizar este archivo.

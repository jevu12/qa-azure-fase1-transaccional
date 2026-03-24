# Reglas de Idempotencia y Gobernanza

## Objetivo
Garantizar que todas las operaciones del pipeline QA sean idempotentes, auditables y gobernadas, evitando duplicados y manteniendo la integridad de los datos en Azure DevOps.

---

## 1. Reglas de Idempotencia

### 1.1 Detección antes de creación
Antes de crear cualquier artefacto en Azure DevOps, el sistema DEBE verificar si ya existe.

| Artefacto | Cómo detectar | Criterio de duplicado |
|---|---|---|
| QA Task (Análisis) | Buscar hijos de la US con título que contenga `naming_conventions.analysis_task_title` | Coincidencia exacta de título como hijo directo de la US |
| QA Task (Diseño) | Buscar hijos de la US con título que contenga `naming_conventions.design_task_title` | Coincidencia exacta de título como hijo directo de la US |
| QA Task (Ejecución) | Buscar hijos de la US con título que contenga `naming_conventions.execution_task_title` | Coincidencia exacta de título como hijo directo de la US |
| Test Suite | Buscar suites en el Test Plan con nombre que contenga el ID y título de la US | Nombre coincidente dentro de la carpeta del sprint |
| Test Case | Buscar TCs vinculados a la US con relación "Tests/Tested By" | Coincidencia de scenario_id en el título del TC |
| Test Run (planificado) | Buscar runs abiertos por `userStoryId + executionDate` y misma huella de `pointIds` | Reutilizar run abierto equivalente; no crear run duplicado |
| Bug | Buscar bugs vinculados a la US con estado Active/New | Coincidencia de TC_id + descripción del fallo |
| Comentario QA | Leer comentarios existentes de la US | Texto del comentario contiene la firma del agente y el mismo contenido |
| Evidencia | Listar attachments del work item | Nombre de archivo coincidente |

### 1.2 Acciones según detección

| Artefacto existe | Estado del artefacto | Acción |
|---|---|---|
| QA Task existe | New | Continuar — actualizar si corresponde |
| QA Task existe | Doing | Continuar desde donde se quedó |
| QA Task existe | Closed con contenido completo | SKIP — no recrear |
| QA Task existe | Closed con contenido incompleto | Reabrir a Doing, completar |
| Test Suite existe | Con TCs completos | SKIP — no recrear |
| Test Suite existe | Con TCs parciales | Agregar TCs faltantes |
| Test Suite existe | Vacía | Poblar con TCs |
| Test Case existe | Ready con Steps completos | SKIP — no recrear |
| Test Case existe | Design con Steps vacíos | Actualizar con Steps completos, mover a Ready |
| Test Run equivalente abierto | Con mismos `pointIds` y fecha de ejecución | Reutilizar run existente y continuar publicación |
| Test Run equivalente cerrado | Completado para la misma corrida/fecha | SKIP — no recrear run |
| Bug existe | Active | SKIP — no crear duplicado |
| Bug existe | Closed/Resolved | Evaluar si reabrirlo o crear nuevo |
| Comentario existe | Mismo contenido | SKIP — no duplicar |
| Evidencia existe | Mismo nombre | SKIP — no re-subir |

### 1.3 Regla de hash funcional
Para cada US se calcula un hash basado en:
- `us_id`
- `title`
- `acceptance_criteria` (hash MD5 del contenido)
- `description` (hash MD5 del contenido)

Si el hash no ha cambiado desde la última ejecución, los artefactos no se regeneran (a menos que estén incompletos).

### 1.4 Idempotencia específica de `execute_and_publish`
Para publicación de resultados por historia:
- Clave de idempotencia mínima: `userStoryId + executionDate`.
- Si existe run abierto de esa clave, reutilizar y publicar en ese `runId`.
- No crear runs paralelos para la misma US/fecha salvo instrucción explícita del usuario.
- Si falta `planId`, `suiteId` o `testPointId` para cualquier TC esperado:
  - bloquear setup (`BLOCKED_SETUP`),
  - no publicar resultados parciales en run no planificado.

---

## 2. Reglas de Gobernanza

### 2.1 Auditoría de acciones
Toda acción ejecutada por un agente DEBE registrarse en `decisions_log` del pipeline-state.json:

```json
{
  "timestamp": "ISO-8601",
  "us_id": 12345,
  "work_item_type": "User Story",
  "us_state": "Ready for test",
  "agent": "nombre_del_agente",
  "decision": "CREATE | UPDATE | SKIP | BLOCK | ERROR",
  "decision_code": "CREATE_NEW | UPDATE_EXISTING | SKIP_NO_ACTION | BLOCK_PROCESS | ERROR_RUNTIME",
  "reason": "Motivo claro de la decisión",
  "reason_code": "Catalogo en references/codigos-decision.md",
  "error_code": "Opcional, obligatorio si decision=ERROR",
  "execution_task_id": 67892,
  "execution_task_state": "New",
  "test_cases_ready": 8,
  "test_runs_count": 0,
  "execution_started": false,
  "next_agent": "Ejecutor",
  "next_action": "EXECUTE_PENDING",
  "action_taken": "Descripción de lo que se hizo",
  "artifacts_affected": ["QA Task #67890", "Test Case #67891"]
}
```

Regla obligatoria de consistencia:
- Si `execution_started == false` y `execution_task_state` está en `New|Doing`, NUNCA registrar la US como `cerrada` o `completa`.
- Campos mínimos adicionales para auditoría de ownership:
  - `execution_owner`
  - `mcp_user`
  - `ownership_check`
  - `skip_reason_code`
- Todo `SKIP|BLOCK|ERROR` debe registrar `reason_code` del catalogo central.
- Todo `ERROR` debe registrar `error_code`.

### 2.2 Umbral de confianza para bugs
La creación automática de bugs requiere superar el umbral definido en `policies.bug_confidence_threshold`.
- Si `confidence >= threshold` → crear bug automáticamente
- Si `confidence < threshold` → registrar hallazgo como comentario en la US y marcar para revisión humana

### 2.3 Reintentos controlados
- Cada operación MCP puede reintentarse hasta `policies.max_retries_on_mcp_failure` veces
- Cada reintento se registra en el log de auditoría
- Si todos los reintentos fallan: marcar como ERROR, continuar con la siguiente US

### 2.4 Prevención de operaciones destructivas
- NUNCA eliminar artefactos existentes
- NUNCA sobrescribir contenido de un TC en estado Ready sin verificación previa
- NUNCA cerrar un bug de forma automática
- SOLO cambiar el estado de una US según las transiciones definidas en `policies.state_transitions`:
  - `Ready for test` → `Testing in progress` (al iniciar ejecución)
  - `Testing in progress` → `On Hold` (cuando se encuentran bugs)
  - `Testing in progress` → `PO Review` (cuando todos los TCs pasan)
- NUNCA cambiar el estado de US en `task_only_states` (`New`, `On Hold`, `Code Review`)
- NUNCA realizar acciones sobre US en `no_action_states` (`Rejected`, `Pending definition`)
- Ver reglas completas en `references/reglas-transiciones.md`

### 2.5 Firma de agente
Todos los comentarios automáticos en Azure DevOps DEBEN incluir la firma:
```
🤖 [nombre_agente] — Pipeline QA Automatizado — [timestamp]
```
Esto permite identificar acciones automáticas vs manuales y evitar duplicar comentarios.

### 2.6 Regla de conservación de asignación (QA Tasks existentes)

Si una QA Task ya existe y `System.AssignedTo` está definido con un usuario distinto
al autenticado en el MCP de Azure DevOps, NO se debe modificar `System.AssignedTo`.

Solo se permite cambiar `System.AssignedTo` cuando:
1. La task no tiene asignado (`System.AssignedTo` vacío), o
2. Existe una instrucción explícita del usuario para reasignar.

Toda excepción debe registrarse en `decisions_log` con:
- `decision: "UPDATE"`
- `reason: "REASSIGNMENT_EXPLICIT_APPROVAL"`
- `previous_assignee`
- `new_assignee`

### 2.7 Regla de elegibilidad de ejecución por asignación (ownership QA)

La ejecución de pruebas (Test Runs) SOLO puede iniciarse para User Stories cuya
QA Task de ejecución (`Ejecución de casos`) esté asignada al usuario autenticado
en el MCP de Azure DevOps.

Si la US está en `Ready for test`, tiene Test Cases en `Ready`, pero la QA Task de
ejecución está asignada a un usuario distinto:
- NO ejecutar Test Cases.
- NO crear Test Runs.
- NO cambiar estado de la US.
- Registrar decisión `SKIP` con motivo `EXECUTION_OWNERSHIP_MISMATCH`.
- Agregar comentario en la US indicando que la ejecución requiere reasignación
  explícita o ejecución por el QA owner actual.

Excepciones permitidas:
1. Instrucción explícita del usuario para ejecutar aun sin ser owner, o
2. Reasignación explícita y auditada de la QA Task de ejecución.

---

## 3. Reglas de Transición de Estados

### 3.1 QA Tasks
```
New → Doing → Closed
       ↓
     Error → (reintento) → Doing
```

### 3.2 Test Cases
```
(creación) → Ready
              ↓
         (ejecución) → Passed | Failed | Blocked
```

### 3.3 Bugs
```
(creación) → New → (asignación) → Active → (resolución) → Resolved → Closed
```

---

## 4. Reglas de Trazabilidad

### 4.1 Links obligatorios
| Origen | Destino | Tipo de vínculo |
|---|---|---|
| QA Task | User Story | Parent-Child (hijo) |
| Test Case | User Story | Tests / Tested By |
| Test Case | QA Task Diseño | Related |
| Bug | User Story | Related |
| Bug | Test Case | Tested By |
| Test Suite | Contiene TCs | Suite membership |

### 4.2 Campos de trazabilidad
- Todos los artefactos creados DEBEN tener el mismo `AreaPath` que la US
- Todos los artefactos creados DEBEN tener el mismo `IterationPath` que la US
- Todos los artefactos creados DEBEN tener el tag definido en `policies.qa_task_tag`

---

## 5. Políticas de Ejecución Incremental

### 5.1 Reanudación desde cualquier punto
El pipeline DEBE poder reanudarse desde cualquier etapa sin perder el trabajo previo.
La lógica de reanudación se basa en:
1. Leer `pipeline-state.json` y determinar el estado de cada stage
2. Para cada stage con status `COMPLETED` → SKIP
3. Para cada stage con status `IN_PROGRESS` → Retomar desde donde se quedó
4. Para cada stage con status `FAILED` → Reintentar solo las US fallidas
5. Para cada stage con status `PARTIAL` → Completar las US pendientes
6. Para cada stage con status `PENDING` → Ejecutar normalmente

### 5.2 Ejecución selectiva
El modo de ejecución define qué stages se ejecutan:
| Modo | Detección | Ingestor | Análisis | Diseño | Ejecución | Bugs | Evidencias |
|---|---|---|---|---|---|---|---|
| `full-pipeline` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `analysis-only` | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `design-only` | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| `execution-only` | ✅ | ✅ | ❌ | ❌ | ✅ | ✅ | ✅ |
| `detection-only` | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

### 5.3 Procesamiento de US en diferentes estados de madurez QA
El sistema puede recibir US con cualquier nivel de artefactos previos:

| Estado de madurez QA | Acción del pipeline |
|---|---|
| US sin artefactos QA | Pipeline completo desde cero |
| US con QA Tasks pero sin TCs | Saltar creación de tasks, continuar con análisis/diseño |
| US con QA Tasks + TCs pero sin ejecución | Saltar análisis/diseño, continuar con ejecución |
| US con ejecución parcial | Continuar ejecución de TCs no ejecutados |
| US con ejecución completa | Verificar resultados, crear bugs si corresponde |
| US con bugs existentes | Verificar estado de bugs, no duplicar |
| US con impedimentos | Registrar comentario, notificar, marcar como bloqueada |

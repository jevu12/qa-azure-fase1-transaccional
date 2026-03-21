# Reglas de Transición de Estado de User Stories

## Objetivo
Definir las reglas exactas para la gestión de estados de User Stories en Azure DevOps
durante el pipeline QA automatizado. Estas reglas determinan qué acciones se permiten
según el estado actual de cada US, y cómo el sistema debe cambiar el estado después
de completar actividades de QA.

---

## 1. Reglas por Estado Actual de la US

### 1.1 Estado `New`, `On Hold` o `Code Review`

Cuando una US está en alguno de estos estados:

#### Sin tareas QA existentes:
- ✅ Crear las QA Tasks requeridas (análisis, diseño, ejecución)
- ❌ NO crear Test Cases
- ❌ NO crear ejecuciones (Test Runs)
- ❌ NO ejecutar pruebas
- ❌ NO cambiar el estado de la US
- ✅ Registrar trazabilidad en Azure DevOps (comentario con firma de agente)

#### Con tareas QA existentes:
- ❌ NO forzar ejecución ni avanzar el flujo de testing
- ❌ NO cambiar el estado de la US
- ✅ Registrar en pipeline-state.json que la US fue evaluada
- ✅ Si las tasks están incompletas, completarlas (análisis, diseño) según idempotencia

**Motivo:** Estas historias no están listas para testing. El sistema solo prepara
los artefactos QA necesarios para cuando la US avance.

---

### 1.2 Estado `Rejected`

Cuando una US está en estado `Rejected`:

- ❌ NO realizar ninguna tarea sobre esa historia
- ❌ NO crear QA Tasks
- ❌ NO crear Test Cases
- ❌ NO ejecutar pruebas
- ❌ NO cambiar el estado de la US
- ❌ NO agregar comentarios QA
- ✅ Registrar en pipeline-state.json como `IGNORED` con motivo `"estado Rejected"`
- ✅ Registrar en decisions_log con decisión `SKIP` y razón `"US en estado Rejected — no procesable"`

**Motivo:** Las historias rechazadas no deben recibir ninguna actividad QA.

---

### 1.3 Estado `Ready for test`

Cuando una US está en estado `Ready for test`:

#### Caso A — Sin Test Cases:
1. ✅ Crear los Test Cases
2. ✅ Asociarlos a la US (relación Tests/Tested By)
3. ✅ Asociarlos a la Test Suite / Test Plan correspondiente
4. ✅ Ejecutar las pruebas
5. ✅ **Cambiar el estado de la US a `Testing in progress`** al iniciar la ejecución

#### Caso B — Con Test Cases existentes:
1. ✅ Reutilizar los Test Cases existentes
2. ✅ Ejecutar las pruebas
3. ✅ **Cambiar el estado de la US a `Testing in progress`** al iniciar la ejecución

**Cambio de estado obligatorio:**
```
Ready for test → Testing in progress
```

**Herramienta para el cambio de estado:**
```
mcp_ado_wit_update_work_item
id: [us_id]
fields:
  - System.State: "Testing in progress"
```

**Comentario obligatorio al cambiar estado:**
```
🤖 Orquestador QA — Pipeline QA Automatizado — [timestamp]

🔄 ESTADO ACTUALIZADO: Ready for test → Testing in progress

Ejecución QA iniciada:
- TCs a ejecutar: [n]
- Plataformas: [platforms]
- Pipeline: [execution_id]
```

---

### 1.4 Estado `Testing in progress`

Cuando una US ya está en `Testing in progress`:
- ✅ Continuar ejecución de TCs no ejecutados
- ✅ Evaluar resultados parciales
- ❌ NO volver a cambiar a `Testing in progress` (ya está en ese estado)

---

### 1.5 Estados `PO Review`, `Done`, `Closed`

Estas US ya completaron el ciclo:
- ❌ NO rehacer trabajo QA
- ✅ Verificar resultados si se solicita
- ✅ Registrar como `COMPLETED` en pipeline-state.json

---

## 2. Reglas Post-Ejecución — Transiciones de Estado

Después de que el Agente Ejecutor completa la ejecución de todos los TCs de una US,
el Orquestador DEBE evaluar los resultados y aplicar estas reglas:

### 2.1 Si la ejecución genera bugs

Cuando los resultados de ejecución incluyen TCs con resultado `FAIL` y se crean bugs:

1. ✅ Crear los bugs en Azure DevOps
2. ✅ Asociar cada bug a la US (relación Related)
3. ✅ Asociar cada bug al TC correspondiente (relación Tested By)
4. ✅ Asociar cada bug a la ejecución (Test Run) si aplica
5. ✅ **Cambiar el estado de la US a `On Hold`**
6. ✅ **Agregar comentario en la US** con detalle de defectos y links a bugs

**Cambio de estado obligatorio:**
```
Testing in progress → On Hold
```

**Herramienta para el cambio de estado:**
```
mcp_ado_wit_update_work_item
id: [us_id]
fields:
  - System.State: "On Hold"
```

**Comentario obligatorio en la US:**
```
🤖 Orquestador QA — Pipeline QA Automatizado — [timestamp]

❌ VALIDACIÓN QA — DEFECTOS ENCONTRADOS

La ejecución de pruebas detectó defectos. Se cambia el estado a On Hold
hasta que los bugs sean resueltos.

## Resumen de ejecución
| Métrica | Valor |
|---|---|
| TCs ejecutados | [n] |
| ✅ Passed | [n] |
| ❌ Failed | [n] |
| ⚠️ Blocked | [n] |

## Bugs creados
| Bug ID | Título | Severidad | TC relacionado |
|---|---|---|---|
| #[bug_id] | [título del bug] | [severidad] | TC #[tc_id] |
| #[bug_id] | [título del bug] | [severidad] | TC #[tc_id] |

## Links directos
- Bug #[bug_id]: [URL del bug en Azure DevOps]
- Bug #[bug_id]: [URL del bug en Azure DevOps]

## Acción requerida
Los bugs deben ser resueltos antes de continuar con la validación QA.
Una vez resueltos, cambiar la US a "Ready for test" para re-ejecutar las pruebas.

Pipeline: [execution_id]
```

---

### 2.2 Si la ejecución no genera bugs (todos los TCs pasan)

Cuando TODOS los TCs ejecutados resultan exitosos (`PASS`) y no se generaron bugs:

Precondiciones obligatorias para pasar a `PO Review`:
- `all_required_tcs_executed == true`
- `failed == 0`
- `blocked == 0`
- `execution_task_state` en `Closed|Done`

Si alguna precondición falla:
- ❌ NO cambiar a `PO Review`
- ✅ Mantener la US en `Testing in progress` o `On Hold` según corresponda
- ✅ Registrar motivo en `decisions_log` y comentario en la US

1. ✅ **Cambiar el estado de la US a `PO Review`**
2. ✅ **Agregar comentario automático** con resumen de ejecución y trazabilidad

**Cambio de estado obligatorio:**
```
Testing in progress → PO Review
```

**Herramienta para el cambio de estado:**
```
mcp_ado_wit_update_work_item
id: [us_id]
fields:
  - System.State: "PO Review"
```

**Comentario obligatorio en la US:**
```
🤖 Orquestador QA — Pipeline QA Automatizado — [timestamp]

✅ VALIDACIÓN QA — COMPLETADA SATISFACTORIAMENTE

Todos los casos de prueba ejecutados resultaron exitosos.
La US pasa a revisión del Product Owner.

## Resumen de ejecución
| Métrica | Valor |
|---|---|
| TCs ejecutados | [n] |
| ✅ Passed | [n] |
| ❌ Failed | 0 |
| ⚠️ Blocked | 0 |
| Tasa de éxito | 100% |

## Test Cases ejecutados
| TC ID | Escenario | Resultado | Evidencia |
|---|---|---|---|
| #[tc_id] | [ESC-HP-01] [descripción] | ✅ PASS | [archivo.png] |
| #[tc_id] | [ESC-ALT-01] [descripción] | ✅ PASS | [archivo.png] |
| #[tc_id] | [ESC-NEG-01] [descripción] | ✅ PASS | [archivo.png] |

## Trazabilidad
- Test Suite: [suite_name] (#[suite_id])
- Test Plan: [plan_name] (#[plan_id])
- Evidencias: outputs/evidencias/[fecha]/

Pipeline: [execution_id]
```

---

### 2.3 Si hay TCs bloqueados sin fallos

Cuando algunos TCs resultan `BLOCKED` pero no hay `FAIL`:

- ✅ Registrar impedimento como comentario en la US
- ❌ NO cambiar el estado de la US a `PO Review` (no todos pasaron)
- ✅ Dejar la US en `Testing in progress` para re-ejecución posterior
- ✅ Registrar en pipeline-state.json como `PARTIAL`

---

### 2.4 Si hay mezcla de PASS, FAIL y BLOCKED

Cuando hay una combinación de resultados:

- ✅ Crear bugs para los TCs `FAIL` (según umbral de confianza)
- ✅ Registrar impedimentos para los TCs `BLOCKED`
- ✅ **Cambiar el estado de la US a `On Hold`** (los bugs tienen prioridad)
- ✅ Agregar comentario con resumen completo (bugs + impedimentos)

---

## 3. Diagrama de Transiciones de Estado

```
                    ┌─────────────┐
                    │  Rejected   │ → IGNORAR (no procesar)
                    └─────────────┘

┌──────┐   ┌─────────┐   ┌─────────────┐
│ New  │   │ On Hold │   │ Code Review │
└──┬───┘   └────┬────┘   └──────┬──────┘
   │            │               │
   └────────────┼───────────────┘
                │
                ▼
        Solo crear QA Tasks
        (NO ejecutar, NO cambiar estado)
                │
                ▼
        ┌───────────────┐
        │ Ready for test│ ← (dev mueve la US aquí)
        └───────┬───────┘
                │
                ▼ Cambiar estado → Testing in progress
        ┌───────────────────────┐
        │ Testing in progress   │ ← Ejecutar TCs
        └───────┬───────────────┘
                │
        ┌───────┴───────┐
        │               │
        ▼               ▼
  Todos PASS       Hay FAIL/bugs
        │               │
        ▼               ▼
  ┌──────────┐    ┌──────────┐
  │ PO Review│    │ On Hold  │ + Comentario con links de bugs
  └──────────┘    └──────────┘
                        │
                        ▼ (dev resuelve bugs)
                  ┌──────────────┐
                  │Ready for test│ ← (dev mueve de vuelta)
                  └──────────────┘
```

---

## 4. Configuración de Transiciones

Las transiciones de estado están configuradas en `inputs/project-config.json`:

```json
{
  "policies": {
    "state_transitions": {
      "on_execution_start": {
        "from": ["Ready for test"],
        "to": "Testing in progress",
        "comment_required": true
      },
      "on_all_pass": {
        "from": ["Testing in progress"],
        "to": "PO Review",
        "comment_required": true
      },
      "on_bugs_found": {
        "from": ["Testing in progress"],
        "to": "On Hold",
        "comment_required": true,
        "include_bug_links": true
      }
    },
    "task_only_states": ["New", "On Hold", "Code Review"],
    "no_action_states": ["Rejected", "Pending definition"]
  }
}
```

---

## 5. Reglas de Seguridad

### 5.1 Prevención de transiciones inválidas
- ❌ NUNCA cambiar una US de `New` a `Testing in progress` directamente
- ❌ NUNCA cambiar una US de `On Hold` a `PO Review` sin ejecutar pruebas
- ❌ NUNCA cambiar una US de `Rejected` a cualquier otro estado
- ✅ Solo cambiar estados que están explícitamente definidos en `state_transitions`

### 5.2 Verificación antes de cambiar estado
Antes de cambiar el estado de una US, el sistema DEBE verificar:
1. El estado actual de la US coincide con el `from` configurado
2. Existe evidencia que justifique el cambio (resultados de ejecución)
3. El cambio está registrado en decisions_log
4. Se incluye un comentario automático con la firma del agente

### 5.3 Rollback de estado
Si una operación de cambio de estado falla:
- Registrar el error en pipeline-state.json
- Reintentar hasta `policies.max_retries_on_mcp_failure` veces
- Si todos los reintentos fallan, registrar como ERROR y continuar
- NUNCA dejar la US en un estado intermedio inconsistente

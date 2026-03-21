# Motor de Decisiones del Orquestador

## Objetivo
Definir la lógica de decisión que el Agente Orquestador aplica para cada User Story, determinando dinámicamente qué actividades ejecutar y cuáles omitir, según el estado real de la US y los artefactos ya existentes en Azure DevOps.

---

## 1. Diagrama del Motor de Decisiones

```
┌─────────────────────────────────────────────────────────────┐
│                    MOTOR DE DECISIONES                        │
│                                                               │
│  Input: US ID + project-config.json + pipeline-state.json     │
│                                                               │
│  ┌──────────┐    ┌──────────────┐    ┌──────────────────┐    │
│  │ 1. Leer  │───▶│ 2. Detectar  │───▶│ 3. Clasificar    │    │
│  │ US de    │    │ artefactos   │    │ estado QA        │    │
│  │ Azure    │    │ existentes   │    │ de la US         │    │
│  └──────────┘    └──────────────┘    └────────┬─────────┘    │
│                                                │              │
│                                     ┌──────────▼─────────┐   │
│                                     │ 4. Determinar      │   │
│                                     │ acciones            │   │
│                                     │ necesarias          │   │
│                                     └──────────┬─────────┘   │
│                                                │              │
│                              ┌─────────────────┼────────┐    │
│                              ▼                 ▼        ▼    │
│                        ┌──────────┐     ┌────────┐ ┌──────┐ │
│                        │ Ejecutar │     │ SKIP   │ │BLOCK │ │
│                        │ agente   │     │        │ │      │ │
│                        └──────────┘     └────────┘ └──────┘ │
│                                                               │
│  Output: decisions_log + pipeline-state actualizado           │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Árbol de Decisiones por Estado de la US

### 2.1 Nodo raíz: Estado de la US en Azure DevOps

```
US.state
├── Rejected → IGNORAR (motivo: "estado Rejected — sin acción")
├── Pending definition → IGNORAR (motivo: "sin definición — sin acción")
├── On Hold → EVALUAR_COMENTARIOS
│   ├── Bloqueo activo → BLOQUEAR (registrar impedimento)
│   └── Informativo → SOLO_TASKS (crear QA Tasks si faltan, NO ejecutar)
├── New / Doing / Code Review → SOLO_TASKS (crear QA Tasks si faltan, NO ejecutar, NO cambiar estado)
├── Ready for test → PIPELINE_EJECUCION (crear TCs si faltan + ejecutar + cambiar estado a Testing in progress)
├── Testing in progress → CONTINUAR_EJECUCION (ejecutar TCs pendientes)
├── PO Review / Done / Closed → COMPLETADA
└── [Otro estado] → EVALUAR según policies.processable_us_states
```

> **REGLA CRÍTICA — Estados `New`, `On Hold`, `Code Review`:**
> Cuando la US está en `task_only_states`, el sistema SOLO crea QA Tasks.
> NO crea Test Cases, NO ejecuta pruebas, NO cambia el estado de la US.
> Si las QA Tasks ya existen, no se fuerza ejecución ni se avanza el flujo.
>
> **REGLA CRÍTICA — Estado `Rejected`:**
> El sistema NO realiza ninguna tarea. NO crea tasks, NO crea TCs,
> NO ejecuta pruebas, NO cambia el estado. Solo registra en trazabilidad.
>
> **REGLA CRÍTICA — Estado `Ready for test`:**
> El sistema crea TCs (si no existen), ejecuta las pruebas, y cambia
> el estado a `Testing in progress`. Después de la ejecución, aplica
> las reglas de transición post-ejecución (ver sección 6).

### 2.4 Nueva decisión formal: `EXECUTE_PENDING`

Definición:
```
ACTION = EXECUTE_PENDING
```

Condición obligatoria:
- `US.state == "Ready for test"`
- Todos los TCs requeridos están en `Ready`
- `execution_task.state` en `New|To Do|Doing`
- No existe run completa (`test_runs_count == 0` o `has_pending_tcs == true`)

Comportamiento:
- Iniciar transición `Ready for test -> Testing in progress`
- Delegar inmediatamente al Agente Ejecutor
- Registrar en `decisions_log` con `next_agent = "Ejecutor"` y `next_action = "EXECUTE_PENDING"`

Precondición obligatoria de ownership QA:
- La QA Task de ejecución debe estar asignada al usuario autenticado en el MCP de Azure DevOps.
- Si `execution_owner != mcp_user`:
  - NO ejecutar Test Cases.
  - NO crear Test Runs.
  - NO cambiar estado de la US.
  - Registrar `SKIP` con `reason = "EXECUTION_OWNERSHIP_MISMATCH"` y `skip_reason_code = "EXECUTION_OWNERSHIP_MISMATCH"`.
  - Agregar comentario en la US indicando que se requiere reasignación explícita o ejecución por el QA owner actual.
- Excepciones permitidas:
  1. Instrucción explícita del usuario para ejecutar aun sin ser owner.
  2. Reasignación explícita y auditada de la QA Task de ejecución.

Regla de SKIP:
- `SKIP` solo aplica para US realmente completadas (`PO Review|Done|Closed`) o no procesables (`Rejected|Pending definition`).

### 2.2 Nodo: Validación de contenido

```
Si la US debe procesarse:
├── ¿Tiene description? → NO → BLOQUEAR (campo faltante)
├── ¿Tiene acceptance_criteria? → NO → BLOQUEAR (campo faltante)
├── ¿Contiene keywords técnicas? → SI → IGNORAR (US técnica)
└── TODO OK → Continuar a detección de artefactos
```

### 2.3 Nodo: Detección de artefactos existentes

```
Para la US validada:
├── ¿Existen QA Tasks hijas?
│   ├── Análisis: { existe: bool, id, estado }
│   ├── Diseño: { existe: bool, id, estado }
│   └── Ejecución: { existe: bool, id, estado }
├── ¿Existen Test Suites vinculadas?
│   └── { id, nombre, cantidad_tcs }
├── ¿Existen Test Cases vinculados?
│   └── { id, título, estado, automation_status }
├── ¿Existen Test Runs?
│   └── { id, estado, resultados }
├── ¿Existen Bugs vinculados?
│   └── { id, título, estado, severidad }
├── ¿Existen comentarios QA?
│   └── { id, texto, fecha, autor }
└── ¿Existen evidencias adjuntas?
    └── { id, nombre_archivo, adjunto_a }
```

---

## 3. Matriz de Decisiones por Combinación de Estado

### 3.1 Decisiones para el Agente Ingestor

| QA Task Análisis | QA Task Diseño | QA Task Ejecución | Decisión |
|---|---|---|---|
| No existe | No existe | No existe | Crear las 3 tasks |
| Existe (New) | No existe | No existe | Crear diseño + ejecución |
| Existe (Closed) | Existe (New) | No existe | Crear solo ejecución |
| Existe (Closed) | Existe (Closed) | Existe (New) | No crear nada — tasks completas |
| Existe (Closed) | Existe (Closed) | Existe (Closed) | No crear nada — todo completo |
| Existe (Error) | * | * | Reabrir análisis, evaluar |

### 3.2 Decisiones para el Agente de Análisis

| QA Task Análisis | Contenido | Decisión |
|---|---|---|
| New | Vacío | Ejecutar análisis ISTQB completo |
| Doing | Parcial | Completar las secciones faltantes |
| Closed | 10 secciones completas | SKIP — análisis completo |
| Closed | Contenido incompleto | Reabrir, completar |
| No existe | — | Crear task + ejecutar análisis |

### 3.3 Decisiones para el Agente Diseñador

| Test Suite | Test Cases | QA Task Diseño | Decisión |
|---|---|---|---|
| No existe | 0 | New | Crear suite + diseñar TCs |
| Existe | 0 | New/Doing | Poblar suite con TCs |
| Existe | Parciales | New/Doing | Crear TCs faltantes |
| Existe | Completos (Ready) | New/Doing | Cerrar task, SKIP diseño |
| Existe | Completos (Ready) | Closed | SKIP todo |
| No existe | TC sueltos (sin suite) | * | Crear suite + agregar TCs existentes |

### 3.4 Decisiones para el Agente Ejecutor

| Test Cases | Test Runs | Resultados | Decisión |
|---|---|---|---|
| Ready | No hay runs | — | Ejecutar todos los TCs |
| Ready | Run parcial | Mix | Ejecutar TCs no ejecutados |
| Ready | Run completo | Todos PASS | SKIP ejecución |
| Ready | Run completo | Hay FAIL | Evaluar para bugs |
| Ready | Run completo | Hay BLOCKED | Registrar impedimentos |
| Design | — | — | BLOQUEAR (TCs incompletos) |

### 3.5 Decisiones para el Agente de Bugs

| TC fallido | Bug existente | Confianza | Decisión |
|---|---|---|---|
| FAIL | No existe | >= threshold | Crear bug |
| FAIL | No existe | < threshold | Registrar hallazgo como comentario |
| FAIL | Existe (Active) | — | SKIP (duplicado) |
| FAIL | Existe (Closed) | >= threshold | Evaluar si reabrir o crear nuevo |
| BLOCKED | — | — | Registrar impedimento, no crear bug |

---

## 4. Flujo de Procesamiento por Sprint

```
INICIO
  │
  ▼
[1] Leer project-config.json
  │
  ▼
[2] Leer/crear pipeline-state.json
  │
  ▼
[3] Obtener todas las US del sprint desde Azure DevOps
  │
  ▼
[4] PARA CADA US:
  │
  ├──▶ [4.1] Leer US completa (campos + relations)
  │
  ├──▶ [4.2] Validar contenido (description, criteria)
  │     ├── FALLA → BLOQUEAR + comentario en Azure
  │     └── OK → continuar
  │
  ├──▶ [4.3] Filtrar por keywords técnicas
  │     ├── MATCH → IGNORAR
  │     └── NO MATCH → continuar
  │
  ├──▶ [4.4] Clasificar por estado
  │     ├── IGNORAR → registrar y pasar a siguiente US
  │     └── PROCESAR → continuar
  │
  ├──▶ [4.5] DETECTAR artefactos existentes
  │     ├── QA Tasks existentes → registrar
  │     ├── Test Suites existentes → registrar
  │     ├── Test Cases existentes → registrar
  │     ├── Test Runs existentes → registrar
  │     ├── Bugs existentes → registrar
  │     ├── Comentarios QA → registrar
  │     └── Evidencias → registrar
  │
  ├──▶ [4.6] DECIDIR acciones por agente
  │     ├── ¿Necesita tasks? → Ingestor
  │     ├── ¿Necesita análisis? → Análisis
  │     ├── ¿Necesita diseño? → Diseñador
  │     ├── ¿Necesita ejecución? → Ejecutor
  │     ├── ¿Necesita bugs? → Bug Reporter
  │     └── ¿Necesita evidencias? → Evidence Manager
  │
  ├──▶ [4.7] EJECUTAR agentes necesarios en orden
  │
  └──▶ [4.8] REGISTRAR decisiones y resultados
  │
  ▼
[5] Actualizar pipeline-state.json
  │
  ▼
[6] Generar reportes
  │
  ▼
FIN
```

---

## 5. Reglas del Motor de Decisiones

### 5.1 Regla de mínima intervención
El motor SOLO ejecuta las acciones estrictamente necesarias. Si un artefacto ya existe y está completo, no se toca.

### 5.2 Regla de continuidad
Si el pipeline se interrumpió, el motor reanuda EXACTAMENTE desde el punto de interrupción, sin repetir trabajo completado.

### 5.3 Regla de priorización
Las US se procesan en este orden de prioridad:
1. `EXECUTE_PENDING` (US listas para ejecutar y sin run completa)
2. `IN_EXECUTION` (continuar TCs pendientes)
3. Diseño pendiente
4. Análisis pendiente
5. Nuevas sin artefactos

### 5.4 Regla de corte por errores
Si más del 50% de las US de un sprint tienen errores de MCP, el pipeline se detiene y notifica al equipo. Esto previene cascadas de errores por problemas de conectividad o permisos.

### 5.5 Regla de coherencia de artefactos
Si se detectan artefactos huérfanos (ej: TCs sin suite, tasks sin parent), el motor los vincula antes de continuar.

### 5.6 Regla de restricción por estado — Solo Tasks
Si la US está en estado `New`, `On Hold` o `Code Review` (definidos en `policies.task_only_states`):
- El motor SOLO permite crear QA Tasks (análisis, diseño, ejecución)
- El motor NO permite crear Test Cases, ejecutar pruebas ni cambiar el estado de la US
- Si las QA Tasks ya existen, el motor no fuerza ejecución ni avanza el flujo

### 5.7 Regla de exclusión por estado — Sin acción
Si la US está en estado `Rejected` o `Pending definition` (definidos en `policies.no_action_states`):
- El motor NO realiza ninguna acción sobre la US
- Se registra en decisions_log como `SKIP` con motivo `"estado no procesable"`

---

## 6. Reglas de Transición de Estado de la US (Post-Ejecución)

Ver documento completo: `references/reglas-transiciones.md`

### 6.1 Al iniciar la ejecución
Cuando el Agente Ejecutor comienza a ejecutar TCs de una US en estado `Ready for test`:
- **Cambiar estado:** `Ready for test` → `Testing in progress`
- **Comentario obligatorio:** Resumen de ejecución iniciada con cantidad de TCs y plataformas

### 6.2 Si la ejecución detecta bugs
Cuando la ejecución genera TCs con resultado `FAIL` y se crean bugs:
- **Cambiar estado:** `Testing in progress` → `On Hold`
- **Comentario obligatorio:** Resumen de defectos encontrados con links directos a los bugs creados
- **Incluir en el comentario:**
  - Tabla de bugs con ID, título, severidad y TC relacionado
  - Links directos a cada bug en Azure DevOps
  - Instrucciones para re-ejecutar después de resolver los bugs

### 6.3 Si todos los TCs pasan sin bugs
Cuando TODOS los TCs ejecutados resultan `PASS` y no se generaron bugs:
- **Cambiar estado:** `Testing in progress` → `PO Review`
- **Comentario obligatorio:** Resumen de ejecución exitosa con trazabilidad completa
- **Incluir en el comentario:**
  - Tabla de TCs ejecutados con resultado y evidencia
  - Trazabilidad a Test Suite y Test Plan
  - Confirmación de que la validación QA fue satisfactoria

### 6.4 Si hay TCs bloqueados sin fallos
Cuando hay TCs `BLOCKED` pero no hay `FAIL`:
- **NO cambiar estado** — la US permanece en `Testing in progress`
- **Comentario:** Registrar impedimentos detectados
- **Registrar en pipeline-state.json como `PARTIAL`**

### 6.5 Configuración de transiciones
Las transiciones están definidas en `policies.state_transitions` de `inputs/project-config.json`.
Solo se ejecutan transiciones explícitamente configuradas — no hay transiciones implícitas.

---

## 7. Parámetros de Configuración del Motor

Todos los parámetros provienen de `inputs/project-config.json`:

| Parámetro | Ubicación | Uso |
|---|---|---|
| `organization.url` | config | Conectar con Azure DevOps |
| `project.name` | config | Filtrar work items |
| `project.team` | config | Filtrar por equipo |
| `project.iteration_path` | config | Filtrar por sprint |
| `qa_assignee.source` | config | Fuente de identidad: `"mcp_authenticated_user"` o `"manual"` |
| `qa_assignee.email` | config | Asignar artefactos creados (solo si source es `"manual"`) |
| `execution.mode` | config | Determinar stages a ejecutar |
| `execution.user_stories` | config | Lista explícita de US (si vacía, todas del sprint) |
| `policies.task_only_states` | config | Estados donde solo se crean QA Tasks (sin ejecución) |
| `policies.no_action_states` | config | Estados donde no se realiza ninguna acción |
| `policies.state_transitions.*` | config | Transiciones de estado de la US post-ejecución |
| `policies.*` | config | Reglas de negocio y umbrales |
| `naming_conventions.*` | config | Nombres de artefactos |
| `fields_mapping.*` | config | Campos custom del proyecto |

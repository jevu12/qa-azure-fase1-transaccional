# Arquitectura Fase 1 (Transaccional Azure DevOps)

## Objetivo
Eliminar acciones manuales de QA dentro de Azure DevOps, manteniendo trazabilidad e idempotencia.

## Capacidad incluida
- Lectura de US desde Azure DevOps.
- Creación de QA Tasks (análisis, diseño, ejecución).
- Creación/ubicación de Test Plan y Test Suite.
- Creación de Test Cases en Azure Test Plans.
- Vinculación automática entre US, Tasks y Test Cases.

## Capacidad excluida en Fase 1
- Generación de código automatizado.
- Flujo de PR automático.
- Exploración móvil/Appium.
- Clasificación avanzada de resultados.

## Principios operativos
- Azure DevOps first: el estado oficial vive en ADO.
- Agentes especializados: cada acción con objetivo y salida definidos.
- Idempotencia: no recrear artefactos equivalentes.
- Trazabilidad end-to-end: toda acción con evidencia en `decisions_log`.

## Resultado esperado de Fase 1
- Desaparece la carga manual por CSV como mecanismo principal.
- El pipeline deja artefactos QA completos y vinculados directamente en Azure DevOps.

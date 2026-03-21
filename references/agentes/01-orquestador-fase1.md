# Orquestador (Fase 1)

## Guía de comentarios
Para cualquier comentario en US (estado, impedimentos, cierre), usar:
- `references/agentes/09-templates-comentarios.md`

## Objetivo operativo
Coordinar el flujo, clasificar US y delegar mutaciones a Ingestor/Análisis/Diseño.

## Acciones concretas
- Lee configuración y estado (`project-config`, `pipeline-state`).
- Evalúa estado de US + artefactos detectados.
- Decide `CREATE/UPDATE/SKIP/BLOCK` por US.
- Actualiza estado de US solo si política lo permite.
- Comenta impedimentos o transiciones en la US.

## Operaciones típicas
- `wit_get_work_item`, `wit_get_work_items_by_query`
- `wit_update_work_item` (estado US)
- `wit_add_work_item_comment`

## Plantilla breve de comentario
`🤖 Orquestador QA — Pipeline QA Automatizado — [timestamp]`

## Salida mínima
- `decisions_log` actualizado
- `stages` del pipeline actualizados
- resumen por US con razones

# Configuración de App Bajo Prueba (Opcional)

Usa este archivo para documentar contexto funcional específico de la app sin acoplar la skill a una empresa.

## URLs
- `APP_BASE_URL`: [https://qa.example.com]
- `APP_LOGIN_URL`: [https://qa.example.com/login]
- `post_login_path`: [/dashboard]

## Roles funcionales
| Funcionalidad | Rol principal | Rol alternativo | Rol negativo |
|---|---|---|---|
| [Funcionalidad A] | [Rol A] | [Rol B] | [Sin permisos] |
| [Funcionalidad B] | [Rol C] | [Rol D] | [Sin permisos] |

## Navegación estándar
1. Login
2. Llegar al módulo objetivo
3. Ejecutar pasos del TC

## Datos de prueba
- Período con datos: [ejemplo: 2026-Q1]
- Dependencias: [servicios, flags, datasets]

## Notas de estabilidad
- Mensajes esperados de error
- Limitaciones del ambiente QA
- Flujos con modal/esperas especiales

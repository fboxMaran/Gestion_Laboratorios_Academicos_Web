# Base de Datos - Sistema de Gestión de Laboratorios Académicos# 🎯 CONFIGURACIÓN COMPLETA DE BASE DE DATOS



## 📋 Descripción General## ✅ SCRIPT ÚNICO: `setup_completo.sql`



Este directorio contiene el script SQL definitivo para la base de datos del sistema de gestión de laboratorios académicos. El script es **idempotente** y puede ejecutarse múltiples veces sin errores.Este archivo contiene **ABSOLUTAMENTE TODO** lo necesario para configurar la base de datos:

- ✅ 32 tablas con estructura completa

## 📁 Archivos- ✅ 15 índices optimizados

- ✅ Tabla de autenticación con contraseñas válidas

- **`schema.sql`**: Script completo de creación de base de datos con datos de prueba- ✅ 4 usuarios de prueba con password: **`demo123`**

- **`pool.js`**: Configuración de conexión a PostgreSQL- ✅ 5 laboratorios con recursos

- ✅ Datos de ejemplo (solicitudes, notificaciones, actividades)

## 🗄️ Estructura de la Base de Datos

---

### Tablas Principales (32 tablas)

## 🚀 EJECUCIÓN (Un Solo Comando)

#### **1. Gestión de Usuarios**

- `role`: Roles del sistema (Estudiante, Docente, EncargadoTecnico, Admin)### Desde el directorio: `apps/api/`

- `app_user`: Información de usuarios

- `app_user_auth`: Credenciales de autenticación**Si la base de datos NO existe:**

- `user_activity`: Historial de actividades del usuario```powershell

- `user_certification`: Certificaciones de usuariospsql -U postgres -h localhost -c "CREATE DATABASE gestion_laboratorios;"

psql -U postgres -h localhost -d gestion_laboratorios -f "src\db\setup_completo.sql"

#### **2. Gestión de Laboratorios**```

- `lab`: Información de laboratorios

- `lab_history`: Historial de cambios en laboratorios**Si quieres REINICIAR la base de datos:**

- `lab_open_hours`: Horarios de operación```powershell

- `lab_policy`: Políticas y requisitospsql -U postgres -h localhost -c "DROP DATABASE IF EXISTS gestion_laboratorios;"

- `lab_responsible`: Responsables de cada laboratoriopsql -U postgres -h localhost -c "CREATE DATABASE gestion_laboratorios;"

psql -U postgres -h localhost -d gestion_laboratorios -f "src\db\setup_completo.sql"

#### **3. Gestión de Recursos**```

- `resource`: Equipos, consumibles y software

- `resource_photo`: Fotos de recursos---

- `consumable_stock`: Control de inventario

- `inventory_move`: Movimientos de inventario## 👥 USUARIOS DE PRUEBA



#### **4. Gestión de Solicitudes****TODOS con contraseña:** `demo123`

- `request`: Solicitudes de uso

- `request_item`: Items individuales de cada solicitud| ID | Nombre | Email | Rol | Password |

- `request_action`: Acciones sobre solicitudes (aprobar/rechazar)|----|--------|-------|-----|----------|

- `request_attachment`: Archivos adjuntos| 1 | Maria Gonzalez Perez | usuario@demo.edu | Estudiante | demo123 |

| 2 | Dr. Carlos Ramirez Lopez | profesor@itcr.ac.cr | Docente | demo123 |

#### **5. Gestión de Préstamos**| 3 | Juan Tecnico Mora | tecnico@demo.edu | EncargadoTecnico | demo123 |

- `loan`: Préstamos de recursos| 4 | Ana Admin Castro | admin@itcr.ac.cr | Admin | demo123 |

- `loan_item`: Items prestados

- `calendar_slot`: Bloques de tiempo en calendario---



#### **6. Mantenimiento**## ✅ VERIFICACIÓN

- `maintenance`: Registros de mantenimiento

- `maintenance_part`: Consumibles usados en mantenimiento### 1. Verificar que las tablas se crearon:

```powershell

#### **7. Comunicación y Notificaciones**psql -U postgres -h localhost -d gestion_laboratorios -c "\dt"

- `notification`: Notificaciones del sistema```

- `message_thread`: Hilos de conversación**Resultado esperado:** Lista de 32 tablas

- `message`: Mensajes individuales

### 2. Verificar usuarios:

#### **8. Auditoría y Sistema**```powershell

- `audit_log`: Auditoría de accionespsql -U postgres -h localhost -d gestion_laboratorios -c "SELECT id, full_name, email FROM app_user;"

- `publish_changelog`: Registro de cambios publicados```

- `system_setting`: Configuraciones del sistema**Resultado esperado:** 4 usuarios

- `school_department`: Escuelas/Departamentos

- `availability_subscription`: Suscripciones a disponibilidad### 3. Verificar contraseñas:

- `academic_benefit`: Beneficios académicos obtenidos```powershell

psql -U postgres -h localhost -d gestion_laboratorios -c "SELECT COUNT(*) FROM app_user_auth;"

## 🔑 Modificaciones Respecto al Diseño Original```

**Resultado esperado:** 4 registros

### 1. Tabla `app_user`

- ✅ **Agregado**: Columna `phone` (VARCHAR 40) para teléfono de contacto### 4. Probar login desde web:

- ✅ **Agregado**: Columna `institutional` (BOOLEAN) para usuarios internos/externos- Abrir: `apps/web/test-api.html` en el navegador

- 📝 **Razón**: Facilitar contacto y diferenciar tipos de usuarios- Presionar: "Login con usuario@demo.edu"

- **Resultado esperado:** ✅ Login exitoso con token JWT

### 2. Tabla `notification`

- ✅ **Agregado**: Columna `read_at` (TIMESTAMP) para tracking de lectura---

- ✅ **Modificado**: Constraint `channel` limitado a 'EMAIL' o 'INTERNA'

- 📝 **Razón**: Mejorar UX mostrando notificaciones leídas vs no leídas## 🔐 HASH DE CONTRASEÑAS



### 3. Tabla `request`Las contraseñas están hasheadas con **bcrypt (cost=10)**:

- ✅ **Agregado**: Columna `role_snapshot` (VARCHAR 40) para guardar rol al momento- Algoritmo: bcrypt

- ✅ **Agregado**: Columna `requirements_ok` (BOOLEAN) para validación de requisitos- Cost factor: 10

- 📝 **Razón**: Auditoría y control de permisos por rol- Password: `demo123`

- Hash válido: `$2b$10$ldiExnm2m8DIb7KN7XslIulmmOpnyeRex3/zw9zsItPJO8kgVhhWy`

### 4. Tabla `user_activity` (NUEVA)

- ✅ **Nueva tabla** para historial de actividades del usuario**Este hash es REAL y FUNCIONAL** - no es un placeholder.

- ✅ **Tipos**: RESERVA, PRESTAMO, DEVOLUCION, CAPACITACION

- 📝 **Razón**: Tracking completo de interacciones del usuario con el sistema---



## 🚀 Instalación y Configuración## 📊 CONTENIDO DE LA BASE DE DATOS



### Requisitos Previos### Catálogos:

- PostgreSQL 17.x instalado- 4 roles: Estudiante, Docente, EncargadoTecnico, Admin

- Usuario con permisos para crear bases de datos- 5 departamentos académicos

- Base de datos `gestion_laboratorios` creada

### Laboratorios:

### Pasos de Instalación- 5 laboratorios completos con:

  - Responsables

1. **Crear la base de datos** (si no existe):  - Políticas de uso

```bash  - Horarios de apertura

psql -U postgres

CREATE DATABASE gestion_laboratorios;### Recursos:

\q- 8 equipos (routers, switches, osciloscopios, etc.)

```- 4 consumibles (cables, químicos, placas)

- 3 software (Packet Tracer, MATLAB, ChemDraw)

2. **Ejecutar el script**:

```bash### Datos de Prueba:

psql -U postgres -d gestion_laboratorios -f schema.sql- 3 solicitudes de ejemplo

```- 4 notificaciones

- 4 actividades de usuario

3. **Verificar la instalación**:- 5 configuraciones del sistema

```bash

psql -U postgres -d gestion_laboratorios -c "\dt"---

```

## ⚠️ IMPORTANTE

Deberías ver las 32 tablas creadas.

### ✅ LO QUE SÍ DEBES HACER:

## 👥 Usuarios de Prueba1. Ejecutar el script `setup_completo.sql` una sola vez

2. Usar la contraseña `demo123` para login

Todos los usuarios tienen la contraseña: **`demo123`**3. Verificar que el servidor backend esté corriendo



| Email | Rol | Descripción |### ❌ LO QUE NO DEBES HACER:

|-------|-----|-------------|1. ❌ NO ejecutar `schema.sql` (archivo ignorado)

| `usuario@demo.edu` | Estudiante | Juan Pablo Cambronero |2. ❌ NO ejecutar `seed_data.sql` (ya eliminado, todo está en setup_completo.sql)

| `mgonzalez@estudiantec.cr` | Estudiante | Maria Gonzalez Perez |3. ❌ NO ejecutar scripts adicionales (no son necesarios)

| `pjimenez@estudiantec.cr` | Estudiante | Pedro Jimenez Vargas |4. ❌ NO modificar manualmente las contraseñas en la BD

| `profesor@itcr.ac.cr` | Docente | Dr. Carlos Ramirez Lopez |

| `smorales@itcr.ac.cr` | Docente | Dra. Sofia Morales |---

| `tecnico@demo.edu` | EncargadoTecnico | Juan Tecnico Mora |

| `lmartinez@itcr.ac.cr` | EncargadoTecnico | Luis Martinez Tech |## 🔄 SI NECESITAS REINICIAR

| `admin@itcr.ac.cr` | Admin | Ana Admin Castro |

```powershell

## 🏗️ Datos de Prueba Incluidos# Ejecutar desde: apps/api/



El script incluye datos realistas para pruebas:# 1. Borrar base de datos

psql -U postgres -h localhost -c "DROP DATABASE gestion_laboratorios;"

- **5 Escuelas/Departamentos**: Computación, Electrónica, Química, Física, Biología

- **8 Usuarios**: Distribuidos en los 4 roles del sistema# 2. Crear nueva

- **5 Laboratorios**: Con horarios, políticas y responsablespsql -U postgres -h localhost -c "CREATE DATABASE gestion_laboratorios;"

- **25 Recursos**: Equipos, consumibles y software

- **5 Solicitudes**: En diferentes estados (Pendiente, Aprobada, En Revisión)# 3. Aplicar configuración completa

- **7 Actividades de Usuario**: Reservas, préstamos, devoluciones, capacitacionespsql -U postgres -h localhost -d gestion_laboratorios -f "src\db\setup_completo.sql"

```

## 🔄 Flujo de Estados

---

### Estados de Solicitud

```## 📝 NOTAS TÉCNICAS

PENDIENTE → EN_REVISION → APROBADA

                        → RECHAZADA### Estructura de Autenticación:

            ↓- Tabla principal: `app_user` (datos del usuario)

         CANCELADA (en cualquier momento)- Tabla de auth: `app_user_auth` (contraseñas hasheadas)

```- Relación: `app_user_auth.user_id` → `app_user.id`



### Estados de Recurso### Roles en la BD:

- **DISPONIBLE**: Puede ser solicitado```sql

- **RESERVADO**: Asignado a solicitud aprobadaSELECT * FROM role;

- **EN_MANTENIMIENTO**: No disponible temporalmente```

- **INACTIVO**: Fuera de servicio| id | name |

|----|------|

### Estados de Préstamo| 1 | Estudiante |

```| 2 | Docente |

PENDIENTE → ENTREGADO → DEVUELTO| 3 | EncargadoTecnico |

                      → INCIDENCIA| 4 | Admin |

```

### Índices Creados:

## 📊 Índices Importantes- 15 índices para optimizar búsquedas

- Índices en: email, lab_id, resource_id, timestamps, etc.

El script crea índices optimizados para:

- Búsquedas por email de usuario---

- Consultas de disponibilidad de recursos

- Filtros por estado de solicitudes## 🎉 RESULTADO FINAL

- Historial de actividades por usuario

- Auditoría por fechaDespués de ejecutar `setup_completo.sql`:

- Notificaciones por usuario- ✅ 32 tablas creadas

- ✅ 15 índices creados

## 🔒 Seguridad- ✅ 4 roles insertados

- ✅ 5 departamentos insertados

- Las contraseñas están hasheadas con bcrypt (factor 10)- ✅ 4 usuarios insertados

- Todas las tablas relacionadas con usuarios tienen `ON DELETE CASCADE` apropiado- ✅ 4 contraseñas hasheadas insertadas

- Constraints CHECK aseguran integridad de datos- ✅ 5 laboratorios insertados

- Foreign Keys mantienen consistencia referencial- ✅ 15 recursos insertados

- ✅ Datos de ejemplo insertados

## 🧪 Testing

**TODO EN UN SOLO SCRIPT. TODO FUNCIONAL.** 🚀

Para verificar que todo funciona correctamente:

```sql
-- Verificar usuarios
SELECT id, full_name, email, role_id FROM app_user;

-- Verificar laboratorios
SELECT id, name, internal_code FROM lab;

-- Verificar recursos por tipo
SELECT type, COUNT(*) FROM resource GROUP BY type;

-- Verificar solicitudes
SELECT id, status, created_at FROM request;
```

## 📝 Notas para el Equipo

1. **Entorno de Desarrollo**: Pueden usar estos datos de prueba libremente
2. **Producción**: Deben eliminar o modificar los datos de prueba antes de deployment
3. **Credenciales**: Cambiar todas las contraseñas en ambiente productivo
4. **Backup**: Configurar backup automático diario de la base de datos
5. **Migraciones**: Para cambios futuros, crear scripts de migración incrementales

## 🐛 Troubleshooting

### Error: "database gestion_laboratorios does not exist"
**Solución**: Crear la base de datos primero con `CREATE DATABASE gestion_laboratorios;`

### Error: "role 'postgres' does not exist"
**Solución**: Usar el usuario correcto de PostgreSQL: `psql -U tu_usuario ...`

### Error: "relation already exists"
**Solución**: El script es idempotente, ejecuta todo el script completo desde el inicio

### Problemas de encoding
**Solución**: Asegurar que la BD use UTF8: `SET client_encoding = 'UTF8';`

## 📞 Contacto

Para dudas sobre la estructura de la base de datos, contactar al responsable del módulo de backend.

---

**Última actualización**: Noviembre 2025  
**Versión**: 1.0  
**Mantenedor**: Equipo de Desarrollo - Gestión de Laboratorios Académicos

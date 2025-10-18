# 📌 Asignación Detallada de Trabajo

## 👤 Persona 1
### Módulo 4: Administradores del sistema
- **Gestión de usuarios y roles:** estructura de roles, alta/baja de cuentas, permisos.  
- **Parámetros globales:** reservas, etiquetas, notificaciones, políticas de mantenimiento.  
- **Supervisión y auditoría:** bitácoras, filtros, alertas críticas.  
- **Reportes institucionales:** uso por periodo, inventario, desempeño.  

### Módulo 1.3: Gestión de Solicitudes y Reservas
- Lista de solicitudes (campos, filtros).  
- Validación de requisitos vs políticas.  
- Acciones: aprobar, rechazar, solicitar info.  
- Integración con inventario y registro histórico.  

### Módulo 1.4: Control de Recursos y Beneficios
- Asignación de recursos aprobados.  
- Devoluciones e inventario automático.  
- Trazabilidad recurso ↔ reserva ↔ usuario.  
- Reportes automáticos por laboratorio/recurso.  

### Requerimientos transversales
- Autenticación institucional.  
- Persistencia e integridad de datos.  
- Lineamientos de auditoría.  
- Notificaciones clave.  

---

## 👤 Marlon
### Módulo 1.1: Perfiles de Laboratorio
- Registro de perfiles, responsables y contactos.  
- Inventario de equipos y consumibles.  
- Políticas internas (requisitos, horarios, capacidad).  
- Historial del laboratorio.  

### Módulo 1.2: Disponibilidad y Recursos
- Gestión de calendario (bloques disponibles/bloqueados).  
- Publicación de catálogo y fichas técnicas.  
- Estados: Disponible, Reservado, En mantenimiento, Inactivo.  
- Botón de solicitud, bitácora de cambios, notificaciones.  

---

## 👤 Persona 3
### Módulo 2: Personal Técnico
- **Solicitudes aprobadas:** validación, registro de entregas/devoluciones, notificaciones.  
- **Inventario:** alta/baja/edición, consumibles, movimientos, sincronización.  
- **Mantenimientos:** programación, registro, cambios de estado, historial, notificaciones.  
- **Reportes:** uso, stock, mantenimiento, exportación PDF/Excel.  

---

## 👤 Persona 4
### Módulo 3: Usuarios
- **Perfiles:** registro institucional, historial, propagación de datos.  
- **Búsqueda:** filtros, calendario, políticas.  
- **Solicitudes:** formulario, validación, seguimiento, cancelación.  
- **Historial:** reservas, devoluciones, capacitaciones (descarga PDF/Excel).  
- **Notificaciones y mensajería:** alertas automáticas, canal interno, vencimientos.  

---

## 🔄 Cobertura Cruzada
- **Persona 1 ↔ Marlon:** Disponibilidad ↔ aprobación y estados.  
- **Persona 1 ↔ Persona 3:** Solicitudes ↔ inventario/mantenimientos.  
- **Persona 1 ↔ Persona 4:** Roles ↔ validaciones de usuario.  
- **Marlon ↔ Persona 4:** Políticas ↔ filtros de requisitos.  
- **Marlon ↔ Persona 3:** Catálogo/calendario ↔ inventario/mantenimientos.  

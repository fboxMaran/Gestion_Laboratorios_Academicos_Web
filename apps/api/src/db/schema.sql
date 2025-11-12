-- ================================================================================
-- SISTEMA DE GESTIÓN DE LABORATORIOS ACADÉMICOS
-- Script de Creación de Base de Datos Completo
-- ================================================================================
-- 
-- DESCRIPCIÓN:
--   Este script crea la estructura completa de la base de datos para el sistema
--   de gestión de laboratorios académicos, incluyendo todas las tablas, índices,
--   constraints y datos de prueba necesarios para el funcionamiento del módulo.
--
-- CARACTERÍSTICAS:
--   - Idempotente: Se puede ejecutar múltiples veces sin errores
--   - Incluye DROP TABLE IF EXISTS para limpieza antes de crear
--   - Respeta dependencias entre tablas
--   - Incluye datos de prueba realistas y consistentes
--
-- MODIFICACIONES RESPECTO AL DISEÑO ORIGINAL:
--   1. Tabla 'app_user': 
--      - Cambio de nombres de columnas a singular (full_name, email, etc.)
--      - Agregada columna 'phone' para teléfono de contacto
--      - Agregada columna 'institutional' para diferenciar usuarios internos/externos
--   
--   2. Tabla 'notification':
--      - Agregada columna 'read_at' (timestamp) para rastrear cuándo se leyó
--      - Agregado constraint para channel: 'EMAIL' o 'INTERNA'
--   
--   3. Tabla 'request':
--      - Agregada columna 'role_snapshot' para guardar el rol al momento de la solicitud
--      - Agregada columna 'requirements_ok' para validación de requisitos
--   
--   4. Tabla 'user_activity':
--      - Nueva tabla para historial de actividades del usuario
--      - Tipos: RESERVA, PRESTAMO, DEVOLUCION, CAPACITACION
--
-- USO:
--   psql -U postgres -d gestion_laboratorios -f schema.sql
--
-- VERSIÓN: 1.0
-- FECHA: Noviembre 2025
-- ================================================================================

-- Configuración inicial
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;

-- ================================================================================
-- SECCIÓN 1: ELIMINACIÓN DE TABLAS EXISTENTES (Orden inverso por dependencias)
-- ================================================================================

DROP TABLE IF EXISTS user_activity CASCADE;
DROP TABLE IF EXISTS user_certification CASCADE;
DROP TABLE IF EXISTS academic_benefit CASCADE;
DROP TABLE IF EXISTS publish_changelog CASCADE;
DROP TABLE IF EXISTS maintenance_part CASCADE;
DROP TABLE IF EXISTS maintenance CASCADE;
DROP TABLE IF EXISTS loan_item CASCADE;
DROP TABLE IF EXISTS loan CASCADE;
DROP TABLE IF EXISTS message CASCADE;
DROP TABLE IF EXISTS message_thread CASCADE;
DROP TABLE IF EXISTS request_attachment CASCADE;
DROP TABLE IF EXISTS request_action CASCADE;
DROP TABLE IF EXISTS request_item CASCADE;
DROP TABLE IF EXISTS request CASCADE;
DROP TABLE IF EXISTS notification CASCADE;
DROP TABLE IF EXISTS availability_subscription CASCADE;
DROP TABLE IF EXISTS calendar_slot CASCADE;
DROP TABLE IF EXISTS consumable_stock CASCADE;
DROP TABLE IF EXISTS inventory_move CASCADE;
DROP TABLE IF EXISTS resource_photo CASCADE;
DROP TABLE IF EXISTS resource CASCADE;
DROP TABLE IF EXISTS lab_responsible CASCADE;
DROP TABLE IF EXISTS lab_policy CASCADE;
DROP TABLE IF EXISTS lab_open_hours CASCADE;
DROP TABLE IF EXISTS lab_history CASCADE;
DROP TABLE IF EXISTS lab CASCADE;
DROP TABLE IF EXISTS app_user_auth CASCADE;
DROP TABLE IF EXISTS app_user CASCADE;
DROP TABLE IF EXISTS audit_log CASCADE;
DROP TABLE IF EXISTS system_setting CASCADE;
DROP TABLE IF EXISTS school_department CASCADE;
DROP TABLE IF EXISTS role CASCADE;

-- ================================================================================
-- SECCIÓN 2: CREACIÓN DE TABLAS PRINCIPALES (Orden correcto por dependencias)
-- ================================================================================

-- --------------------------------------------------------------------------------
-- Tabla: role
-- Descripción: Catálogo de roles de usuario en el sistema
-- --------------------------------------------------------------------------------
CREATE TABLE role (
    id SMALLINT PRIMARY KEY,
    name VARCHAR(40) NOT NULL UNIQUE
);

-- --------------------------------------------------------------------------------
-- Tabla: school_department
-- Descripción: Escuelas o departamentos académicos de la institución
-- --------------------------------------------------------------------------------
CREATE TABLE school_department (
    id SERIAL PRIMARY KEY,
    name VARCHAR(120) NOT NULL UNIQUE,
    email_domain VARCHAR(120) NOT NULL UNIQUE
);

-- --------------------------------------------------------------------------------
-- Tabla: system_setting
-- Descripción: Configuraciones globales del sistema
-- --------------------------------------------------------------------------------
CREATE TABLE system_setting (
    id BIGSERIAL PRIMARY KEY,
    key VARCHAR(80) NOT NULL UNIQUE,
    value VARCHAR(200) NOT NULL,
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- --------------------------------------------------------------------------------
-- Tabla: app_user
-- Descripción: Usuarios del sistema (estudiantes, docentes, técnicos, admins)
-- MODIFICACIONES: Agregadas columnas 'phone' e 'institutional'
-- --------------------------------------------------------------------------------
CREATE TABLE app_user (
    id BIGSERIAL PRIMARY KEY,
    full_name VARCHAR(160) NOT NULL,
    email VARCHAR(160) NOT NULL UNIQUE,
    institutional BOOLEAN NOT NULL DEFAULT TRUE CHECK (institutional IN (TRUE, FALSE)),
    role_id SMALLINT NOT NULL REFERENCES role(id),
    school_dept_id INTEGER REFERENCES school_department(id),
    career_or_dept VARCHAR(120),
    id_code VARCHAR(40),
    phone VARCHAR(40),  -- MODIFICACIÓN: Agregado para contacto
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    email_verified BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_user_email ON app_user(email);

-- --------------------------------------------------------------------------------
-- Tabla: app_user_auth
-- Descripción: Credenciales de autenticación de usuarios
-- --------------------------------------------------------------------------------
CREATE TABLE app_user_auth (
    user_id BIGINT PRIMARY KEY REFERENCES app_user(id) ON DELETE CASCADE,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- --------------------------------------------------------------------------------
-- Tabla: lab
-- Descripción: Laboratorios académicos disponibles
-- --------------------------------------------------------------------------------
CREATE TABLE lab (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(160) NOT NULL,
    internal_code VARCHAR(60) NOT NULL UNIQUE,
    school_dept_id INTEGER NOT NULL REFERENCES school_department(id),
    email_contact VARCHAR(160) NOT NULL,
    location VARCHAR(200) NOT NULL,
    description TEXT,
    capacity_max INTEGER,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_lab_school ON lab(school_dept_id);

-- --------------------------------------------------------------------------------
-- Tabla: lab_history
-- Descripción: Historial de cambios y eventos relacionados con laboratorios
-- --------------------------------------------------------------------------------
CREATE TABLE lab_history (
    id BIGSERIAL PRIMARY KEY,
    lab_id BIGINT NOT NULL REFERENCES lab(id) ON DELETE CASCADE,
    actor_user_id BIGINT REFERENCES app_user(id),
    action_type VARCHAR(60) NOT NULL,
    ref_table VARCHAR(60),
    ref_id BIGINT,
    detail TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- --------------------------------------------------------------------------------
-- Tabla: lab_open_hours
-- Descripción: Horarios de operación de cada laboratorio
-- --------------------------------------------------------------------------------
CREATE TABLE lab_open_hours (
    id BIGSERIAL PRIMARY KEY,
    lab_id BIGINT NOT NULL REFERENCES lab(id) ON DELETE CASCADE,
    weekday SMALLINT NOT NULL CHECK (weekday >= 0 AND weekday <= 6), -- 0=Domingo, 6=Sábado
    time_start TIME NOT NULL,
    time_end TIME NOT NULL,
    UNIQUE (lab_id, weekday, time_start, time_end)
);

-- --------------------------------------------------------------------------------
-- Tabla: lab_policy
-- Descripción: Políticas y requisitos de uso de cada laboratorio
-- --------------------------------------------------------------------------------
CREATE TABLE lab_policy (
    id BIGSERIAL PRIMARY KEY,
    lab_id BIGINT NOT NULL REFERENCES lab(id) ON DELETE CASCADE,
    academic_req TEXT,
    safety_req TEXT,
    notes TEXT
);

-- --------------------------------------------------------------------------------
-- Tabla: lab_responsible
-- Descripción: Personas responsables de cada laboratorio
-- --------------------------------------------------------------------------------
CREATE TABLE lab_responsible (
    id BIGSERIAL PRIMARY KEY,
    lab_id BIGINT NOT NULL REFERENCES lab(id) ON DELETE CASCADE,
    full_name VARCHAR(160) NOT NULL,
    position_title VARCHAR(120) NOT NULL,
    phone VARCHAR(40),
    email VARCHAR(160) NOT NULL,
    is_primary BOOLEAN NOT NULL DEFAULT FALSE
);

-- --------------------------------------------------------------------------------
-- Tabla: resource
-- Descripción: Recursos disponibles (equipos, consumibles, software)
-- --------------------------------------------------------------------------------
CREATE TABLE resource (
    id BIGSERIAL PRIMARY KEY,
    lab_id BIGINT NOT NULL REFERENCES lab(id),
    type VARCHAR(20) NOT NULL CHECK (type IN ('EQUIPMENT', 'CONSUMABLE', 'SOFTWARE')),
    name VARCHAR(160) NOT NULL,
    inventory_code VARCHAR(80),
    state VARCHAR(20) NOT NULL DEFAULT 'DISPONIBLE' 
        CHECK (state IN ('DISPONIBLE', 'RESERVADO', 'EN_MANTENIMIENTO', 'INACTIVO')),
    location VARCHAR(160),
    last_maintenance DATE,
    tech_sheet TEXT,
    description TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (lab_id, inventory_code)
);

CREATE INDEX idx_res_lab_type ON resource(lab_id, type);
CREATE INDEX idx_res_state ON resource(state);

-- --------------------------------------------------------------------------------
-- Tabla: resource_photo
-- Descripción: Fotos de los recursos
-- --------------------------------------------------------------------------------
CREATE TABLE resource_photo (
    id BIGSERIAL PRIMARY KEY,
    resource_id BIGINT NOT NULL REFERENCES resource(id),
    url TEXT NOT NULL,
    caption VARCHAR(200)
);

-- --------------------------------------------------------------------------------
-- Tabla: consumable_stock
-- Descripción: Control de inventario de consumibles
-- --------------------------------------------------------------------------------
CREATE TABLE consumable_stock (
    resource_id BIGINT PRIMARY KEY REFERENCES resource(id) ON DELETE CASCADE,
    unit VARCHAR(40) NOT NULL,
    qty_available NUMERIC(14,3) NOT NULL DEFAULT 0,
    reorder_point NUMERIC(14,3) NOT NULL DEFAULT 0
);

CREATE INDEX idx_cons_reorder ON consumable_stock(resource_id, qty_available);

-- --------------------------------------------------------------------------------
-- Tabla: inventory_move
-- Descripción: Movimientos de inventario (entradas y salidas)
-- --------------------------------------------------------------------------------
CREATE TABLE inventory_move (
    id BIGSERIAL PRIMARY KEY,
    resource_id BIGINT NOT NULL REFERENCES resource(id),
    move_type VARCHAR(10) NOT NULL CHECK (move_type IN ('IN', 'OUT')),
    qty NUMERIC(14,3) NOT NULL,
    moved_by BIGINT REFERENCES app_user(id),
    reason VARCHAR(160),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_inventory_move_resource ON inventory_move(resource_id, created_at);

-- --------------------------------------------------------------------------------
-- Tabla: calendar_slot
-- Descripción: Bloques de tiempo en el calendario para reservas
-- --------------------------------------------------------------------------------
CREATE TABLE calendar_slot (
    id BIGSERIAL PRIMARY KEY,
    lab_id BIGINT NOT NULL REFERENCES lab(id) ON DELETE CASCADE,
    resource_id BIGINT REFERENCES resource(id),
    starts_at TIMESTAMP NOT NULL,
    ends_at TIMESTAMP NOT NULL,
    status VARCHAR(20) NOT NULL 
        CHECK (status IN ('DISPONIBLE', 'BLOQUEADO', 'RESERVADO', 'MANTENIMIENTO', 'EXCLUSIVO')),
    reason VARCHAR(160),
    created_by BIGINT REFERENCES app_user(id),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CHECK (ends_at > starts_at)
);

CREATE INDEX idx_slot_lab_time ON calendar_slot(lab_id, starts_at, ends_at);
CREATE INDEX idx_slot_resource_time ON calendar_slot(resource_id, starts_at, ends_at);

-- --------------------------------------------------------------------------------
-- Tabla: availability_subscription
-- Descripción: Suscripciones de usuarios a notificaciones de disponibilidad
-- --------------------------------------------------------------------------------
CREATE TABLE availability_subscription (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
    lab_id BIGINT REFERENCES lab(id),
    resource_id BIGINT REFERENCES resource(id),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- --------------------------------------------------------------------------------
-- Tabla: notification
-- Descripción: Notificaciones del sistema para usuarios
-- MODIFICACIÓN: Agregada columna 'read_at' para tracking de lectura
-- --------------------------------------------------------------------------------
CREATE TABLE notification (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
    topic VARCHAR(80) NOT NULL,
    subject VARCHAR(200) NOT NULL,
    body TEXT NOT NULL,
    channel VARCHAR(20) NOT NULL CHECK (channel IN ('EMAIL', 'INTERNA')),
    sent_at TIMESTAMP NOT NULL DEFAULT NOW(),
    read_at TIMESTAMP  -- MODIFICACIÓN: Para rastrear cuándo se leyó
);

CREATE INDEX idx_notification_user ON notification(user_id, sent_at);

-- --------------------------------------------------------------------------------
-- Tabla: request
-- Descripción: Solicitudes de uso de recursos/laboratorios
-- MODIFICACIÓN: Agregadas columnas 'role_snapshot' y 'requirements_ok'
-- --------------------------------------------------------------------------------
CREATE TABLE request (
    id BIGSERIAL PRIMARY KEY,
    requester_id BIGINT NOT NULL REFERENCES app_user(id),
    role_snapshot VARCHAR(40) NOT NULL,  -- MODIFICACIÓN: Guardar rol al momento de solicitud
    lab_id BIGINT REFERENCES lab(id),
    objective TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE'
        CHECK (status IN ('PENDIENTE', 'EN_REVISION', 'APROBADA', 'RECHAZADA', 'CANCELADA')),
    requirements_ok BOOLEAN,  -- MODIFICACIÓN: Para validación de requisitos
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_request_status ON request(status);

-- --------------------------------------------------------------------------------
-- Tabla: request_item
-- Descripción: Items individuales solicitados en cada request
-- --------------------------------------------------------------------------------
CREATE TABLE request_item (
    id BIGSERIAL PRIMARY KEY,
    request_id BIGINT NOT NULL REFERENCES request(id),
    resource_id BIGINT REFERENCES resource(id),
    type VARCHAR(20) NOT NULL CHECK (type IN ('EQUIPMENT', 'CONSUMABLE', 'SOFTWARE', 'LAB_SPACE')),
    qty NUMERIC(14,3) NOT NULL DEFAULT 1,
    use_start TIMESTAMP NOT NULL,
    use_end TIMESTAMP NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE'
        CHECK (status IN ('PENDIENTE', 'APROBADA', 'RECHAZADA')),
    CHECK (use_end > use_start)
);

CREATE INDEX idx_request_item_time ON request_item(use_start, use_end);

-- --------------------------------------------------------------------------------
-- Tabla: request_action
-- Descripción: Acciones realizadas sobre las solicitudes (aprobaciones, rechazos)
-- --------------------------------------------------------------------------------
CREATE TABLE request_action (
    id BIGSERIAL PRIMARY KEY,
    request_id BIGINT NOT NULL REFERENCES request(id),
    actor_user_id BIGINT NOT NULL REFERENCES app_user(id),
    action VARCHAR(20) NOT NULL CHECK (action IN ('APROBAR', 'RECHAZAR', 'SOLICITAR_INFO', 'CANCELAR')),
    reason TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- --------------------------------------------------------------------------------
-- Tabla: request_attachment
-- Descripción: Archivos adjuntos a solicitudes
-- --------------------------------------------------------------------------------
CREATE TABLE request_attachment (
    id BIGSERIAL PRIMARY KEY,
    request_id BIGINT NOT NULL REFERENCES request(id),
    filename VARCHAR(200) NOT NULL,
    url TEXT NOT NULL,
    uploaded_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- --------------------------------------------------------------------------------
-- Tabla: loan
-- Descripción: Préstamos de recursos a usuarios
-- --------------------------------------------------------------------------------
CREATE TABLE loan (
    id BIGSERIAL PRIMARY KEY,
    request_id BIGINT NOT NULL REFERENCES request(id) ON DELETE CASCADE,
    lab_id BIGINT NOT NULL REFERENCES lab(id),
    delivered_by BIGINT REFERENCES app_user(id),
    received_by BIGINT REFERENCES app_user(id),
    delivered_at TIMESTAMP,
    returned_at TIMESTAMP,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE'
        CHECK (status IN ('PENDIENTE', 'ENTREGADO', 'DEVUELTO', 'INCIDENCIA')),
    notes TEXT
);

CREATE INDEX idx_loan_status ON loan(status);

-- --------------------------------------------------------------------------------
-- Tabla: loan_item
-- Descripción: Items individuales en cada préstamo
-- --------------------------------------------------------------------------------
CREATE TABLE loan_item (
    id BIGSERIAL PRIMARY KEY,
    loan_id BIGINT NOT NULL REFERENCES loan(id) ON DELETE CASCADE,
    resource_id BIGINT NOT NULL REFERENCES resource(id),
    type VARCHAR(20) NOT NULL CHECK (type IN ('EQUIPMENT', 'CONSUMABLE', 'SOFTWARE')),
    qty_out NUMERIC(14,3) NOT NULL DEFAULT 1,
    qty_in NUMERIC(14,3),
    condition_out VARCHAR(160),
    condition_in VARCHAR(160),
    observation TEXT
);

-- --------------------------------------------------------------------------------
-- Tabla: maintenance
-- Descripción: Registros de mantenimiento de equipos
-- --------------------------------------------------------------------------------
CREATE TABLE maintenance (
    id BIGSERIAL PRIMARY KEY,
    equipment_id BIGINT NOT NULL REFERENCES resource(id),
    lab_id BIGINT NOT NULL REFERENCES lab(id),
    maint_type VARCHAR(20) NOT NULL CHECK (maint_type IN ('PREVENTIVO', 'CORRECTIVO')),
    scheduled_date DATE NOT NULL,
    performed_at TIMESTAMP,
    technician_name VARCHAR(160),
    detail TEXT,
    state_after VARCHAR(20) CHECK (state_after IN ('DISPONIBLE', 'INACTIVO', 'EN_MANTENIMIENTO')),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_maintenance_equipment ON maintenance(equipment_id, scheduled_date);

-- --------------------------------------------------------------------------------
-- Tabla: maintenance_part
-- Descripción: Consumibles utilizados en mantenimientos
-- --------------------------------------------------------------------------------
CREATE TABLE maintenance_part (
    id BIGSERIAL PRIMARY KEY,
    maintenance_id BIGINT NOT NULL REFERENCES maintenance(id) ON DELETE CASCADE,
    consumable_id BIGINT NOT NULL REFERENCES resource(id),
    qty_used NUMERIC(14,3) NOT NULL
);

-- --------------------------------------------------------------------------------
-- Tabla: message_thread
-- Descripción: Hilos de conversación relacionados con solicitudes o labs
-- --------------------------------------------------------------------------------
CREATE TABLE message_thread (
    id BIGSERIAL PRIMARY KEY,
    request_id BIGINT REFERENCES request(id) ON DELETE CASCADE,
    lab_id BIGINT REFERENCES lab(id),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- --------------------------------------------------------------------------------
-- Tabla: message
-- Descripción: Mensajes individuales dentro de hilos de conversación
-- --------------------------------------------------------------------------------
CREATE TABLE message (
    id BIGSERIAL PRIMARY KEY,
    thread_id BIGINT NOT NULL REFERENCES message_thread(id) ON DELETE CASCADE,
    sender_id BIGINT NOT NULL REFERENCES app_user(id),
    body TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- --------------------------------------------------------------------------------
-- Tabla: publish_changelog
-- Descripción: Registro de cambios publicados en labs/resources
-- --------------------------------------------------------------------------------
CREATE TABLE publish_changelog (
    id BIGSERIAL PRIMARY KEY,
    actor_user_id BIGINT REFERENCES app_user(id),
    lab_id BIGINT REFERENCES lab(id),
    resource_id BIGINT REFERENCES resource(id),
    field_name VARCHAR(80) NOT NULL,
    old_value TEXT,
    new_value TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- --------------------------------------------------------------------------------
-- Tabla: audit_log
-- Descripción: Auditoría de acciones del sistema
-- --------------------------------------------------------------------------------
CREATE TABLE audit_log (
    id BIGSERIAL PRIMARY KEY,
    actor_user_id BIGINT REFERENCES app_user(id),
    module VARCHAR(60) NOT NULL,
    action VARCHAR(40) NOT NULL,
    entity VARCHAR(60) NOT NULL,
    entity_id BIGINT,
    before_snapshot TEXT,
    after_snapshot TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_created ON audit_log(created_at);

-- --------------------------------------------------------------------------------
-- Tabla: user_activity
-- Descripción: Historial de actividades del usuario
-- MODIFICACIÓN: Nueva tabla para tracking de actividades
-- --------------------------------------------------------------------------------
CREATE TABLE user_activity (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES app_user(id),
    activity_type VARCHAR(30) NOT NULL CHECK (activity_type IN ('RESERVA', 'PRESTAMO', 'DEVOLUCION', 'CAPACITACION')),
    ref_table VARCHAR(60),
    ref_id BIGINT,
    occurred_at TIMESTAMP NOT NULL DEFAULT NOW(),
    detail TEXT
);

CREATE INDEX idx_user_activity_user ON user_activity(user_id, occurred_at);

-- --------------------------------------------------------------------------------
-- Tabla: user_certification
-- Descripción: Certificaciones de usuarios para uso de equipos
-- --------------------------------------------------------------------------------
CREATE TABLE user_certification (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES app_user(id),
    name VARCHAR(160) NOT NULL,
    issued_by VARCHAR(160),
    issued_at DATE,
    expires_at DATE,
    UNIQUE (user_id, name)
);

-- --------------------------------------------------------------------------------
-- Tabla: academic_benefit
-- Descripción: Beneficios académicos obtenidos (horas, créditos)
-- --------------------------------------------------------------------------------
CREATE TABLE academic_benefit (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
    request_id BIGINT REFERENCES request(id) ON DELETE SET NULL,
    hours NUMERIC(6,2),
    credits NUMERIC(6,2),
    certificate_code VARCHAR(80),
    issued_at DATE
);

-- ================================================================================
-- SECCIÓN 3: DATOS DE PRUEBA (SEED DATA)
-- ================================================================================

-- --------------------------------------------------------------------------------
-- Roles del Sistema
-- --------------------------------------------------------------------------------
INSERT INTO role (id, name) VALUES
(1, 'Estudiante'),
(2, 'Docente'),
(3, 'EncargadoTecnico'),
(4, 'Admin');

-- --------------------------------------------------------------------------------
-- Escuelas/Departamentos
-- --------------------------------------------------------------------------------
INSERT INTO school_department (id, name, email_domain) VALUES
(1, 'Escuela de Ingenieria en Computacion', 'comp.itcr.ac.cr'),
(2, 'Escuela de Ingenieria Electronica', 'elec.tec.ac.cr'),
(3, 'Escuela de Quimica', 'quim.itcr.ac.cr'),
(4, 'Escuela de Fisica', 'fis.tec.ac.cr'),
(5, 'Escuela de Biologia', 'bio.itcr.ac.cr');

-- Resetear secuencia
SELECT setval('school_department_id_seq', 5, true);

-- --------------------------------------------------------------------------------
-- Usuarios del Sistema
-- NOTA: Contraseña para todos: "demo123" (hash bcrypt)
-- --------------------------------------------------------------------------------
INSERT INTO app_user (id, full_name, email, institutional, role_id, school_dept_id, career_or_dept, id_code, phone, is_active, email_verified) VALUES
(1, 'Juan Pablo Cambronero', 'usuario@demo.edu', TRUE, 1, 1, 'Ingeniería en Computación', '2021012345', '8333-3333', TRUE, TRUE),
(2, 'Dr. Carlos Ramirez Lopez', 'profesor@itcr.ac.cr', TRUE, 2, 1, 'Departamento de Computacion', 'DOC2020001', '8888-2222', TRUE, TRUE),
(3, 'Juan Tecnico Mora', 'tecnico@demo.edu', TRUE, 3, 1, 'Departamento de Computacion', 'TEC2019001', '8888-3333', TRUE, TRUE),
(4, 'Ana Admin Castro', 'admin@itcr.ac.cr', TRUE, 4, NULL, 'Administracion General', 'ADM2018001', '8888-4444', TRUE, TRUE),
(5, 'Maria Gonzalez Perez', 'mgonzalez@estudiantec.cr', TRUE, 1, 2, 'Ingeniería Electrónica', '2022045678', '8777-1234', TRUE, TRUE),
(6, 'Pedro Jimenez Vargas', 'pjimenez@estudiantec.cr', TRUE, 1, 1, 'Ingeniería en Computación', '2021098765', '8666-5678', TRUE, TRUE),
(7, 'Dra. Sofia Morales', 'smorales@itcr.ac.cr', TRUE, 2, 3, 'Departamento de Quimica', 'DOC2019045', '8555-9876', TRUE, TRUE),
(8, 'Luis Martinez Tech', 'lmartinez@itcr.ac.cr', TRUE, 3, 2, 'Departamento de Electronica', 'TEC2020002', '8444-3210', TRUE, TRUE);

-- Resetear secuencia
SELECT setval('app_user_id_seq', 8, true);

-- Contraseñas (hash de "demo123" usando bcryptjs con factor 10)
INSERT INTO app_user_auth (user_id, password_hash) VALUES
(1, '$2a$10$XBMH3iZJQnvbpt8m4hyeGeMkJrHztdWIxTbFj9Meoywemd.z6KE7C'),
(2, '$2a$10$XBMH3iZJQnvbpt8m4hyeGeMkJrHztdWIxTbFj9Meoywemd.z6KE7C'),
(3, '$2a$10$XBMH3iZJQnvbpt8m4hyeGeMkJrHztdWIxTbFj9Meoywemd.z6KE7C'),
(4, '$2a$10$XBMH3iZJQnvbpt8m4hyeGeMkJrHztdWIxTbFj9Meoywemd.z6KE7C'),
(5, '$2a$10$XBMH3iZJQnvbpt8m4hyeGeMkJrHztdWIxTbFj9Meoywemd.z6KE7C'),
(6, '$2a$10$XBMH3iZJQnvbpt8m4hyeGeMkJrHztdWIxTbFj9Meoywemd.z6KE7C'),
(7, '$2a$10$XBMH3iZJQnvbpt8m4hyeGeMkJrHztdWIxTbFj9Meoywemd.z6KE7C'),
(8, '$2a$10$XBMH3iZJQnvbpt8m4hyeGeMkJrHztdWIxTbFj9Meoywemd.z6KE7C');

-- --------------------------------------------------------------------------------
-- Laboratorios
-- --------------------------------------------------------------------------------
INSERT INTO lab (id, name, internal_code, school_dept_id, email_contact, location, description, capacity_max) VALUES
(1, 'Laboratorio de Redes y Telecomunicaciones', 'LAB-COMP-001', 1, 'labcomp@itcr.ac.cr', 'Edificio F2, Aula 201', 'Laboratorio equipado con switches, routers y herramientas de análisis de redes para cursos de telecomunicaciones', 30),
(2, 'Laboratorio de Inteligencia Artificial', 'LAB-COMP-002', 1, 'labia@itcr.ac.cr', 'Edificio F2, Aula 305', 'Laboratorio con estaciones de trabajo de alto rendimiento para procesamiento de IA y Machine Learning', 25),
(3, 'Laboratorio de Circuitos Digitales', 'LAB-ELEC-001', 2, 'labelec@itcr.ac.cr', 'Edificio F3, Aula 102', 'Laboratorio con osciloscopios, generadores de señales y kits de desarrollo FPGA', 20),
(4, 'Laboratorio de Quimica Analitica', 'LAB-QUIM-001', 3, 'labquim@itcr.ac.cr', 'Edificio C1, Aula 201', 'Laboratorio con cromatógrafos, espectrofotómetros y cabinas de seguridad', 18),
(5, 'Laboratorio de Fisica Experimental', 'LAB-FIS-001', 4, 'labfis@itcr.ac.cr', 'Edificio C2, Aula 105', 'Laboratorio de mecánica, óptica y termodinámica con equipos de medición de precisión', 24);

-- Resetear secuencia
SELECT setval('lab_id_seq', 5, true);

-- Horarios de laboratorios
INSERT INTO lab_open_hours (lab_id, weekday, time_start, time_end) VALUES
-- Lab Redes (L-V 7:00-17:00)
(1, 1, '07:00', '17:00'), (1, 2, '07:00', '17:00'), (1, 3, '07:00', '17:00'), (1, 4, '07:00', '17:00'), (1, 5, '07:00', '17:00'),
-- Lab IA (L-V 8:00-18:00, S 8:00-12:00)
(2, 1, '08:00', '18:00'), (2, 2, '08:00', '18:00'), (2, 3, '08:00', '18:00'), (2, 4, '08:00', '18:00'), (2, 5, '08:00', '18:00'), (2, 6, '08:00', '12:00'),
-- Lab Circuitos (L-V 7:00-16:00)
(3, 1, '07:00', '16:00'), (3, 2, '07:00', '16:00'), (3, 3, '07:00', '16:00'), (3, 4, '07:00', '16:00'), (3, 5, '07:00', '16:00'),
-- Lab Quimica (L-V 7:00-15:00)
(4, 1, '07:00', '15:00'), (4, 2, '07:00', '15:00'), (4, 3, '07:00', '15:00'), (4, 4, '07:00', '15:00'), (4, 5, '07:00', '15:00'),
-- Lab Fisica (L-S 7:00-17:00)
(5, 1, '07:00', '17:00'), (5, 2, '07:00', '17:00'), (5, 3, '07:00', '17:00'), (5, 4, '07:00', '17:00'), (5, 5, '07:00', '17:00'), (5, 6, '08:00', '12:00');

-- Responsables de laboratorios
INSERT INTO lab_responsible (lab_id, full_name, position_title, phone, email, is_primary) VALUES
(1, 'Ing. Roberto Solís Quesada', 'Encargado de Laboratorio', '2550-2201', 'rsolis@itcr.ac.cr', TRUE),
(1, 'Tec. Laura Hernández', 'Asistente Técnico', '2550-2202', 'lhernandez@itcr.ac.cr', FALSE),
(2, 'Dr. Fernando Cascante', 'Director de Laboratorio', '2550-2301', 'fcascante@itcr.ac.cr', TRUE),
(3, 'Ing. Patricia Villalobos', 'Encargada de Laboratorio', '2550-3101', 'pvillalobos@itcr.ac.cr', TRUE),
(4, 'M.Sc. Rodrigo Méndez', 'Jefe de Laboratorio', '2550-4201', 'rmendez@itcr.ac.cr', TRUE),
(5, 'Lic. Andrea Rojas Castro', 'Coordinadora de Laboratorio', '2550-5105', 'arojas@itcr.ac.cr', TRUE);

-- Políticas de laboratorios
INSERT INTO lab_policy (lab_id, academic_req, safety_req, notes) VALUES
(1, 'Haber aprobado el curso de Introducción a Redes', 'Uso obligatorio de pulsera antiestática al manipular equipos', 'Prohibido consumir alimentos o bebidas en el área de trabajo'),
(2, 'Curso de Programación Avanzada aprobado', 'No se requiere equipo de protección especial', 'Reservar con 48 horas de anticipación para proyectos que requieran GPU'),
(3, 'Curso de Electrónica Digital I aprobado', 'Uso obligatorio de lentes de protección', 'Supervisión de técnico requerida para soldadura'),
(4, 'Inducción de seguridad en laboratorio químico', 'Uso obligatorio de bata, lentes y guantes', 'Duchay lavaojos disponibles. Prohibido trabajar solo'),
(5, 'No se requieren requisitos académicos previos', 'Seguir protocolos de seguridad eléctrica', 'Equipos de medición delicados - manejar con cuidado');

-- --------------------------------------------------------------------------------
-- Recursos (Equipos, Consumibles, Software)
-- --------------------------------------------------------------------------------
INSERT INTO resource (id, lab_id, type, name, inventory_code, state, location, description) VALUES
-- Recursos Lab Redes
(1, 1, 'EQUIPMENT', 'Router Cisco 2901', 'NET-R-001', 'DISPONIBLE', 'Rack A, U10', 'Router empresarial con 2 puertos GE'),
(2, 1, 'EQUIPMENT', 'Switch Catalyst 2960', 'NET-S-001', 'DISPONIBLE', 'Rack A, U15', 'Switch capa 2, 24 puertos'),
(3, 1, 'EQUIPMENT', 'Analizador de Red Fluke', 'NET-A-001', 'DISPONIBLE', 'Gabinete B3', 'Certificador de cableado estructurado'),
(4, 1, 'SOFTWARE', 'Packet Tracer 8.2', 'NET-SW-001', 'DISPONIBLE', 'Servidor Licencias', 'Simulador de redes Cisco'),
(5, 1, 'CONSUMABLE', 'Cable UTP Cat6', 'NET-C-001', 'DISPONIBLE', 'Bodega', 'Cable de red categoría 6'),
-- Recursos Lab IA
(6, 2, 'EQUIPMENT', 'Workstation Dell Precision', 'AI-W-001', 'DISPONIBLE', 'Escritorio 1', 'Intel i9, 64GB RAM, RTX 4090'),
(7, 2, 'EQUIPMENT', 'Workstation Dell Precision', 'AI-W-002', 'DISPONIBLE', 'Escritorio 2', 'Intel i9, 64GB RAM, RTX 4090'),
(8, 2, 'EQUIPMENT', 'Servidor GPU NVIDIA DGX', 'AI-S-001', 'DISPONIBLE', 'Cuarto servidores', 'Servidor con 8x A100 80GB'),
(9, 2, 'SOFTWARE', 'MATLAB R2023b + Deep Learning Toolbox', 'AI-SW-001', 'DISPONIBLE', 'Servidor Licencias', 'Suite completa de IA'),
(10, 2, 'SOFTWARE', 'PyTorch Enterprise', 'AI-SW-002', 'DISPONIBLE', 'Todas las estaciones', 'Framework de ML'),
-- Recursos Lab Circuitos
(11, 3, 'EQUIPMENT', 'Osciloscopio Tektronix MSO54', 'ELEC-O-001', 'DISPONIBLE', 'Mesa 1', 'Osciloscopio digital 4 canales 1GHz'),
(12, 3, 'EQUIPMENT', 'Generador de Señales Keysight', 'ELEC-G-001', 'DISPONIBLE', 'Mesa 2', 'Generador hasta 500 MHz'),
(13, 3, 'EQUIPMENT', 'Kit FPGA Xilinx Zynq', 'ELEC-K-001', 'DISPONIBLE', 'Gabinete A1', 'Tarjeta de desarrollo FPGA'),
(14, 3, 'CONSUMABLE', 'Resistencias surtidas 1/4W', 'ELEC-C-001', 'DISPONIBLE', 'Almacén componentes', 'Set de 1000 resistencias'),
(15, 3, 'CONSUMABLE', 'Estaño para soldar 60/40', 'ELEC-C-002', 'DISPONIBLE', 'Almacén soldadura', 'Rollo 500g'),
-- Recursos Lab Quimica
(16, 4, 'EQUIPMENT', 'Espectrofotómetro UV-Vis', 'QUIM-E-001', 'DISPONIBLE', 'Mesa instrumental', 'Espectrofotómetro doble haz'),
(17, 4, 'EQUIPMENT', 'Cromatógrafo de Gases', 'QUIM-C-001', 'DISPONIBLE', 'Cuarto instrumentos', 'GC con detector FID'),
(18, 4, 'EQUIPMENT', 'Balanza Analítica Mettler', 'QUIM-B-001', 'DISPONIBLE', 'Mesa balanzas', 'Precisión 0.0001g'),
(19, 4, 'CONSUMABLE', 'Etanol 95% grado analítico', 'QUIM-R-001', 'DISPONIBLE', 'Bodega reactivos', 'Botella 1L'),
(20, 4, 'CONSUMABLE', 'Guantes de nitrilo talla M', 'QUIM-S-001', 'DISPONIBLE', 'Almacén seguridad', 'Caja 100 unidades'),
-- Recursos Lab Fisica
(21, 5, 'EQUIPMENT', 'Sensor de Movimiento Vernier', 'FIS-S-001', 'DISPONIBLE', 'Kit mecánica 1', 'Sensor ultrasónico de posición'),
(22, 5, 'EQUIPMENT', 'Kit de Óptica completo', 'FIS-K-001', 'DISPONIBLE', 'Gabinete óptica', 'Lentes, prismas, fuentes de luz'),
(23, 5, 'EQUIPMENT', 'Multímetro Fluke 87V', 'FIS-M-001', 'DISPONIBLE', 'Almacén medición', 'Multímetro industrial RMS'),
(24, 5, 'SOFTWARE', 'Logger Pro 3.16', 'FIS-SW-001', 'DISPONIBLE', 'Todas las PC', 'Software de adquisición de datos'),
(25, 5, 'CONSUMABLE', 'Pilas AA Duracell', 'FIS-C-001', 'DISPONIBLE', 'Bodega consumibles', 'Paquete 24 unidades');

-- Resetear secuencia
SELECT setval('resource_id_seq', 25, true);

-- Stock de consumibles
INSERT INTO consumable_stock (resource_id, unit, qty_available, reorder_point) VALUES
(5, 'metros', 150.000, 50.000),
(14, 'unidades', 850.000, 200.000),
(15, 'gramos', 450.000, 100.000),
(19, 'litros', 8.500, 2.000),
(20, 'unidades', 300.000, 50.000),
(25, 'unidades', 96.000, 24.000);

-- --------------------------------------------------------------------------------
-- Solicitudes de Ejemplo
-- --------------------------------------------------------------------------------
INSERT INTO request (id, requester_id, role_snapshot, lab_id, objective, status, requirements_ok, created_at) VALUES
(1, 1, 'Estudiante', 1, 'Realizar práctica del curso de Redes de Computadoras sobre configuración de VLANs', 'APROBADA', TRUE, '2025-11-10 09:00:00'),
(2, 5, 'Estudiante', 3, 'Proyecto final de Electrónica Digital - Diseño de contador binario en FPGA', 'APROBADA', TRUE, '2025-11-09 14:30:00'),
(3, 6, 'Estudiante', 2, 'Entrenamiento de modelo de clasificación de imágenes para proyecto de IA', 'EN_REVISION', TRUE, '2025-11-11 10:15:00'),
(4, 2, 'Docente', 1, 'Preparar laboratorio para clase de enrutamiento dinámico (OSPF)', 'APROBADA', TRUE, '2025-11-08 08:00:00'),
(5, 1, 'Estudiante', 4, 'Análisis de compuestos orgánicos mediante espectrofotometría', 'PENDIENTE', NULL, '2025-11-12 11:00:00');

-- Resetear secuencia
SELECT setval('request_id_seq', 5, true);

-- Items de solicitudes
INSERT INTO request_item (request_id, resource_id, type, qty, use_start, use_end, status) VALUES
(1, 1, 'EQUIPMENT', 2, '2025-11-15 10:00:00', '2025-11-15 12:00:00', 'APROBADA'),
(1, 2, 'EQUIPMENT', 3, '2025-11-15 10:00:00', '2025-11-15 12:00:00', 'APROBADA'),
(2, 13, 'EQUIPMENT', 1, '2025-11-18 14:00:00', '2025-11-18 17:00:00', 'APROBADA'),
(2, 15, 'CONSUMABLE', 0.050, '2025-11-18 14:00:00', '2025-11-18 17:00:00', 'APROBADA'),
(3, 6, 'EQUIPMENT', 1, '2025-11-20 08:00:00', '2025-11-22 17:00:00', 'PENDIENTE'),
(4, 1, 'EQUIPMENT', 4, '2025-11-14 07:00:00', '2025-11-14 10:00:00', 'APROBADA'),
(4, 2, 'EQUIPMENT', 4, '2025-11-14 07:00:00', '2025-11-14 10:00:00', 'APROBADA'),
(5, 16, 'EQUIPMENT', 1, '2025-11-19 13:00:00', '2025-11-19 16:00:00', 'PENDIENTE');

-- Acciones sobre solicitudes
INSERT INTO request_action (request_id, actor_user_id, action, reason, created_at) VALUES
(1, 3, 'APROBAR', 'Todos los requisitos cumplidos. Equipos disponibles.', '2025-11-10 10:30:00'),
(2, 8, 'APROBAR', 'Proyecto validado por docente. Autorizado uso de FPGA.', '2025-11-09 16:00:00'),
(4, 3, 'APROBAR', 'Reserva para clase aprobada. Equipos preparados.', '2025-11-08 09:00:00');

-- --------------------------------------------------------------------------------
-- Historial de Actividades de Usuario
-- --------------------------------------------------------------------------------
INSERT INTO user_activity (user_id, activity_type, ref_table, ref_id, occurred_at, detail) VALUES
(1, 'RESERVA', 'request', 1, '2025-11-10 09:00:00', 'Solicitud de equipos de red para práctica de VLANs'),
(1, 'PRESTAMO', 'loan', 1, '2025-11-15 10:05:00', 'Recogida de 2 routers y 3 switches'),
(1, 'DEVOLUCION', 'loan', 1, '2025-11-15 12:10:00', 'Devolución de equipos en buen estado'),
(5, 'RESERVA', 'request', 2, '2025-11-09 14:30:00', 'Solicitud de kit FPGA para proyecto final'),
(2, 'RESERVA', 'request', 4, '2025-11-08 08:00:00', 'Preparación de clase de enrutamiento'),
(6, 'CAPACITACION', NULL, NULL, '2025-11-05 15:00:00', 'Inducción de seguridad en laboratorio de química'),
(1, 'CAPACITACION', NULL, NULL, '2025-09-12 09:00:00', 'Capacitación en uso de equipos de red');

-- --------------------------------------------------------------------------------
-- Configuraciones del Sistema
-- --------------------------------------------------------------------------------
INSERT INTO system_setting (key, value) VALUES
('max_request_days_ahead', '30'),
('min_hours_notice', '24'),
('max_concurrent_requests', '3'),
('maintenance_notification_days', '7'),
('session_timeout_minutes', '60');

-- ================================================================================
-- SECCIÓN 4: COMENTARIOS FINALES Y NOTAS DE USO
-- ================================================================================

/*
 * NOTAS IMPORTANTES:
 *
 * 1. CREDENCIALES DE PRUEBA:
 *    Todos los usuarios tienen la contraseña: "demo123"
 *    - Estudiante: usuario@demo.edu
 *    - Docente: profesor@itcr.ac.cr
 *    - Técnico: tecnico@demo.edu
 *    - Admin: admin@itcr.ac.cr
 *
 * 2. ESTRUCTURA DE ROLES:
 *    - ID 1: Estudiante (puede hacer solicitudes)
 *    - ID 2: Docente (puede hacer solicitudes y reservas prioritarias)
 *    - ID 3: EncargadoTecnico (aprueba solicitudes, gestiona inventario)
 *    - ID 4: Admin (acceso completo al sistema)
 *
 * 3. FLUJO DE SOLICITUDES:
 *    PENDIENTE → EN_REVISION → APROBADA/RECHAZADA
 *    El usuario puede CANCELAR en cualquier momento antes de aprobación
 *
 * 4. ESTADOS DE RECURSOS:
 *    - DISPONIBLE: Puede ser solicitado
 *    - RESERVADO: Asignado a una solicitud aprobada
 *    - EN_MANTENIMIENTO: No disponible temporalmente
 *    - INACTIVO: Fuera de servicio
 *
 * 5. NOTIFICACIONES:
 *    - INTERNA: Mostradas en el sistema
 *    - EMAIL: Enviadas por correo (requiere configuración SMTP)
 *    - read_at IS NULL = no leída
 *    - read_at IS NOT NULL = leída (muestra timestamp)
 *
 * 6. GESTIÓN DE INVENTARIO:
 *    - Los consumibles tienen control de stock en 'consumable_stock'
 *    - Los movimientos se registran en 'inventory_move'
 *    - Alertas cuando qty_available < reorder_point
 *
 * 7. PRÓXIMOS PASOS PARA EL EQUIPO:
 *    - Configurar variables de entorno (.env) con credenciales de BD
 *    - Ejecutar este script: psql -U postgres -d gestion_laboratorios -f schema.sql
 *    - Verificar que el servidor API se conecte correctamente
 *    - Probar login con las credenciales de prueba
 *    - Ajustar datos de prueba según necesidades específicas
 *
 * 8. MANTENIMIENTO:
 *    - Backup regular de la base de datos recomendado
 *    - Limpiar datos de prueba en producción
 *    - Actualizar contraseñas en ambiente productivo
 */

-- ================================================================================
-- FIN DEL SCRIPT
-- ================================================================================

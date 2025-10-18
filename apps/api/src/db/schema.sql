-- apps/api/src/db/schema.sql
-- =======================
-- MÓDULO 1.1
-- =======================

CREATE TABLE IF NOT EXISTS departments (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  email_domain TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS labs (
  id SERIAL PRIMARY KEY,
  department_id INT NOT NULL REFERENCES departments(id) ON DELETE RESTRICT,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  location TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lab_contacts (
  id SERIAL PRIMARY KEY,
  lab_id INT NOT NULL REFERENCES labs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  phone TEXT,
  email TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lab_policies (
  id SERIAL PRIMARY KEY,
  lab_id INT NOT NULL UNIQUE REFERENCES labs(id) ON DELETE CASCADE,
  academic_requirements TEXT,
  safety_requirements TEXT,
  capacity_max INT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 0=Dom ... 6=Sáb
CREATE TABLE IF NOT EXISTS lab_hours (
  id SERIAL PRIMARY KEY,
  lab_id INT NOT NULL REFERENCES labs(id) ON DELETE CASCADE,
  day_of_week INT NOT NULL CHECK(day_of_week BETWEEN 0 AND 6),
  opens TIME NOT NULL,
  closes TIME NOT NULL,
  UNIQUE(lab_id, day_of_week)
);

CREATE TABLE IF NOT EXISTS resources_fixed (
  id SERIAL PRIMARY KEY,
  lab_id INT NOT NULL REFERENCES labs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  inventory_code TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('DISPONIBLE','RESERVADO','MANTENIMIENTO','INACTIVO')),
  last_maintenance_date DATE,
  UNIQUE(lab_id, inventory_code)
);

CREATE TABLE IF NOT EXISTS consumables (
  id SERIAL PRIMARY KEY,
  lab_id INT NOT NULL REFERENCES labs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  unit TEXT NOT NULL,
  reorder_point NUMERIC NOT NULL DEFAULT 0,
  qty_available NUMERIC NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS lab_history (
  id SERIAL PRIMARY KEY,
  lab_id INT NOT NULL REFERENCES labs(id) ON DELETE CASCADE,
  user_id INT,
  action TEXT NOT NULL,
  detail JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- =======================
-- MÓDULO 1.2
-- =======================

CREATE TABLE IF NOT EXISTS resource_types (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS resources (
  id SERIAL PRIMARY KEY,
  lab_id INT NOT NULL REFERENCES labs(id) ON DELETE CASCADE,
  type_id INT NOT NULL REFERENCES resource_types(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  description TEXT,
  specs JSONB,
  status TEXT NOT NULL DEFAULT 'DISPONIBLE'
    CHECK(status IN ('DISPONIBLE','RESERVADO','MANTENIMIENTO','INACTIVO')),
  qty_available NUMERIC NOT NULL DEFAULT 1,
  request_url TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS resource_photos (
  id SERIAL PRIMARY KEY,
  resource_id INT NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS calendar_slots (
  id SERIAL PRIMARY KEY,
  lab_id INT NOT NULL REFERENCES labs(id) ON DELETE CASCADE,
  resource_id INT REFERENCES resources(id) ON DELETE CASCADE,
  starts_at TIMESTAMP NOT NULL,
  ends_at   TIMESTAMP NOT NULL,
  status TEXT NOT NULL
    CHECK(status IN ('DISPONIBLE','RESERVADO','MANTENIMIENTO','INACTIVO','BLOQUEADO','EXCLUSIVO')),
  title TEXT,
  reason TEXT,
  created_by INT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_slots_lab_time
  ON calendar_slots (lab_id, starts_at, ends_at);

CREATE INDEX IF NOT EXISTS idx_slots_resource_time
  ON calendar_slots (resource_id, starts_at, ends_at);

CREATE TABLE IF NOT EXISTS availability_subscriptions (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL,
  lab_id INT REFERENCES labs(id) ON DELETE CASCADE,
  resource_id INT REFERENCES resources(id) ON DELETE CASCADE,
  trigger_status TEXT NOT NULL DEFAULT 'DISPONIBLE'
    CHECK(trigger_status IN ('DISPONIBLE')),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CHECK ((lab_id IS NOT NULL) OR (resource_id IS NOT NULL))
);

CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  meta JSONB,
  queued_at TIMESTAMP NOT NULL DEFAULT NOW(),
  sent_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS changelog (
  id SERIAL PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id INT NOT NULL,
  user_id INT,
  action TEXT NOT NULL,
  detail JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_changelog_entity
  ON changelog (entity_type, entity_id);


-- ================
-- 1.3 Solicitudes
-- ================

-- Solicitud principal
CREATE TABLE IF NOT EXISTS requests (
  id SERIAL PRIMARY KEY,
  lab_id INT NOT NULL REFERENCES labs(id) ON DELETE CASCADE,
  requester_name TEXT NOT NULL,
  requester_email TEXT NOT NULL,
  requester_role TEXT NOT NULL,            -- estudiante/docente/...
  requester_program TEXT,                  -- carrera/departamento
  purpose TEXT NOT NULL,                   -- objetivo de uso
  priority TEXT NOT NULL DEFAULT 'NORMAL'  -- NORMAL/ALTA
    CHECK (priority IN ('NORMAL','ALTA')),
  requested_from TIMESTAMP NOT NULL,
  requested_to   TIMESTAMP NOT NULL,
  requirements_ok BOOLEAN NOT NULL DEFAULT FALSE,  -- validación automática
  status TEXT NOT NULL DEFAULT 'PENDIENTE'         -- PENDIENTE/APROBADA/RECHAZADA/NECESITA_INFO/CANCELADA
    CHECK (status IN ('PENDIENTE','APROBADA','RECHAZADA','NECESITA_INFO','CANCELADA')),
  reviewer_note TEXT,                      -- motivo rechazo o notas
  reviewer_id INT,                         -- futuro: user id quien aprueba
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Ítems solicitados (recursos específicos y/o el espacio del lab)
CREATE TABLE IF NOT EXISTS request_items (
  id SERIAL PRIMARY KEY,
  request_id INT NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  resource_id INT REFERENCES resources(id) ON DELETE SET NULL,  -- null => solo espacio del lab
  qty INT NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Mensajería simple para “Solicitar información adicional”
CREATE TABLE IF NOT EXISTS request_messages (
  id SERIAL PRIMARY KEY,
  request_id INT NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  sender TEXT NOT NULL CHECK (sender IN ('USUARIO','ENCARGADO')),
  message TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);


-- =========
-- MÓDULO 1.4
-- =========

-- Asignación de equipos (resources) o equipos fijos (resources_fixed) a una solicitud
CREATE TABLE IF NOT EXISTS resource_assignments (
  id SERIAL PRIMARY KEY,
  request_id INT NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  lab_id INT NOT NULL REFERENCES labs(id) ON DELETE CASCADE,
  user_id INT,                            -- quién recibe (si no, requester de la solicitud)
  resource_id INT REFERENCES resources(id) ON DELETE SET NULL,       -- uno u otro
  fixed_id INT REFERENCES resources_fixed(id) ON DELETE SET NULL,
  qty NUMERIC NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'ASIGNADO' CHECK(status IN ('ASIGNADO','DEVUELTO','PERDIDO','DANADO')),
  assigned_at TIMESTAMP NOT NULL DEFAULT NOW(),
  due_at TIMESTAMP,                       -- fecha estimada de devolución
  returned_at TIMESTAMP,                  -- cuando se devuelve
  notes TEXT
);

-- Consumo de materiales (descuenta inventario de 'consumables')
CREATE TABLE IF NOT EXISTS material_consumptions (
  id SERIAL PRIMARY KEY,
  request_id INT NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  lab_id INT NOT NULL REFERENCES labs(id) ON DELETE CASCADE,
  consumable_id INT NOT NULL REFERENCES consumables(id) ON DELETE RESTRICT,
  qty NUMERIC NOT NULL CHECK(qty > 0),
  used_at TIMESTAMP NOT NULL DEFAULT NOW(),
  used_by INT,
  notes TEXT
);

-- Beneficios académicos (horas, créditos, constancias)
CREATE TABLE IF NOT EXISTS academic_benefits (
  id SERIAL PRIMARY KEY,
  request_id INT NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  lab_id INT NOT NULL REFERENCES labs(id) ON DELETE CASCADE,
  user_id INT NOT NULL,                   -- beneficiario
  hours NUMERIC DEFAULT 0,
  credits NUMERIC DEFAULT 0,
  certificate_url TEXT,
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Reportes: índices útiles
CREATE INDEX IF NOT EXISTS idx_assignments_lab ON resource_assignments (lab_id, assigned_at);
CREATE INDEX IF NOT EXISTS idx_consumptions_lab ON material_consumptions (lab_id, used_at);
CREATE INDEX IF NOT EXISTS idx_benefits_lab ON academic_benefits (lab_id, created_at);


-- =======================
-- 2.2 Gestión de Inventario
-- =======================

-- Movimientos de inventario (equipos fijos y/o consumibles)
-- Para equipos fijos, registramos cambios de estado/ubicación como "notas".
-- Para consumibles, impactamos qty_available con type IN/OUT.
CREATE TABLE IF NOT EXISTS inventory_movements (
  id SERIAL PRIMARY KEY,
  lab_id INT NOT NULL REFERENCES labs(id) ON DELETE CASCADE,
  user_id INT,
  -- referenciamos o bien el recurso fijo o bien el consumible:
  fixed_id INT REFERENCES resources_fixed(id) ON DELETE SET NULL,
  consumable_id INT REFERENCES consumables(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('IN','OUT','ADJUST','INFO')), -- IN/OUT para stock; ADJUST correcciones; INFO cambios informativos (estado/ubicación)
  qty NUMERIC,                                -- requerido para consumibles cuando type IN/OUT/ADJUST
  reason TEXT,                                -- motivo del movimiento ('compra','uso','corrección','traslado', etc.)
  notes TEXT,                                 -- detalle adicional (ubicación nueva, observaciones)
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CHECK ((fixed_id IS NOT NULL) OR (consumable_id IS NOT NULL))
);

CREATE INDEX IF NOT EXISTS idx_inv_mov_lab ON inventory_movements (lab_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inv_mov_fixed ON inventory_movements (fixed_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inv_mov_cons ON inventory_movements (consumable_id, created_at DESC);


-- =======================
-- 2.3 Gestión de Mantenimientos
-- =======================

CREATE TABLE IF NOT EXISTS maintenance_orders (
  id SERIAL PRIMARY KEY,
  lab_id INT NOT NULL REFERENCES labs(id) ON DELETE CASCADE,
  resource_id INT REFERENCES resources(id) ON DELETE SET NULL,
  fixed_id INT REFERENCES resources_fixed(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('PREVENTIVO','CORRECTIVO')),
  status TEXT NOT NULL DEFAULT 'PROGRAMADO'
    CHECK (status IN ('PROGRAMADO','EN_PROCESO','COMPLETADO','CANCELADO')),
  scheduled_at TIMESTAMP,             -- fecha programada
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  canceled_at TIMESTAMP,
  technician_name TEXT,
  technician_id INT,
  description TEXT,                   -- descripción/reporte
  used_parts JSONB,                   -- repuestos/insumos usados (opcional)
  result_status TEXT,                 -- nuevo estado del equipo tras completar (ej. 'DISPONIBLE','INACTIVO')
  notify_on_disponible BOOLEAN NOT NULL DEFAULT TRUE, -- avisar si vuelve a DISPONIBLE
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CHECK ((resource_id IS NOT NULL) OR (fixed_id IS NOT NULL))
);

CREATE INDEX IF NOT EXISTS idx_mo_lab_status ON maintenance_orders (lab_id, status);
CREATE INDEX IF NOT EXISTS idx_mo_sched ON maintenance_orders (scheduled_at);


CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  role TEXT NOT NULL CHECK (role IN ('ESTUDIANTE','DOCENTE','TECNICO','ADMIN')),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  student_id TEXT,          -- carné (si aplica)
  teacher_code TEXT,        -- código (si aplica)
  program_department TEXT,  -- carrera o departamento
  phone TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Catálogo de capacitaciones/certificaciones
CREATE TABLE IF NOT EXISTS trainings_catalog (
  id SERIAL PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  expires_months INT
);

-- Requisitos de capacitación por laboratorio
CREATE TABLE IF NOT EXISTS lab_training_requirements (
  id SERIAL PRIMARY KEY,
  lab_id INT NOT NULL REFERENCES labs(id) ON DELETE CASCADE,
  training_id INT NOT NULL REFERENCES trainings_catalog(id) ON DELETE RESTRICT,
  UNIQUE(lab_id, training_id)
);

-- Capacitaciones completadas por usuario
CREATE TABLE IF NOT EXISTS user_trainings (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  training_id INT NOT NULL REFERENCES trainings_catalog(id) ON DELETE RESTRICT,
  completed_at TIMESTAMP NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP,
  UNIQUE(user_id, training_id)
);

-- Vincular solicitudes con usuario cuando aplique (denormalizado ya existía requester_*)
-- Vincular solicitudes con usuario cuando aplique (sin DO $$)
ALTER TABLE IF EXISTS requests
  ADD COLUMN IF NOT EXISTS user_id INT REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_requests_user ON requests(user_id);

-- =======================
-- MÓDULO 3.2 Búsqueda/Disponibilidad (índices sugeridos)
-- =======================
CREATE INDEX IF NOT EXISTS idx_resources_lab_type ON resources(lab_id, type_id, status);
CREATE INDEX IF NOT EXISTS idx_labs_location ON labs(location);

-- =======================
-- MOD 4: ADMIN (4.2 + 4.1 permisos)
-- =======================

-- Parámetros globales (clave-valor JSON)
CREATE TABLE IF NOT EXISTS system_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_by INT,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Permisos por rol (roles ya existen en users.role)
-- permission: string libre, p.ej. 'users.manage','settings.manage','audit.view'
CREATE TABLE IF NOT EXISTS role_permissions (
  role TEXT NOT NULL CHECK (role IN ('ESTUDIANTE','DOCENTE','TECNICO','ADMIN')),
  permission TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  PRIMARY KEY (role, permission)
);

CREATE INDEX IF NOT EXISTS idx_role_perms_role ON role_permissions (role);

-- Sugerencia inicial de permisos (idempotente):
INSERT INTO role_permissions (role, permission)
SELECT 'ADMIN', p FROM (VALUES
  ('users.read'),('users.manage'),('users.roles'),
  ('settings.read'),('settings.manage'),
  ('audit.read'),('audit.export')
) as t(p)
ON CONFLICT DO NOTHING;

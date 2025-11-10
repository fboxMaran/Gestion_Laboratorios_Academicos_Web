-- =========================
-- 1) CATÁLOGOS BÁSICOS
-- =========================
CREATE TABLE school_department (
  id                SERIAL PRIMARY KEY,
  name              VARCHAR(120) NOT NULL,
  email_domain      VARCHAR(120) NOT NULL,        -- p.ej. itcr.ac.cr, tec.ac.cr
  UNIQUE (name),
  UNIQUE (email_domain)
);

CREATE TABLE role (
  id                SMALLINT PRIMARY KEY,
  name              VARCHAR(40) UNIQUE NOT NULL   -- Admin, EncargadoTecnico, Docente, Estudiante
);

-- =========================
-- 2) USUARIOS
-- =========================
CREATE TABLE app_user (
  id                BIGSERIAL PRIMARY KEY,
  full_name         VARCHAR(160) NOT NULL,
  email             VARCHAR(160) UNIQUE NOT NULL,
  institutional     BOOLEAN NOT NULL DEFAULT TRUE,
  role_id           SMALLINT NOT NULL REFERENCES role(id),
  school_dept_id    INTEGER REFERENCES school_department(id),
  career_or_dept    VARCHAR(120),                 -- carrera (est) o departamento (doc/téc)
  id_code           VARCHAR(40),                  -- carné/código docente
  phone             VARCHAR(40),
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  email_verified    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at        TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMP NOT NULL DEFAULT NOW(),
  CHECK (institutional IN (TRUE, FALSE))
);

CREATE TABLE user_certification (
  id                BIGSERIAL PRIMARY KEY,
  user_id           BIGINT NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  name              VARCHAR(160) NOT NULL,        -- p.ej. "Inducción Lab Química"
  issued_by         VARCHAR(160),
  issued_at         DATE,
  expires_at        DATE,
  UNIQUE (user_id, name)
);

-- =========================
-- 3) LABORATORIOS
-- =========================
CREATE TABLE lab (
  id                BIGSERIAL PRIMARY KEY,
  name              VARCHAR(160) NOT NULL,
  internal_code     VARCHAR(60) UNIQUE NOT NULL,
  school_dept_id    INTEGER NOT NULL REFERENCES school_department(id),
  email_contact     VARCHAR(160) NOT NULL,        -- correo institucional del lab/escuela
  location          VARCHAR(200) NOT NULL,
  description       TEXT,
  capacity_max      INTEGER,
  created_at        TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE lab_responsible (
  id                BIGSERIAL PRIMARY KEY,
  lab_id            BIGINT NOT NULL REFERENCES lab(id) ON DELETE CASCADE,
  full_name         VARCHAR(160) NOT NULL,
  position_title    VARCHAR(120) NOT NULL,        -- encargado/técnico
  phone             VARCHAR(40),
  email             VARCHAR(160) NOT NULL,        -- institucional
  is_primary        BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE lab_policy (
  id                BIGSERIAL PRIMARY KEY,
  lab_id            BIGINT NOT NULL REFERENCES lab(id) ON DELETE CASCADE,
  academic_req      TEXT,                          -- cursos previos/inducción
  safety_req        TEXT,
  notes             TEXT
);

-- Horarios de funcionamiento (bloques recurrentes)
CREATE TABLE lab_open_hours (
  id                BIGSERIAL PRIMARY KEY,
  lab_id            BIGINT NOT NULL REFERENCES lab(id) ON DELETE CASCADE,
  weekday           SMALLINT NOT NULL CHECK (weekday BETWEEN 0 AND 6), -- 0=Domingo
  time_start        TIME NOT NULL,
  time_end          TIME NOT NULL,
  UNIQUE (lab_id, weekday, time_start, time_end)
);

-- Historial de actividades del laboratorio (resumen)
CREATE TABLE lab_history (
  id                BIGSERIAL PRIMARY KEY,
  lab_id            BIGINT NOT NULL REFERENCES lab(id) ON DELETE CASCADE,
  actor_user_id     BIGINT REFERENCES app_user(id),
  action_type       VARCHAR(60) NOT NULL,    -- reserva_creada, manten_prog, inventario_mov, etc.
  ref_table         VARCHAR(60),             -- nombre tabla relacionada
  ref_id            BIGINT,
  detail            TEXT,
  created_at        TIMESTAMP NOT NULL DEFAULT NOW()
);

-- =========================
-- 4) RECURSOS
-- =========================
-- Unificamos recursos con tipo: EQUIPMENT | CONSUMABLE | SOFTWARE
CREATE TABLE resource (
  id                BIGSERIAL PRIMARY KEY,
  lab_id            BIGINT NOT NULL REFERENCES lab(id) ON DELETE CASCADE,
  type              VARCHAR(20) NOT NULL CHECK (type IN ('EQUIPMENT','CONSUMABLE','SOFTWARE')),
  name              VARCHAR(160) NOT NULL,
  inventory_code    VARCHAR(80),             -- obligatorio para equipos
  state             VARCHAR(20) NOT NULL DEFAULT 'DISPONIBLE'
                      CHECK (state IN ('DISPONIBLE','RESERVADO','EN_MANTENIMIENTO','INACTIVO')),
  location          VARCHAR(160),
  last_maintenance  DATE,                    -- equipos
  tech_sheet        TEXT,                    -- ficha técnica (software/equipo)
  description       TEXT,
  created_at        TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (lab_id, inventory_code)
);

CREATE TABLE resource_photo (
  id                BIGSERIAL PRIMARY KEY,
  resource_id       BIGINT NOT NULL REFERENCES resource(id) ON DELETE CASCADE,
  url               TEXT NOT NULL,
  caption           VARCHAR(200)
);

-- Cantidades para consumibles (stock y punto de reorden)
CREATE TABLE consumable_stock (
  resource_id       BIGINT PRIMARY KEY REFERENCES resource(id) ON DELETE CASCADE,
  unit              VARCHAR(40) NOT NULL,        -- p.ej. ml, g, piezas
  qty_available     NUMERIC(14,3) NOT NULL DEFAULT 0,
  reorder_point     NUMERIC(14,3) NOT NULL DEFAULT 0
);

-- =========================
-- 5) PUBLICACIÓN Y CALENDARIO
-- =========================
-- Slots del calendario: pueden ser del LAB o de un RESOURCE concreto
CREATE TABLE calendar_slot (
  id                BIGSERIAL PRIMARY KEY,
  lab_id            BIGINT NOT NULL REFERENCES lab(id) ON DELETE CASCADE,
  resource_id       BIGINT REFERENCES resource(id),
  starts_at         TIMESTAMP NOT NULL,
  ends_at           TIMESTAMP NOT NULL,
  status            VARCHAR(20) NOT NULL
                      CHECK (status IN ('DISPONIBLE','BLOQUEADO','RESERVADO','MANTENIMIENTO','EXCLUSIVO')),
  reason            VARCHAR(160),                -- evento, mantenimiento, uso exclusivo, etc.
  created_by        BIGINT REFERENCES app_user(id),
  created_at        TIMESTAMP NOT NULL DEFAULT NOW(),
  CHECK (ends_at > starts_at)
);

-- Suscripciones para avisos cuando se libere un recurso/espacio
CREATE TABLE availability_subscription (
  id                BIGSERIAL PRIMARY KEY,
  user_id           BIGINT NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  lab_id            BIGINT REFERENCES lab(id),
  resource_id       BIGINT REFERENCES resource(id),
  created_at        TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Bitácora de cambios sobre publicación/recursos
CREATE TABLE publish_changelog (
  id                BIGSERIAL PRIMARY KEY,
  actor_user_id     BIGINT REFERENCES app_user(id),
  lab_id            BIGINT REFERENCES lab(id),
  resource_id       BIGINT REFERENCES resource(id),
  field_name        VARCHAR(80) NOT NULL,
  old_value         TEXT,
  new_value         TEXT,
  created_at        TIMESTAMP NOT NULL DEFAULT NOW()
);

-- =========================
-- 6) SOLICITUDES Y RESERVAS
-- =========================
-- Encabezado de solicitud (puede incluir varios recursos)
CREATE TABLE request (
  id                BIGSERIAL PRIMARY KEY,
  requester_id      BIGINT NOT NULL REFERENCES app_user(id),
  role_snapshot     VARCHAR(40) NOT NULL,            -- rol del usuario al solicitar
  lab_id            BIGINT REFERENCES lab(id),       -- si solicita espacio del lab
  objective         TEXT NOT NULL,                   -- objetivo de uso
  status            VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE'
                      CHECK (status IN ('PENDIENTE','EN_REVISION','APROBADA','RECHAZADA','CANCELADA')),
  requirements_ok   BOOLEAN,                         -- validación automática
  created_at        TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Ítems solicitados (uno por recurso o por tipo/quantidad)
CREATE TABLE request_item (
  id                BIGSERIAL PRIMARY KEY,
  request_id        BIGINT NOT NULL REFERENCES request(id) ON DELETE CASCADE,
  resource_id       BIGINT REFERENCES resource(id),
  type              VARCHAR(20) NOT NULL CHECK (type IN ('EQUIPMENT','CONSUMABLE','SOFTWARE','LAB_SPACE')),
  qty               NUMERIC(14,3) NOT NULL DEFAULT 1,   -- para consumibles
  use_start         TIMESTAMP NOT NULL,
  use_end           TIMESTAMP NOT NULL,
  status            VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE'
                      CHECK (status IN ('PENDIENTE','APROBADA','RECHAZADA')),
  CHECK (use_end > use_start)
);

-- Adjuntos (documentos soporte)
CREATE TABLE request_attachment (
  id                BIGSERIAL PRIMARY KEY,
  request_id        BIGINT NOT NULL REFERENCES request(id) ON DELETE CASCADE,
  filename          VARCHAR(200) NOT NULL,
  url               TEXT NOT NULL,
  uploaded_at       TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Registro de acciones sobre la solicitud
CREATE TABLE request_action (
  id                BIGSERIAL PRIMARY KEY,
  request_id        BIGINT NOT NULL REFERENCES request(id) ON DELETE CASCADE,
  actor_user_id     BIGINT NOT NULL REFERENCES app_user(id),
  action            VARCHAR(20) NOT NULL            -- APROBAR, RECHAZAR, SOLICITAR_INFO, CANCELAR
                    CHECK (action IN ('APROBAR','RECHAZAR','SOLICITAR_INFO','CANCELAR')),
  reason            TEXT,                           -- motivo si aplica
  created_at        TIMESTAMP NOT NULL DEFAULT NOW()
);

-- =========================
-- 7) ASIGNACIÓN, ENTREGA, DEVOLUCIÓN
-- =========================
-- Préstamo/entrega asociado a una solicitud aprobada
CREATE TABLE loan (
  id                BIGSERIAL PRIMARY KEY,
  request_id        BIGINT NOT NULL REFERENCES request(id) ON DELETE CASCADE,
  lab_id            BIGINT NOT NULL REFERENCES lab(id),
  delivered_by      BIGINT REFERENCES app_user(id), -- técnico
  received_by       BIGINT REFERENCES app_user(id), -- usuario
  delivered_at      TIMESTAMP,
  returned_at       TIMESTAMP,
  status            VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE'
                      CHECK (status IN ('PENDIENTE','ENTREGADO','DEVUELTO','INCIDENCIA')),
  notes             TEXT
);

-- Detalle por recurso (equipos/consumibles/software)
CREATE TABLE loan_item (
  id                BIGSERIAL PRIMARY KEY,
  loan_id           BIGINT NOT NULL REFERENCES loan(id) ON DELETE CASCADE,
  resource_id       BIGINT NOT NULL REFERENCES resource(id),
  type              VARCHAR(20) NOT NULL CHECK (type IN ('EQUIPMENT','CONSUMABLE','SOFTWARE')),
  qty_out           NUMERIC(14,3) NOT NULL DEFAULT 1, -- consumibles: cantidad entregada
  qty_in            NUMERIC(14,3),                    -- consumibles: cantidad devuelta (si aplica)
  condition_out     VARCHAR(160),                     -- equipos: estado al salir
  condition_in      VARCHAR(160),                     -- equipos: estado al retornar
  observation       TEXT
);

-- =========================
-- 8) INVENTARIO Y MOVIMIENTOS
-- =========================
CREATE TABLE inventory_move (
  id                BIGSERIAL PRIMARY KEY,
  resource_id       BIGINT NOT NULL REFERENCES resource(id),
  move_type         VARCHAR(10) NOT NULL CHECK (move_type IN ('IN','OUT')),
  qty               NUMERIC(14,3) NOT NULL,
  moved_by          BIGINT REFERENCES app_user(id),
  reason            VARCHAR(160),                      -- reabastecimiento, consumo, ajuste
  created_at        TIMESTAMP NOT NULL DEFAULT NOW()
);

-- =========================
-- 9) MANTENIMIENTOS
-- =========================
CREATE TABLE maintenance (
  id                BIGSERIAL PRIMARY KEY,
  equipment_id      BIGINT NOT NULL REFERENCES resource(id),
  lab_id            BIGINT NOT NULL REFERENCES lab(id),
  maint_type        VARCHAR(20) NOT NULL CHECK (maint_type IN ('PREVENTIVO','CORRECTIVO')),
  scheduled_date    DATE NOT NULL,
  performed_at      TIMESTAMP,
  technician_name   VARCHAR(160),
  detail            TEXT,
  state_after       VARCHAR(20) CHECK (state_after IN ('DISPONIBLE','INACTIVO','EN_MANTENIMIENTO')),
  created_at        TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Repuestos/consumibles usados en mantenimiento
CREATE TABLE maintenance_part (
  id                BIGSERIAL PRIMARY KEY,
  maintenance_id    BIGINT NOT NULL REFERENCES maintenance(id) ON DELETE CASCADE,
  consumable_id     BIGINT NOT NULL REFERENCES resource(id),
  qty_used          NUMERIC(14,3) NOT NULL
);

-- =========================
-- 10) HISTORIALES DEL USUARIO
-- =========================
CREATE TABLE user_activity (
  id                BIGSERIAL PRIMARY KEY,
  user_id           BIGINT NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  activity_type     VARCHAR(30) NOT NULL
                      CHECK (activity_type IN ('RESERVA','PRESTAMO','DEVOLUCION','CAPACITACION')),
  ref_table         VARCHAR(60),
  ref_id            BIGINT,
  occurred_at       TIMESTAMP NOT NULL DEFAULT NOW(),
  detail            TEXT
);

-- Reconocimiento académico (horas/créditos/constancias)
CREATE TABLE academic_benefit (
  id                BIGSERIAL PRIMARY KEY,
  user_id           BIGINT NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  request_id        BIGINT REFERENCES request(id) ON DELETE SET NULL,
  hours             NUMERIC(6,2),
  credits           NUMERIC(6,2),
  certificate_code  VARCHAR(80),
  issued_at         DATE
);

-- =========================
-- 11) NOTIFICACIONES Y MENSAJERÍA
-- =========================
CREATE TABLE notification (
  id                BIGSERIAL PRIMARY KEY,
  user_id           BIGINT NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  topic             VARCHAR(80) NOT NULL,      -- reserva_aprobada, retraso, liberacion_recurso, etc.
  subject           VARCHAR(200) NOT NULL,
  body              TEXT NOT NULL,
  channel           VARCHAR(20) NOT NULL CHECK (channel IN ('EMAIL','INTERNA')),
  sent_at           TIMESTAMP NOT NULL DEFAULT NOW(),
  read_at           TIMESTAMP
);

CREATE TABLE message_thread (
  id                BIGSERIAL PRIMARY KEY,
  request_id        BIGINT REFERENCES request(id) ON DELETE CASCADE,
  lab_id            BIGINT REFERENCES lab(id),
  created_at        TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE message (
  id                BIGSERIAL PRIMARY KEY,
  thread_id         BIGINT NOT NULL REFERENCES message_thread(id) ON DELETE CASCADE,
  sender_id         BIGINT NOT NULL REFERENCES app_user(id),
  body              TEXT NOT NULL,
  created_at        TIMESTAMP NOT NULL DEFAULT NOW()
);

-- =========================
-- 12) AUDITORÍA Y PARÁMETROS
-- =========================
CREATE TABLE audit_log (
  id                BIGSERIAL PRIMARY KEY,
  actor_user_id     BIGINT REFERENCES app_user(id),
  module            VARCHAR(60) NOT NULL,          -- 'LAB','INVENTARIO','RESERVAS','ADMIN', etc.
  action            VARCHAR(40) NOT NULL,          -- CREATE, UPDATE, DELETE, LOGIN, CONFIG_CHANGE...
  entity            VARCHAR(60) NOT NULL,
  entity_id         BIGINT,
  before_snapshot   TEXT,                          -- opcional: dif o json textual
  after_snapshot    TEXT,
  created_at        TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE system_setting (
  id                BIGSERIAL PRIMARY KEY,
  key               VARCHAR(80) UNIQUE NOT NULL,   -- p.ej. 'reserva.duracion_max'
  value             VARCHAR(200) NOT NULL,
  updated_at        TIMESTAMP NOT NULL DEFAULT NOW()
);

-- =========================
-- 13) ÍNDICES RECOMENDADOS
-- (para búsquedas y filtros mencionados en requerimientos)
-- =========================
CREATE INDEX idx_user_email ON app_user(email);
CREATE INDEX idx_lab_school ON lab(school_dept_id);
CREATE INDEX idx_res_lab_type ON resource(lab_id, type);
CREATE INDEX idx_res_state ON resource(state);
CREATE INDEX idx_cons_reorder ON consumable_stock(resource_id, qty_available);
CREATE INDEX idx_slot_lab_time ON calendar_slot(lab_id, starts_at, ends_at);
CREATE INDEX idx_slot_resource_time ON calendar_slot(resource_id, starts_at, ends_at);
CREATE INDEX idx_request_status ON request(status);
CREATE INDEX idx_request_item_time ON request_item(use_start, use_end);
CREATE INDEX idx_loan_status ON loan(status);
CREATE INDEX idx_inventory_move_resource ON inventory_move(resource_id, created_at);
CREATE INDEX idx_maintenance_equipment ON maintenance(equipment_id, scheduled_date);
CREATE INDEX idx_user_activity_user ON user_activity(user_id, occurred_at);
CREATE INDEX idx_notification_user ON notification(user_id, sent_at);
CREATE INDEX idx_audit_created ON audit_log(created_at);

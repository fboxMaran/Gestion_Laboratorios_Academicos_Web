-- Requiere Postgres + pgcrypto (para bcrypt)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ADMIN (@itcr.ac.cr)
INSERT INTO users (role, email, password_hash, full_name, program_department, phone, is_active)
VALUES (
  'ADMIN',
  'admin.demo@itcr.ac.cr',
  crypt('Admin123!', gen_salt('bf', 10)),
  'Admin Demo',
  'Rectoría',
  '8888-0001',
  TRUE
)
ON CONFLICT (email) DO NOTHING;

-- DOCENTE (@itcr.ac.cr)
INSERT INTO users (role, email, password_hash, full_name, teacher_code, program_department, phone, is_active)
VALUES (
  'DOCENTE',
  'prof.demo@itcr.ac.cr',
  crypt('Docente123!', gen_salt('bf', 10)),
  'Profesor Demo',
  'D-12345',
  'Escuela de Ingeniería',
  '8888-0002',
  TRUE
)
ON CONFLICT (email) DO NOTHING;

-- TÉCNICO (@tec.ac.cr)  ← OK por seed directo (el registro vía API no acepta @tec.ac.cr)
INSERT INTO users (role, email, password_hash, full_name, program_department, phone, is_active)
VALUES (
  'TECNICO',
  'tecn.demo@tec.ac.cr',
  crypt('Tecnico123!', gen_salt('bf', 10)),
  'Técnico Demo',
  'Departamento de Laboratorios',
  '8888-0003',
  TRUE
)
ON CONFLICT (email) DO NOTHING;

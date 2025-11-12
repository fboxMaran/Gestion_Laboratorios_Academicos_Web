# ============================================================================
# Script de Instalación Rápida de Base de Datos (PowerShell)
# Sistema de Gestión de Laboratorios Académicos
# ============================================================================

# Configuración
$ErrorActionPreference = "Stop"

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  Instalación de Base de Datos - Gestión de Laboratorios" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# Verificar que psql está disponible
try {
    $null = Get-Command psql -ErrorAction Stop
} catch {
    Write-Host "ERROR: PostgreSQL no está instalado o no está en el PATH" -ForegroundColor Red
    Write-Host "Por favor instala PostgreSQL primero" -ForegroundColor Yellow
    exit 1
}

# Solicitar credenciales
Write-Host "Ingresa las credenciales de PostgreSQL:" -ForegroundColor Yellow
$DB_USER = Read-Host "Usuario de PostgreSQL [postgres]"
if ([string]::IsNullOrWhiteSpace($DB_USER)) {
    $DB_USER = "postgres"
}

$DB_PASSWORD = Read-Host "Contraseña" -AsSecureString
$DB_PASSWORD_PLAIN = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [Runtime.InteropServices.Marshal]::SecureStringToBSTR($DB_PASSWORD)
)

$DB_NAME = "gestion_laboratorios"

# Verificar conexión
Write-Host ""
Write-Host "Verificando conexión a PostgreSQL..." -ForegroundColor Yellow
$env:PGPASSWORD = $DB_PASSWORD_PLAIN

try {
    $result = psql -U $DB_USER -d postgres -c "SELECT version();" 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "Error de conexión"
    }
    Write-Host "✓ Conexión exitosa" -ForegroundColor Green
} catch {
    Write-Host "ERROR: No se pudo conectar a PostgreSQL" -ForegroundColor Red
    Write-Host "Verifica usuario y contraseña" -ForegroundColor Yellow
    exit 1
}

# Verificar si la base de datos existe
Write-Host ""
Write-Host "Verificando base de datos..." -ForegroundColor Yellow
$DB_EXISTS = psql -U $DB_USER -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'" 2>&1

if ($DB_EXISTS -eq "1") {
    Write-Host "La base de datos '$DB_NAME' ya existe" -ForegroundColor Yellow
    $RECREATE = Read-Host "¿Deseas ELIMINARLA y recrearla? (s/N)"
    
    if ($RECREATE -eq "s" -or $RECREATE -eq "S") {
        Write-Host "Eliminando base de datos existente..." -ForegroundColor Red
        psql -U $DB_USER -d postgres -c "DROP DATABASE IF EXISTS $DB_NAME;" | Out-Null
        Write-Host "✓ Base de datos eliminada" -ForegroundColor Green
        
        Write-Host "Creando nueva base de datos..." -ForegroundColor Yellow
        psql -U $DB_USER -d postgres -c "CREATE DATABASE $DB_NAME WITH ENCODING 'UTF8';" | Out-Null
        Write-Host "✓ Base de datos creada" -ForegroundColor Green
    } else {
        Write-Host "Usando base de datos existente" -ForegroundColor Yellow
    }
} else {
    Write-Host "Creando base de datos..." -ForegroundColor Yellow
    psql -U $DB_USER -d postgres -c "CREATE DATABASE $DB_NAME WITH ENCODING 'UTF8';" | Out-Null
    Write-Host "✓ Base de datos creada" -ForegroundColor Green
}

# Ejecutar script SQL
Write-Host ""
Write-Host "Ejecutando script de creación de tablas..." -ForegroundColor Yellow

$scriptPath = Join-Path $PSScriptRoot "schema.sql"
if (-not (Test-Path $scriptPath)) {
    Write-Host "ERROR: No se encuentra el archivo schema.sql" -ForegroundColor Red
    exit 1
}

try {
    psql -U $DB_USER -d $DB_NAME -f $scriptPath 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Script ejecutado exitosamente" -ForegroundColor Green
    } else {
        throw "Error al ejecutar script"
    }
} catch {
    Write-Host "ERROR al ejecutar el script" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}

# Verificar tablas creadas
Write-Host ""
Write-Host "Verificando tablas creadas..." -ForegroundColor Yellow
$TABLE_COUNT = psql -U $DB_USER -d $DB_NAME -tAc "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE';"
Write-Host "✓ $TABLE_COUNT tablas creadas correctamente" -ForegroundColor Green

# Mostrar resumen
Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host "  ✓ INSTALACIÓN COMPLETADA EXITOSAMENTE" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Base de datos: $DB_NAME"
Write-Host "Tablas creadas: $TABLE_COUNT"
Write-Host ""
Write-Host "Usuarios de prueba disponibles (contraseña: demo123):" -ForegroundColor Cyan
Write-Host "  - usuario@demo.edu       (Estudiante)"
Write-Host "  - profesor@itcr.ac.cr    (Docente)"
Write-Host "  - tecnico@demo.edu       (EncargadoTecnico)"
Write-Host "  - admin@itcr.ac.cr       (Admin)"
Write-Host ""
Write-Host "Para probar la conexión:" -ForegroundColor Yellow
Write-Host "  psql -U $DB_USER -d $DB_NAME"
Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan

# Limpiar contraseña del ambiente
$env:PGPASSWORD = $null

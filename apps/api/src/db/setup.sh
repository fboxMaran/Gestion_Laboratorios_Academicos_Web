#!/bin/bash
# ============================================================================
# Script de Instalación Rápida de Base de Datos
# Sistema de Gestión de Laboratorios Académicos
# ============================================================================

# Colores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "============================================================"
echo "  Instalación de Base de Datos - Gestión de Laboratorios"
echo "============================================================"
echo ""

# Verificar que PostgreSQL está instalado
if ! command -v psql &> /dev/null; then
    echo -e "${RED}ERROR: PostgreSQL no está instalado${NC}"
    echo "Por favor instala PostgreSQL primero"
    exit 1
fi

# Solicitar credenciales
echo -e "${YELLOW}Ingresa las credenciales de PostgreSQL:${NC}"
read -p "Usuario de PostgreSQL [postgres]: " DB_USER
DB_USER=${DB_USER:-postgres}

read -sp "Contraseña: " DB_PASSWORD
echo ""

DB_NAME="gestion_laboratorios"

# Verificar conexión
echo ""
echo -e "${YELLOW}Verificando conexión a PostgreSQL...${NC}"
PGPASSWORD=$DB_PASSWORD psql -U $DB_USER -d postgres -c "SELECT version();" > /dev/null 2>&1

if [ $? -ne 0 ]; then
    echo -e "${RED}ERROR: No se pudo conectar a PostgreSQL${NC}"
    echo "Verifica usuario y contraseña"
    exit 1
fi

echo -e "${GREEN}✓ Conexión exitosa${NC}"

# Verificar si la base de datos existe
echo ""
echo -e "${YELLOW}Verificando base de datos...${NC}"
DB_EXISTS=$(PGPASSWORD=$DB_PASSWORD psql -U $DB_USER -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'")

if [ "$DB_EXISTS" = "1" ]; then
    echo -e "${YELLOW}La base de datos '$DB_NAME' ya existe${NC}"
    read -p "¿Deseas ELIMINARLA y recrearla? (s/N): " RECREATE
    
    if [ "$RECREATE" = "s" ] || [ "$RECREATE" = "S" ]; then
        echo -e "${RED}Eliminando base de datos existente...${NC}"
        PGPASSWORD=$DB_PASSWORD psql -U $DB_USER -d postgres -c "DROP DATABASE IF EXISTS $DB_NAME;"
        echo -e "${GREEN}✓ Base de datos eliminada${NC}"
        
        echo -e "${YELLOW}Creando nueva base de datos...${NC}"
        PGPASSWORD=$DB_PASSWORD psql -U $DB_USER -d postgres -c "CREATE DATABASE $DB_NAME WITH ENCODING 'UTF8';"
        echo -e "${GREEN}✓ Base de datos creada${NC}"
    else
        echo -e "${YELLOW}Usando base de datos existente${NC}"
    fi
else
    echo -e "${YELLOW}Creando base de datos...${NC}"
    PGPASSWORD=$DB_PASSWORD psql -U $DB_USER -d postgres -c "CREATE DATABASE $DB_NAME WITH ENCODING 'UTF8';"
    echo -e "${GREEN}✓ Base de datos creada${NC}"
fi

# Ejecutar script SQL
echo ""
echo -e "${YELLOW}Ejecutando script de creación de tablas...${NC}"
PGPASSWORD=$DB_PASSWORD psql -U $DB_USER -d $DB_NAME -f schema.sql > /dev/null 2>&1

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Script ejecutado exitosamente${NC}"
else
    echo -e "${RED}ERROR al ejecutar el script${NC}"
    exit 1
fi

# Verificar tablas creadas
echo ""
echo -e "${YELLOW}Verificando tablas creadas...${NC}"
TABLE_COUNT=$(PGPASSWORD=$DB_PASSWORD psql -U $DB_USER -d $DB_NAME -tAc "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE';")

echo -e "${GREEN}✓ $TABLE_COUNT tablas creadas correctamente${NC}"

# Mostrar resumen
echo ""
echo "============================================================"
echo -e "${GREEN}  ✓ INSTALACIÓN COMPLETADA EXITOSAMENTE${NC}"
echo "============================================================"
echo ""
echo "Base de datos: $DB_NAME"
echo "Tablas creadas: $TABLE_COUNT"
echo ""
echo "Usuarios de prueba disponibles (contraseña: demo123):"
echo "  - usuario@demo.edu       (Estudiante)"
echo "  - profesor@itcr.ac.cr    (Docente)"
echo "  - tecnico@demo.edu       (EncargadoTecnico)"
echo "  - admin@itcr.ac.cr       (Admin)"
echo ""
echo "Para probar la conexión:"
echo "  psql -U $DB_USER -d $DB_NAME"
echo ""
echo "============================================================"

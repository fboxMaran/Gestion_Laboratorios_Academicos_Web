# Gestión de Laboratorios Académicos (LabTEC)

Monorepo con:
- **API** (Node/Express + PostgreSQL) bajo Docker
- **App móvil** (React Native con Expo Go)

## 0. Prerrequisitos

- **Docker Desktop** (incluye Docker Compose)
- **Node.js 18+**
- **Expo Go** en tu teléfono (Android/iOS)
- Misma **Wi-Fi** para PC y teléfono

## 1. Variables de entorno

Crea un archivo `.env` en la **raíz** (puedes copiar de `.env.example`):

```env
# Postgres
POSTGRES_USER=labtec
POSTGRES_PASSWORD=labtec
POSTGRES_DB=labtec

# API
API_PORT=8080
NODE_ENV=development
CORS_ORIGIN=http://localhost:19006,http://localhost:19000,exp://*

# pgAdmin (panel web)
PGADMIN_DEFAULT_EMAIL=admin@tec.ac.cr
PGADMIN_DEFAULT_PASSWORD=admin123
PGADMIN_PORT=5050


Mobile (Expo)

En apps/mobile/.env pon la IP LAN de tu PC:

# Reemplaza 192.168.68.101 por tu IPv4 (ipconfig)
EXPO_PUBLIC_API_URL=http://192.168.68.101:8080/api

Para saber tu IP: ipconfig -> en el cmd






-----------------INICIAR EL DOCKER en la raiz----------------
# 1. Iniciar contenedores de Postgres y PgAdmin (en segundo plano)
docker-compose up -d --build

# 2. Verificar que todo esté corriendo
docker-compose ps

-----------------DETENER EL DOCKER en la raiz----------------
# 1. Detiene y elimina contenedores del proyecto
docker-compose down

# 2. Además de detener, elimina los volúmenes del proyecto (incluye datos como la base de datos)
docker-compose down --volumes

# 3. Limpieza total del proyecto: contenedores + volúmenes + redes huérfanas
docker-compose down --volumes --remove-orphans

# 4. (Global) Elimina:
# - Imágenes no usadas
# - Contenedores detenidos
# - Volúmenes no referenciados
# - Redes no conectadas
docker system prune -a --volumes



3. Correr la app móvil (Expo Go)

Primera vez:

cd apps/mobile
npm i
npx expo install axios

npm start


labtec/
├─ apps/
│  ├─ api/                 # API Node/Express
│  │  ├─ src/
│  │  │  ├─ app.js         # middlewares y montaje de rutas
│  │  │  ├─ server.js      # arranque + test conexión DB
│  │  │  ├─ db/
│  │  │  │  └─ pool.js     # cliente PG (usa DATABASE_URL)
│  │  │  ├─ routes/        # URL → controlador
│  │  │  │  ├─ index.js    # /api raíz
│  │  │  │  └─ health.routes.js
│  │  │  ├─ controllers/   # lógica HTTP (usa modelos)
│  │  │  │  └─ health.controller.js
│  │  │  ├─ models/        # SQL hacia Postgres
│  │  │  │  └─ health.model.js
│  │  │  └─ middlewares/   # error handler, auth, etc.
│  │  ├─ Dockerfile
│  │  └─ package.json      # "dev": "node src/server.js"
│  └─ mobile/              # React Native (Expo + expo-router)
│     ├─ app/              # pantallas (tabs, index, etc.)
│     ├─ components/       # UI reutilizable
│     ├─ constants/        # constantes (colores, etc.)
│     ├─ hooks/            # hooks compartidos
│     ├─ services/         # api.ts (axios instance)
│     ├─ assets/           # imágenes, fuentes
│     ├─ .env              # EXPO_PUBLIC_API_URL
│     └─ package.json
├─ docker-compose.yml       # db, pgadmin, api
├─ .env                     # variables para compose y API
└─ README.md


# Postgres
POSTGRES_USER=labtec
POSTGRES_PASSWORD=labtec
POSTGRES_DB=labtec

# API
API_PORT=8080
NODE_ENV=development
# Orígenes permitidos para desarrollo (Expo)
CORS_ORIGIN=http://localhost:19006,http://localhost:19000,exp://*

# pgAdmin
PGADMIN_DEFAULT_EMAIL=admin@tec.ac.cr
PGADMIN_DEFAULT_PASSWORD=admin123
PGADMIN_PORT=5050

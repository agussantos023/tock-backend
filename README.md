# 🎵 Tock Music Stack

Sistema de streaming de música personal construido con Bun, Angular 19 y MySQL. Incluye transcodificación automática a Opus, gestión de almacenamiento y seguridad basada en OTP.

# 📂 Estructura del Proyecto (Requisito Docker)

Para que la orquestación funcione, los repositorios deben ser carpetas hermanas. El docker-compose reside en el backend pero construye ambos:
Plaintext

tu-espacio-de-trabajo/
├── tock-backend/ # Contiene el orquestador (docker-compose.yml)
└── tock-frontend/ # Repositorio de la interfaz de usuario

🚀 Instalación Rápida (One-Click Start)

1. Preparar Variables de Entorno

Crea el archivo .env en la raíz de tock-backend (puedes copiar el .env.example):
Bash

# Contraseñas de Base de Datos

DB_ROOT_PASSWORD=tock_root_secure
DB_NAME=tock_music_db
DB_USER=tock_user
DB_PASSWORD=tock_user_password

# URL para Prisma (Apunta al servicio del contenedor)

DATABASE_URL="mysql://root:tock_root_secure@mysql-db:3306/tock_music_db"

# Seguridad

JWT_SECRET=tu_secreto_aleatorio_aqui

# Servicios Externos

RESEND_API_KEY=re_123456789 # Consigue una en resend.com

2. Levantar el Stack

Desde la carpeta tock-backend, ejecuta:
Bash

docker compose up --build

¿Qué hace este comando automáticamente?

    Levanta un servidor MySQL 8.4.

    Compila el Backend con soporte para ffmpeg.

    Ejecuta prisma db push para crear las tablas y prisma db seed para los datos iniciales.

    Levanta el Frontend en modo desarrollo con Hot Reload.

# 🔗 Accesos Directos

    Frontend: http://localhost:4200

    API Backend: http://localhost:3000

# 💡 Notas para Desarrolladores

    CORS: El backend está preconfigurado para aceptar peticiones desde http://localhost:4200 con credentials: true.

    Uploads: Los archivos se guardan en el volumen persistente ./uploads en el backend. No se borran al apagar los contenedores.

    Transcodificación: Cualquier audio subido se convierte automáticamente a .opus mediante ffmpeg dentro del contenedor de Node/Bun para ahorrar espacio.

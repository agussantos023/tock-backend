FROM oven/bun:1 AS base
WORKDIR /app

# Instalamos ffmpeg
RUN apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*

# Copiamos solo los archivos necesarios para instalar dependencias
COPY package.json bun.lockb* ./

# Instalamos solo dependencias de producción (más rápido y ligero)
RUN bun install --frozen-lockfile --production

COPY . .

# Generamos prisma
RUN bunx prisma generate

EXPOSE 3000

# En producción NO usamos --watch
CMD ["bun", "server.ts"]
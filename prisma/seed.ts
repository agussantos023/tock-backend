// prisma/seed.ts
import { PrismaClient } from "@prisma/client";
import { seedSystem } from "./seeds/system.seed";
import { seedSongs } from "./seeds/songs.seed";

const prisma = new PrismaClient();

async function main() {
  // Miramos si entre los argumentos existe "--data"
  const isFullSeed = process.argv.includes("--data");

  console.log("🌱 Iniciando siembra de base de datos...");

  await seedSystem(prisma);
  console.log("✅ Configuración base completada.");

  if (isFullSeed) {
    console.log("📦 Generando datos de prueba (usuarios y canciones)...");
    await seedSongs(prisma);
  } else {
    console.log("⏭️  Saltando datos de prueba (usa --data para incluirlos).");
  }

  console.log("🏁 Proceso completado.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

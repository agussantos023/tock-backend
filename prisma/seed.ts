import { PrismaClient } from "@prisma/client";
import { seedSystem } from "./seeds/system.seed";
import { seedSongs } from "./seeds/songs.seed";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Iniciando siembra de base de datos...");

  // Ejecución por módulos
  await seedSystem(prisma);

  await seedSongs(prisma);

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

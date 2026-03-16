import { faker } from "@faker-js/faker";
import type { PrismaClient } from "@prisma/client/extension";

export async function seedSongs(prisma: PrismaClient) {
  const userEmail = "agustindelossantos023@gmail.com";
  let user = await prisma.user.findUnique({ where: { email: userEmail } });
  const hashedPassword = await Bun.password.hash("1");

  if (!user) {
    // Crear Usuario si no existe
    user = await prisma.user.create({
      data: {
        email: userEmail,
        password: hashedPassword,
        storage_limit: 524288000, // 500MB
        storage_used: 0,
        is_verified: true,
      },
    });
  }

  for (let i = 0; i < 100; i++) {
    const songData = {
      title: faker.person.firstName(),
      artist: faker.person.lastName(),
      album: faker.commerce.productName(),
      duration: Math.floor(Math.random() * 360) + 60, // Numero aleatorio entre 1 y 6 minutos
      year: Math.floor(Math.random() * 100) + 1950, // Año aleatorio entre 1950 y 2049
      order_par: faker.string.alphanumeric(3),
      order_impar: faker.string.alphanumeric(3),
      file_path: `uploads/${faker.string.numeric(13)}-${faker.string.numeric(5)}.opus`,
      file_size: Math.floor(Math.random() * 2048000) + 1024000, // Tamaño aleatorio entre 1MB y 3MB
      user_id: user.id,
    };

    await prisma.song.create({
      data: songData,
    });
  }

  console.log(
    "✅ Canciones aleatorias generadas y asociadas con el usuario principal.",
  );
}

import { prisma } from "../config/db";
import { Prisma } from "@prisma/client";
import type { Request, Response } from "express";
import fs from "fs";
import path from "path";

import { generateHexadecimalCode } from "../utils/codes";
import { AudioService } from "../services/audio.service";
import { getShufflerConfig } from "../utils/shuffler";
import { audioLimit } from "config/concurrency";
import type { DeleteSongsRequest } from "interfaces/song.interface";

export const uploadSong = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const file = req.file;
  const title = req.body.title.trim() || "";
  const userId = req.userId as number;

  let rawOpusPath: string | null = null;
  let cleanOpusPath: string | null = null;

  try {
    if (!file) {
      return res.status(400).json({ error: "No se ha subido ningún archivo" });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { storage_used: true, storage_limit: true },
    });

    const MARGIN_5MB = BigInt(5 * 1024 * 1024);

    if (!user || user.storage_limit - user.storage_used < MARGIN_5MB) {
      AudioService.deleteFile(file.path);

      return res.status(507).json({
        error:
          "Límite de almacenamiento crítico alcanzado (mínimo 5MB libres requeridos)",
      });
    }

    if (!title) {
      AudioService.deleteFile(file.path);
      return res.status(400).json({ error: "El título es obligatorio" });
    }

    // Preparar rutas
    const isOpus =
      file.mimetype === "audio/opus" || file.mimetype === "audio/ogg";

    const timestamp = Date.now();
    const salt = Math.round(Math.random() * 100);
    rawOpusPath = path.join("uploads", "temp", `raw-${timestamp}-${salt}.opus`);
    cleanOpusPath = path.join(
      "uploads",
      "temp",
      `clean-${timestamp}-${salt}.opus`,
    );

    if (!rawOpusPath || !cleanOpusPath) {
      throw new Error("Error al generar las rutas de procesamiento");
    }

    const finalRawPath = rawOpusPath;
    const finalCleanPath = cleanOpusPath;

    const metadata = await audioLimit(() =>
      AudioService.getMetadata(file.path),
    );
    const tags = metadata.format.tags || {};
    const fallbackTitle = file.originalname.replace(/\.[^/.]+$/, "");

    // PIPELINE DINÁMICO
    if (!isOpus) {
      // Convertimos a Opus
      await audioLimit(() =>
        AudioService.convertToOpus(file.path, finalRawPath),
      );

      AudioService.deleteFile(file.path); // Borramos el MP3 original
    } else {
      // Simplemente renombramos para que el siguiente paso (stripMetadata) lo encuentre
      fs.renameSync(file.path, rawOpusPath);
    }

    // Limpieza de metadata
    await audioLimit(() =>
      AudioService.stripMetadata(finalRawPath, finalCleanPath),
    );
    AudioService.deleteFile(rawOpusPath);

    // Validacion de espacio
    const stats = fs.statSync(cleanOpusPath);
    const finalSize = BigInt(stats.size);

    if (user.storage_used + finalSize > user.storage_limit) {
      AudioService.deleteFile(cleanOpusPath);
      return res
        .status(403)
        .json({ error: "El archivo procesado excede tu límite restante" });
    }

    // Mover song a carpeta final (uploads/) con nombre definitivo
    const finalFileName = AudioService.generateFinalName();
    const finalPath = path.join("uploads", finalFileName);
    fs.renameSync(cleanOpusPath, finalPath);

    const result = await prisma.$transaction(
      async (tx: any) => {
        const user = await tx.user.findUnique({
          where: { id: userId },
          select: { storage_used: true, storage_limit: true },
        });

        if (!user || user.storage_used + finalSize > user.storage_limit) {
          throw new Error("STORAGE_FULL");
        }

        const song = await tx.song.create({
          data: {
            title: (
              title ||
              tags.title ||
              fallbackTitle ||
              "Sin título"
            ).substring(0, 50),
            artist: (tags.artist || "Artista desconocido").substring(0, 50),
            album: (tags.album || "Single").substring(0, 50),
            duration: Math.round(metadata.format.duration || 0),
            year: tags.date ? parseInt(tags.date.substring(0, 4)) : null,
            order_par: generateHexadecimalCode(3),
            order_impar: generateHexadecimalCode(3),
            file_path: finalPath,
            file_size: finalSize,
            user_id: userId,
          },
        });

        const updatedUser = await tx.user.update({
          where: { id: userId },
          data: {
            storage_used: {
              increment: finalSize,
            },
          },
          select: { storage_used: true },
        });

        return {
          song,
          storage: {
            used: updatedUser.storage_used.toString(),
          },
        };
      },
      {
        maxWait: 5000, // Espera hasta 5s para entrar en la transacción
        timeout: 10000, // 10s de tiempo total
      },
    );

    return res.status(201).json(result);
  } catch (error) {
    const err = error as Error;

    console.error(`[UPLOAD_ERROR] [User: ${userId}]: ${err.message}`);

    // Limpieza segura en caso de error catastrófico
    if (file?.path) AudioService.deleteFile(file.path);
    if (rawOpusPath) AudioService.deleteFile(rawOpusPath);
    if (cleanOpusPath) AudioService.deleteFile(cleanOpusPath);

    return res.status(500).json({ error: "Error interno procesando el audio" });
  }
};

export const getSongFile = async (
  req: Request,
  res: Response,
): Promise<any> => {
  const { id } = req.params;
  const { oppositeCol } = getShufflerConfig();

  try {
    const song = await prisma.song.update({
      where: { id: Number(id) },
      data: {
        [oppositeCol]: generateHexadecimalCode(3),
      },
    });

    if (!song) return res.status(404).json({ error: "Canción no encontrada" });

    const absolutePath = path.join(process.cwd(), song.file_path);

    res.sendFile(absolutePath);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al obtener el archivo" });
  }
};

export const getSongsPaged = async (
  req: Request,
  res: Response,
): Promise<any> => {
  const userId = req.userId;

  // Recogemos parámetros de la query con valores por defecto
  const limit = Math.max(1, parseInt(req.query.limit as string) || 40);
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const skip = (page - 1) * limit;

  const { currentCol } = getShufflerConfig();

  try {
    const songs = await prisma.song.findMany({
      where: {
        user_id: userId,
      },
      take: limit,
      skip: skip,
      select: {
        id: true,
        title: true,
        artist: true,
        duration: true,
        file_size: true,
      },
      orderBy: [{ [currentCol]: "asc" }, { id: "asc" }],
    });

    const songsReady = songs.map((song) => ({
      ...song,
      file_size: Number(song.file_size),
      audio_url: `/api/songs/${song.id}/audio`,
    }));

    return res.status(200).json({
      page,
      limit,
      data: songsReady,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al obtener las canciones" });
  }
};

export const deleteSong = async (req: Request, res: Response): Promise<any> => {
  const { ids } = req.body as DeleteSongsRequest;
  const userId = req.userId;

  try {
    // Definir qué canciones vamos a borrar
    const whereCondition: any = { user_id: userId };

    if (ids !== "all") whereCondition.id = { in: ids.map(Number) };

    const songsToDelete = await prisma.song.findMany({
      where: whereCondition,
    });

    if (songsToDelete.length === 0) {
      return res
        .status(404)
        .json({ message: "No se encontraron canciones para eliminar" });
    }

    // Borrar archivos físicos
    for (const song of songsToDelete) {
      const absolutePath = path.join(process.cwd(), song.file_path);

      AudioService.deleteFile(absolutePath);
    }

    const totalSizeToDecrement = songsToDelete.reduce(
      (acc, s) => acc + BigInt(s.file_size),
      0n, // El '0n' indica que el acumulador inicial es un BigInt
    );

    const updatedUser = await prisma.$transaction(async (tx: any) => {
      await tx.song.deleteMany({ where: whereCondition });

      return await tx.user.update({
        where: { id: userId },
        data: {
          storage_used: { decrement: totalSizeToDecrement },
        },
        select: {
          storage_used: true,
          storage_limit: true,
        },
      });
    });

    return res.json({
      message:
        ids === "all"
          ? "Todas las canciones eliminadas"
          : "Canciones eliminadas",
      count: songsToDelete.length,
      storage: {
        used: updatedUser.storage_used.toString(),
        limit: updatedUser.storage_limit.toString(),
        available: (
          updatedUser.storage_limit - updatedUser.storage_used
        ).toString(),
      },
    });
  } catch (error) {
    console.error("Error eliminando canciones:", error);
    return res.status(500).json({ error: "Error al eliminar las canciones" });
  }
};

export const shuffleListNow = async (
  req: Request,
  res: Response,
): Promise<any> => {
  const userId = req.userId;
  const limit = parseInt(req.query.limit as string) || 40;
  const { currentCol } = getShufflerConfig();

  try {
    await prisma.$executeRaw`
      UPDATE Song 
      SET ${Prisma.raw(currentCol)} = LEFT(UPPER(MD5(RAND())), 3)
      WHERE user_id = ${userId}
    `;

    const songs = await prisma.song.findMany({
      where: { user_id: userId },
      take: limit,
      skip: 0,
      select: {
        id: true,
        title: true,
        artist: true,
        duration: true,
        file_size: true,
      },
      orderBy: {
        [currentCol]: "asc",
      },
    });

    const songsReady = songs.map((song) => ({
      ...song,
      file_size: Number(song.file_size),
      audio_url: `/api/songs/${song.id}/audio`,
    }));

    return res.status(200).json({
      page: 1,
      limit,
      data: songsReady,
    });
  } catch (error) {
    console.error("Error al aleatorizar la lista:", error);
    return res.status(500).json({ error: "Error interno al aleatorizar" });
  }
};

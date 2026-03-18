import { prisma } from "../config/db";
import { Prisma } from "@prisma/client";
import type { Request, Response } from "express";
import fs from "fs";
import path from "path";

import { generateHexadecimalCode } from "../utils/codes";
import { AudioService } from "../services/audio.service";
import { getShufflerConfig } from "../utils/shuffler";

export const uploadSong = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const file = req.file;
  const title = req.body.title.trim() || "";
  const userId = req.userId as number;

  if (!file) {
    return res.status(400).json({ error: "No se ha subido ningún archivo" });
  }

  if (!title) {
    AudioService.deleteFile(file.path);
    return res.status(400).json({ error: "El título es obligatorio" });
  }

  const rawOpusPath = path.join(
    "uploads",
    "temp",
    `raw-${Date.now()}-${Math.round(Math.random() * 10)}.opus`,
  );

  const cleanOpusPath = path.join(
    "uploads",
    "temp",
    `clean-${Date.now()}-${Math.round(Math.random() * 10)}.opus`,
  );

  try {
    const metadata = await AudioService.getMetadata(file.path);
    const tags = metadata.format.tags || {};

    // Convertir a Opus
    await AudioService.convertToOpus(file.path, rawOpusPath);
    AudioService.deleteFile(file.path);

    // Limpieza de metadata
    await AudioService.stripMetadata(rawOpusPath, cleanOpusPath);
    AudioService.deleteFile(rawOpusPath);

    // Validacion de espacio
    const stats = fs.statSync(cleanOpusPath);
    const finalSize = BigInt(stats.size);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { storage_used: true, storage_limit: true },
    });

    if (!user || user.storage_used + finalSize > user.storage_limit) {
      AudioService.deleteFile(cleanOpusPath);
      return res
        .status(403)
        .json({ error: "Espacio insuficiente o usuario no encontrado" });
    }

    // Mover song a carpeta final (uploads/) con nombre definitivo
    const finalFileName = AudioService.generateFinalName();
    const finalPath = path.join("uploads", finalFileName);
    fs.renameSync(cleanOpusPath, finalPath);

    const result = await prisma.$transaction(async (tx: any) => {
      const song = await tx.song.create({
        data: {
          title: (title || tags.title || "Sin título").substring(0, 50),
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

      await tx.user.update({
        where: { id: userId },
        data: {
          storage_used: {
            increment: finalSize,
          },
        },
      });

      return song;
    });

    return res.status(201).json(result);
  } catch (error) {
    const err = error as Error;

    console.error(`[UPLOAD_ERROR] [User: ${userId}]: ${err.message}`);

    // CLEANUP: Si falla la BD se borra el archivo físico
    [file.path, rawOpusPath, cleanOpusPath].forEach(AudioService.deleteFile);

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
  const { id } = req.params;
  const userId = req.userId;

  try {
    const song = await prisma.song.findUnique({
      where: { id: Number(id) },
    });

    if (!song) return res.status(404).json({ error: "Canción no encontrada" });

    // Verificar que la canción pertenece al usuario que la quiere borrar
    if (song.user_id !== userId) {
      return res
        .status(403)
        .json({ error: "No tienes permiso para borrar esta canción" });
    }

    // Borrar el archivo físico del disco
    const absolutePath = path.join(process.cwd(), song.file_path);
    if (fs.existsSync(absolutePath)) {
      fs.unlinkSync(absolutePath);
    }

    await prisma.$transaction(async (tx: any) => {
      await tx.song.delete({
        where: { id: Number(id) },
      });

      await tx.user.update({
        where: { id: userId },
        data: {
          storage_used: {
            decrement: song.file_size,
          },
        },
      });
    });

    return res.json({ message: "Canción eliminada correctamente" });
  } catch (error) {
    console.error("Error eliminando canción:", error);
    return res.status(500).json({ error: "Error al eliminar la canción" });
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

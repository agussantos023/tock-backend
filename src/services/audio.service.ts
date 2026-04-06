import ffmpeg from "fluent-ffmpeg";
import fs from "fs";
import type { AudioMetadata } from "../interfaces/audio.interface";
import path from "path";

export const AudioService = {
  // Extraer metadatos
  async getMetadata(path: string): Promise<AudioMetadata> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(path, (err, metadata) => {
        if (err)
          return reject(new Error(`Error al leer metadatos: ${err.message}`));
        resolve(metadata as unknown as AudioMetadata);
      });
    });
  },

  // Convertir MP3 a OPUS
  async convertToOpus(input: string, output: string): Promise<void> {
    return new Promise((resolve, reject) => {
      ffmpeg(input)
        .toFormat("opus")
        .outputOptions([
          "-threads 1", // Forzamos un solo hilo
          "-acodec libopus",
        ])
        .on("end", () => resolve())
        .on("error", (err: Error) =>
          reject(new Error(`Error en conversión: ${err.message}`)),
        )
        .save(output);
    });
  },

  // Limpieza total de metadatos
  async stripMetadata(input: string, output: string): Promise<void> {
    return new Promise((resolve, reject) => {
      ffmpeg(input)
        .noVideo()
        .outputOptions([
          "-threads 1",
          "-map 0:a",
          "-map_metadata -1",
          "-map_chapters -1",
          "-sn",
          "-dn",
          "-c:a copy",
        ])
        .on("end", () => resolve())
        .on("error", (err: Error) =>
          reject(new Error(`Error al limpiar: ${err.message}`)),
        )
        .save(output);
    });
  },

  // Utilidades de archivo (Helpers internos del servicio)
  generateFinalName(): string {
    const random = Math.floor(10000 + Math.random() * 90000);
    return `${Date.now()}-${random}.opus`;
  },

  deleteFile(filePath: string | null): void {
    if (!filePath) return;

    try {
      const absolutePath = path.isAbsolute(filePath)
        ? filePath
        : path.join(process.cwd(), filePath);

      if (fs.existsSync(absolutePath)) {
        fs.unlinkSync(absolutePath);
      }
    } catch (e) {
      console.warn(`[FILE_SYSTEM] No se pudo borrar: ${filePath}`, e);
    }
  },
};

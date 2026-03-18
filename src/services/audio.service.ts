import ffmpeg from "fluent-ffmpeg";
import fs from "fs";
import type { AudioMetadata } from "../types/audio";

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

  deleteFile(filePath: string): void {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  },
};

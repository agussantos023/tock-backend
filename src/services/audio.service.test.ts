import { describe, it, expect, vi, beforeEach } from "vitest";
import { AudioService } from "./audio.service";
import ffmpeg from "fluent-ffmpeg";
import fs from "fs";

// Mock de ffmpeg
vi.mock("fluent-ffmpeg", () => {
  const mockFfmpeg = vi.fn(() => ({
    toFormat: vi.fn().mockReturnThis(),
    outputOptions: vi.fn().mockReturnThis(),
    noVideo: vi.fn().mockReturnThis(),
    save: vi.fn().mockImplementation(function (this: any, path: string) {
      if (typeof this.emit === "function") {
        this.emit("end");
      }
      return this;
    }),
    on: vi.fn().mockImplementation(function (
      this: any,
      event: string,
      cb: any,
    ) {
      if (event === "end") this.emit = cb;
      return this;
    }),
  }));

  // @ts-ignore
  mockFfmpeg.ffprobe = vi.fn((path, cb) => {
    cb(null, { format: { duration: 180, tags: { title: "Test" } } });
  });

  return { default: mockFfmpeg };
});

vi.mock("fs", () => ({
  default: {
    existsSync: vi.fn(),
    unlinkSync: vi.fn(),
  },
}));

describe("AudioService", () => {
  beforeEach(() => vi.clearAllMocks());

  it("getMetadata debería devolver la duración y tags", async () => {
    const meta = await AudioService.getMetadata("dummy.mp3");
    expect(meta.format.duration).toBe(180);
    expect(ffmpeg.ffprobe).toHaveBeenCalled();
  });

  it("deleteFile no debería intentar borrar si el archivo no existe", () => {
    (fs.existsSync as any).mockReturnValue(false);
    AudioService.deleteFile("inventado.opus");
    expect(fs.unlinkSync).not.toHaveBeenCalled();
  });

  it("deleteFile debería borrar el archivo si existe", () => {
    (fs.existsSync as any).mockReturnValue(true);
    AudioService.deleteFile("existe.opus");
    expect(fs.unlinkSync).toHaveBeenCalled();
  });
});

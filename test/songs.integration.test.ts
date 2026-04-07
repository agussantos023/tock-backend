import { afterEach, describe, expect, it, vi, beforeEach } from "vitest";
import request from "supertest";
import app from "../src/app";
import { prisma } from "../src/config/db";
import { generateToken } from "../src/utils/jwt";

vi.mock("../src/config/db", () => ({
  prisma: {
    user: { update: vi.fn() },
    song: { findMany: vi.fn(), deleteMany: vi.fn() },
    $transaction: vi.fn((cb) => cb(prisma)),
    $executeRaw: vi.fn(),
  },
}));

vi.mock("../src/services/audio.service", () => ({
  AudioService: {
    deleteFile: vi.fn(),
  },
}));

describe("Songs Integration Tests", () => {
  const realToken = generateToken(1);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("GET /api/songs", () => {
    it("debería obtener la lista de canciones paginada", async () => {
      (prisma.song.findMany as any).mockResolvedValue([
        { id: 1, title: "Song 1", file_size: BigInt(100) },
        { id: 2, title: "Song 2", file_size: BigInt(200) },
      ]);

      const response = await request(app)
        .get("/api/songs?page=1&limit=2")
        .set("Cookie", [`auth_token=${realToken}`]);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(2);
    });
  });

  describe("DELETE /api/songs", () => {
    it("debería borrar una lista de canciones", async () => {
      (prisma.song.findMany as any).mockResolvedValue([
        { id: 1, file_path: "path1.opus", file_size: BigInt(100) },
      ]);
      (prisma.user.update as any).mockResolvedValue({
        storage_used: BigInt(0),
        storage_limit: BigInt(1000),
      });

      const response = await request(app)
        .delete("/api/songs")
        .set("Cookie", [`auth_token=${realToken}`])
        .send({ ids: [1] });

      expect(response.status).toBe(200);
    });
  });
});

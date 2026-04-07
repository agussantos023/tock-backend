import { describe, it, expect, vi, beforeEach } from "vitest";
import { CleanupService } from "./cleanup.service";
import { prisma } from "../config/db";
import cron from "node-cron";

vi.mock("../config/db", () => ({
  prisma: {
    user: { deleteMany: vi.fn() },
    systemConfig: { update: vi.fn() },
  },
}));

vi.mock("node-cron", () => ({
  default: { schedule: vi.fn() },
}));

describe("CleanupService", () => {
  beforeEach(() => vi.clearAllMocks());

  it("cleanupUnverifiedUsers debería llamar a deleteMany con el filtro de fecha", async () => {
    (prisma.user.deleteMany as any).mockResolvedValue({ count: 5 });

    await CleanupService.cleanupUnverifiedUsers();

    expect(prisma.user.deleteMany).toHaveBeenCalledWith({
      where: {
        is_verified: false,
        created_at: { lt: expect.any(Date) },
      },
    });
  });

  it("initCleanupCron debería registrar el cron job", async () => {
    await CleanupService.initCleanupCron();
    expect(cron.schedule).toHaveBeenCalledWith(
      "0 0 * * *",
      expect.any(Function),
    );
  });
});

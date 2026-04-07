import { describe, it, expect, vi, beforeEach } from "vitest";
import { prisma } from "../config/db";
import { EmailService } from "./email.service";

// Mock de Prisma
vi.mock("../config/db", () => ({
  prisma: {
    user: { update: vi.fn() },
    systemConfig: { update: vi.fn() },
  },
}));

describe("EmailService", () => {
  const sendSpy = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    // Inyectamos el mock directamente en el servicio
    (EmailService as any)._resend = {
      emails: { send: sendSpy },
    };
    // Respuesta por defecto
    sendSpy.mockResolvedValue({ data: { id: "ok" }, error: null });
  });

  it("debería enviar email y actualizar el código OTP del usuario", async () => {
    await EmailService.sendVerificationCode(1, "test@test.com");

    expect(sendSpy).toHaveBeenCalled();
    expect(prisma.user.update).toHaveBeenCalled();
  });

  it("debería bloquear registros si se alcanza el rate limit de Resend", async () => {
    // Simulamos el error exacto
    sendSpy.mockResolvedValue({
      data: null,
      error: { name: "rate_limit_exceeded" },
    });

    await expect(
      EmailService.sendVerificationCode(1, "test@test.com"),
    ).rejects.toThrow("DAILY_LIMIT_REACHED");

    expect(prisma.systemConfig.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { is_register_blocked: true },
    });
  });
});

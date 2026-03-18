import { prisma } from "../config/db";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { checkLoginStatus, checkRegisterStatus } from "./config.middleware";

vi.mock("../config/db", () => ({
  prisma: {
    systemConfig: {
      findUnique: vi.fn(),
    },
  },
}));

describe("middleware checkRegisterStatus", () => {
  let mockReq: any;
  let mockRes: any;
  let nextFunction: any;

  beforeEach(() => {
    vi.restoreAllMocks();

    mockReq = {};
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    nextFunction = vi.fn();
  });

  it("debería devolver 503 si el registro está bloqueado", async () => {
    // Forzamos a que prisma devuelva el registro bloqueado
    (prisma.systemConfig.findUnique as any).mockResolvedValue({
      is_register_blocked: true,
    });

    await checkRegisterStatus(mockReq, mockRes, nextFunction);

    expect(mockRes.status).toHaveBeenCalledWith(503);
    expect(mockRes.json).toHaveBeenCalledWith({
      message: "El registro está temporalmente deshabilitado por hoy.",
    });
    expect(nextFunction).not.toHaveBeenCalled();
  });

  it("debería llamar a next() si el registro no esta bloqueado", async () => {
    (prisma.systemConfig.findUnique as any).mockResolvedValue({
      is_register_blocked: false,
    });

    await checkRegisterStatus(mockReq, mockRes, nextFunction);

    expect(nextFunction).toHaveBeenCalled();
    expect(mockRes.status).not.toHaveBeenCalledWith();
    expect(mockRes.json).not.toHaveBeenCalledWith();
  });
});

describe("middleware checkLoginStatus", () => {
  let mockReq: any;
  let mockRes: any;
  let nextFunction: any;

  beforeEach(() => {
    vi.restoreAllMocks();

    mockReq = {};
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    nextFunction = vi.fn();
  });

  it("debería devolver 503 si el inicio de sesíon está bloqueado", async () => {
    (prisma.systemConfig.findUnique as any).mockResolvedValue({
      is_login_blocked: true,
    });

    await checkLoginStatus(mockReq, mockRes, nextFunction);

    expect(mockRes.status).toHaveBeenCalledWith(503);
    expect(mockRes.json).toHaveBeenCalledWith({
      message: "El inicio de sesión está deshabilitado.",
    });
    expect(nextFunction).not.toHaveBeenCalled();
  });

  it("debería  llamar a next() si el inicio de sesíon no está bloqueado", async () => {
    (prisma.systemConfig.findUnique as any).mockResolvedValue({
      is_login_blocked: false,
    });

    await checkLoginStatus(mockReq, mockRes, nextFunction);

    expect(nextFunction).toHaveBeenCalled();
    expect(mockRes.status).not.toHaveBeenCalledWith();
    expect(mockRes.json).not.toHaveBeenCalledWith();
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";
import { authenticateToken } from "./auth.middleware";
import jwt from "jsonwebtoken";

describe("middleware authenticateToken", () => {
  let mockReq: any;
  let mockRes: any;
  let nextFunction: any;

  beforeEach(() => {
    vi.restoreAllMocks(); // Limpia los espías entre tests

    mockReq = { headers: {} };
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    nextFunction = vi.fn();
    process.env.JWT_SECRET = "test_secret";
  });

  it("debería devolver 401 si no hay cabecera de autorización", () => {
    authenticateToken(mockReq, mockRes, nextFunction);
    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(nextFunction).not.toHaveBeenCalled();
  });

  it("debería devolver 403 si el token es inválido", () => {
    mockReq.headers["authorization"] = "Bearer token_falso";

    // spyOn intercepta 'verify' sin romper el resto de la librería jwt
    vi.spyOn(jwt, "verify").mockImplementation(() => {
      throw new Error("Invalid token");
    });

    authenticateToken(mockReq, mockRes, nextFunction);

    expect(mockRes.status).toHaveBeenCalledWith(403);
    expect(mockRes.json).toHaveBeenCalledWith({
      error: "Token inválido o expirado",
    });
  });

  it("debería setear req.userId y llamar a next() si el token es válido", () => {
    mockReq.headers["authorization"] = "Bearer token_valido";
    const payload = { id: 123 };

    vi.spyOn(jwt, "verify").mockReturnValue(payload as any);

    authenticateToken(mockReq, mockRes, nextFunction);

    expect(mockReq.userId).toBe(123);
    expect(nextFunction).toHaveBeenCalled();
  });
});

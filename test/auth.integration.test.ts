import { afterEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import app from "../src/app";
import { prisma } from "../src/config/db";

vi.mock("../src/config/db", () => ({
  prisma: {
    systemConfig: {
      findUnique: vi.fn().mockResolvedValue({ is_login_blocked: false }),
    },
    user: {
      findUnique: vi.fn(),
    },
  },
}));

describe("POST /auth/login", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("debería fallar con 400 si el email o password faltan", async () => {
    const response = await request(app).post("/api/auth/login").send({});

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Error de validación");
  });

  it("debería devolver 400 si el usuario no existe", async () => {
    (prisma.user.findUnique as any).mockResolvedValue(null);

    const response = await request(app).post("/api/auth/login").send({
      email: "noexist@test.com",
      password: "password123", // 8+ caracteres
    });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Usuario no encontrado");
  });

  it("debería iniciar sesión exitosamente con credenciales válidas", async () => {
    const password = "password_valida_123"; // 8+ caracteres
    const storageLimit = BigInt(1000);
    const passwordHash = await Bun.password.hash(password);

    (prisma.user.findUnique as any).mockResolvedValue({
      id: 1,
      email: "test@test.com",
      password: passwordHash,
      storage_limit: storageLimit,
      storage_used: BigInt(0),
      is_verified: true,
    });

    const response = await request(app).post("/api/auth/login").send({
      email: "test@test.com",
      password: password,
    });

    expect(response.status).toBe(200);
    expect(response.body.message).toBe("Login exitoso");
    expect(response.body.status).toBe("authenticated");

    // verificamos la cabecera set-cookie
    const cookies = response.get("Set-Cookie")?.join("");
    expect(cookies).toContain("auth_token=");

    expect(response.body.user).toMatchObject({
      email: "test@test.com",
      storage_limit: "1000",
    });
  });

  it("debería devolver 401 si la contraseña es incorrecta", async () => {
    const passwordHash = await Bun.password.hash("password_correcta_123");

    (prisma.user.findUnique as any).mockResolvedValue({
      id: 1,
      email: "test@test.com",
      password: passwordHash,
    });

    const response = await request(app).post("/api/auth/login").send({
      email: "test@test.com",
      password: "password_erronea_123",
    });

    expect(response.status).toBe(401);
    expect(response.body.message).toBe("Credenciales inválidas");
  });
});

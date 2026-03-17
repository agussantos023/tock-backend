import { afterEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import app from "app";
import { prisma } from "config/db";

vi.mock("../src/config/db.ts", () => ({
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

  it("debeía fallar con 400 si el email o password faltan", async () => {
    const response = await request(app).post("/api/auth/login").send({});

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty(
      "error",
      "Email y contraseña son obligatorios",
    );
  });

  it("debería devolver 400 si el usuario no existe", async () => {
    // Le decimos: "Específicamente para este test, devuelve null"
    (prisma.user.findUnique as any).mockResolvedValue(null);

    const response = await request(app).post("/api/auth/login").send({
      email: "noexist@test.com",
      password: "password123",
    });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("Usuario no encontrado");
  });

  it("debería iniciar sesión exitosamente con credenciales válidas", async () => {
    const password = "tock123";
    const storageLimit = BigInt(1000);
    // Generamos un hash real para que Bun.password.verify pueda validarlo
    const passwordHash = await Bun.password.hash(password);

    (prisma.user.findUnique as any).mockResolvedValue({
      id: 1,
      email: "test@test.com",
      password: passwordHash, // Guardamos el hash en el mock
      storage_limit: storageLimit,
      is_verified: true,
    });

    const response = await request(app).post("/api/auth/login").send({
      email: "test@test.com",
      password: password, // Enviamos la contraseña
    });

    // Verificaciones
    expect(response.status).toBe(200);
    expect(response.body.message).toBe("Login exitoso");

    // No sabemos qué token será, pero sabemos que debe existir un string
    expect(response.body.token).toBeDefined();
    expect(typeof response.body.token).toBe("string");

    expect(response.body.isVerified).toBe(true);
    expect(response.body.user).toMatchObject({
      id: 1,
      email: "test@test.com",
      storage_limit: `${storageLimit}`,
    });
  });

  it("debería devolver 401 si la contraseña es incorrecta", async () => {
    const passwordHash = await Bun.password.hash("password_correcta");

    (prisma.user.findUnique as any).mockResolvedValue({
      id: 1,
      email: "test@test.com",
      password: passwordHash,
    });

    const response = await request(app).post("/api/auth/login").send({
      email: "test@test.com",
      password: "password_equivocada", // <-- Esto hará que Bun.password.verify sea false
    });

    expect(response.status).toBe(401);
    expect(response.body.error).toBe("Credenciales inválidas");
  });
});

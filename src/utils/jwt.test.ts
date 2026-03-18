import { describe, expect, it } from "vitest";
import { generateToken } from "./jwt";
import jwt from "jsonwebtoken";

// Mock de la variable de entorno
process.env.JWT_SECRET = "test_secret";

describe("generateToken", () => {
  it("debería generar el string del token", () => {
    const token = generateToken(1);

    expect(typeof token).toBe("string");
    expect(token.length).toBeGreaterThan(0);
  });

  it("debeía mantener el userId", () => {
    const userId = 123;
    const token = generateToken(userId);

    // Decodificamos para ver el interior
    const decoded = jwt.verify(token, "test_secret") as { id: number };

    expect(decoded.id).toBe(userId);
  });

  it("deberia tener una expiracion en 7 dias", () => {
    const token = generateToken(1);
    const decoded = jwt.decode(token) as { exp: number; iat: number };

    const sevenDaysInSeconds = 7 * 24 * 60 * 60;
    expect(decoded.exp - decoded.iat).toBe(sevenDaysInSeconds);
  });
});

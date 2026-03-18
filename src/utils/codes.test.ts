import { describe, it, expect } from "vitest";
import { generateHexadecimalCode } from "./codes";

describe("generateHexadecimalCode", () => {
  it("debería devolver un string con la longitud exacta solicitada", () => {
    const length = 10;
    const result = generateHexadecimalCode(length);
    expect(result).toHaveLength(length);
  });

  it("debería contener solo caracteres hexadecimales (0-9, A-F)", () => {
    const result = generateHexadecimalCode(20);
    expect(result).toMatch(/^[0-9A-F]+$/);
  });

  it("debería generar códigos diferentes en cada llamada (aleatoriedad)", () => {
    const code_1 = generateHexadecimalCode(8);
    const code_2 = generateHexadecimalCode(8);
    expect(code_1).not.toBe(code_2);
  });
});

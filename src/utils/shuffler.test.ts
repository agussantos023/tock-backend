import { getShufflerConfig } from "./shuffler";
import { describe, expect, it, afterEach } from "vitest";
import { setSystemTime } from "bun:test"; // Importación clave para Bun

describe("getShufflerConfig", () => {
  afterEach(() => {
    // Para resetear el tiempo
    setSystemTime();
  });

  it("debería devolver 'order_par' en un día par del año", () => {
    // 2 de Enero de 2026 = Día 2 del año (Par)
    const date = new Date(2026, 0, 2);
    setSystemTime(date);

    const config = getShufflerConfig();

    expect(config.isEven).toBe(true);
    expect(config.currentCol).toBe("order_par");
    expect(config.oppositeCol).toBe("order_impar");
  });

  it("debería devolver 'order_impar' en un día impar del año", () => {
    // 1 de Enero de 2026 = Día 1 del año (Impar)
    const date = new Date(2026, 0, 1);
    setSystemTime(date);

    const config = getShufflerConfig();

    expect(config.isEven).toBe(false);
    expect(config.currentCol).toBe("order_impar");
    expect(config.oppositeCol).toBe("order_par");
  });
});

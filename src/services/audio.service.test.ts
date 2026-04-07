import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { AudioService } from "./audio.service";
import fs from "fs";

describe("AudioService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("deleteFile no debería intentar borrar si el archivo no existe", () => {
    vi.spyOn(fs, "existsSync").mockReturnValue(false);
    vi.spyOn(fs, "unlinkSync").mockImplementation(() => {});

    AudioService.deleteFile("inventado.opus");

    expect(fs.unlinkSync).not.toHaveBeenCalled();
  });
});

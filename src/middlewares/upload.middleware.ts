import fs from "fs";
import multer from "multer";
import path from "path";

const uploadDir = "uploads";
const tempDir = path.join("uploads", "temp");

// Crear carpeta upload si no existe (evita crash al inicio)
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

// Crear carpeta temp si no existe
if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, tempDir);
  },
  filename: (req, file, cb) => {
    // Generar nombre único (Timestamp + Random) para evitar sobrescrituras
    cb(null, `t-${Date.now()}-${Math.round(Math.random() * 100)}`);
  },
});

const fileFilter = (req: any, file: Express.Multer.File, cb: any) => {
  // Validar solo archivos mp3
  if (file.mimetype === "audio/mpeg") {
    cb(null, true);
  } else {
    cb(new Error("Solo se permiten archivos mp3"), false);
  }
};

export const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // Máx: 50MB
  },
});

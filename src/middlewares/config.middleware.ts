import type { Request, Response, NextFunction } from "express";
import { prisma } from "../config/db";

// Bloqueo para Registro
export const checkRegisterStatus = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const config = await prisma.systemConfig.findUnique({ where: { id: 1 } });

  if (config?.is_register_blocked) {
    return res.status(503).json({
      message: "El registro está temporalmente deshabilitado por hoy.",
    });
  }

  next();
};

// Bloqueo para Login
export const checkLoginStatus = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const config = await prisma.systemConfig.findUnique({ where: { id: 1 } });

  if (config?.is_login_blocked) {
    return res
      .status(503)
      .json({ message: "El inicio de sesión está deshabilitado." });
  }

  next();
};

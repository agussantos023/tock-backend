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

export const checkUserLimit = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const userCount = await prisma.user.count();

  if (userCount >= 410) {
    return res.status(403).json({
      message:
        "Límite de usuarios alcanzado. No es posible crear más cuentas por ahora.",
    });
  }

  next();
};

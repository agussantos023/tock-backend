import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

// Se extiende la interfaz de Request para incluir userId
declare global {
  namespace Express {
    interface Request {
      userId?: number;
    }
  }
}

export const authenticateToken = (
  req: Request,
  res: Response,
  next: NextFunction,
): any => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Acceso denegado. Falta el token." });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as {
      id: number;
    };

    req.userId = decoded.id;

    next();
  } catch (error) {
    return res.status(403).json({ error: "Token inválido o expirado" });
  }
};

import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export const authenticateToken = (
  req: Request,
  res: Response,
  next: NextFunction,
): any => {
  const token = req.cookies.auth_token;

  if (!token) {
    return res.status(401).json({ message: "No autorizado: Token ausente" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as {
      id: number;
    };

    req.userId = decoded.id;

    next();
  } catch (error) {
    res.clearCookie("auth_token");
    return res.status(403).json({ message: "Token inválido o expirado" });
  }
};

import type { Request, Response, NextFunction } from "express";
import { z } from "zod";

export const validate =
  (schema: z.ZodSchema) =>
  (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        message: "Error de validación",
        errors: result.error.issues.map((issue) => ({
          field: issue.path[0],
          message: issue.message,
        })),
      });
    }

    req.body = result.data;
    next();
  };

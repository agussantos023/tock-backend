import { z } from "zod";

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, "El email es obligatorio")
    .email("Formato de email inválido"),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
});

export const registerSchema = loginSchema.extend({
  // Aquí se puede añadir campos extra como nombre, apellidos, etc.
});

export const otpSchema = z.object({
  otpCode: z
    .string()
    .length(4, "El código debe tener exactamente 4 caracteres")
    .regex(/^[0-9A-F]+$/, "El código debe ser un valor hexadecimal válido"),
});

// Esto sirve para tipar tus variables en TS basado en el esquema
export type LoginInput = z.infer<typeof loginSchema>;

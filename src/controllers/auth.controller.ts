import type { Request, Response } from "express";
import { prisma } from "../config/db";
import { generateToken } from "../utils/jwt";
import { EmailService } from "../services/email.service";
import jwt from "jsonwebtoken";
import { AudioService } from "services/audio.service";

export const register = async (req: Request, res: Response): Promise<any> => {
  try {
    const { email, password } = req.body;

    const existUser = await prisma.user.findUnique({ where: { email } });

    if (existUser) {
      return res.status(400).json({ message: "El usuario ya existe" });
    }

    const hashedPassword = await Bun.password.hash(password);

    const newUser = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
      },
    });

    await EmailService.sendVerificationCode(newUser.id, newUser.email);

    const token = generateToken(newUser.id);

    setAuthCookie(res, token);

    return res.status(200).json({
      message: "Register exitoso",
      isVerified: newUser.is_verified,
      user: {
        id: newUser.id,
        email: newUser.email,
        storage_limit: newUser.storage_limit.toString(),
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error interno al registrar usuario" });
  }
};

export const login = async (req: Request, res: Response): Promise<any> => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(400).json({ message: "Usuario no encontrado" });
    }

    const isPasswordValid = await Bun.password.verify(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Credenciales inválidas" });
    }

    const token = generateToken(user.id);

    setAuthCookie(res, token);

    return res.status(200).json({
      message: "Login exitoso",
      isVerified: user.is_verified,
      user: {
        id: user.id,
        email: user.email,
        storage_limit: user.storage_limit.toString(),
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error crítico al iniciar sesión" });
  }
};

export const logout = (req: Request, res: Response) => {
  res.clearCookie("auth_token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });

  return res.status(200).json({ message: "Sesión cerrada" });
};

export const verifyOtp = async (req: Request, res: Response): Promise<any> => {
  try {
    const { otpCode } = req.body;
    const userId = req.userId as number;

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.otp_code) {
      return res
        .status(404)
        .json({ message: "Usuario o código no encontrado" });
    }

    // Verificar expiración (15 minutos)
    const fifteenMinutes = 15 * 60 * 1000;
    const timePassed = Date.now() - user.otp_create_at.getTime();

    if (timePassed > fifteenMinutes) {
      // Generamos y enviamos uno nuevo automáticamente
      await EmailService.sendVerificationCode(user.id, user.email);

      return res.status(403).json({
        message: "El código ha expirado. Te hemos enviado uno nuevo.",
      });
    }

    // Validar el código
    if (user.otp_code !== otpCode) {
      return res.status(400).json({ message: "Código no válido" });
    }

    // Verificación exitosa
    await prisma.user.update({
      where: { id: userId },
      data: {
        is_verified: true,
        otp_code: null,
      },
    });

    return res.status(200).json({ message: "Cuenta verificada con éxito" });
  } catch (error) {
    res
      .status(500)
      .json({ error: "Error interno en la verificación de cuenta" });
  }
};

export const resendOtp = async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.userId as number;

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    if (user.is_verified) {
      return res
        .status(400)
        .json({ message: "Esta cuenta ya está verificada" });
    }

    await EmailService.sendVerificationCode(user.id, user.email);

    return res.status(200).json({ message: "Nuevo código enviado al correo" });
  } catch (error) {
    return res.status(500).json({ error: "Error al reenviar el código" });
  }
};

export const checkAuth = async (req: Request, res: Response): Promise<any> => {
  try {
    const token = req.cookies.auth_token;

    if (!token) return res.status(200).json({ status: "unauthenticated" });

    // Decodificar token
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as {
      id: number;
    };

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        is_verified: true,
        email: true,
        storage_used: true,
        storage_limit: true,
      },
    });

    if (!user) {
      return res.status(200).json({ status: "unauthenticated" });
    }

    return res.status(200).json({
      status: user.is_verified ? "authenticated" : "unverified",
      user: {
        email: user.email,
        storage_used: user.storage_used.toString(), // Convertimos BigInt a String
        storage_limit: user.storage_limit.toString(),
      },
    });
  } catch (error) {
    console.error(error);

    return res.status(200).json({ status: "unauthenticated" });
  }
};

export const deleteAccount = async (
  req: Request,
  res: Response,
): Promise<any> => {
  try {
    const userId = req.userId as number;

    const songs = await prisma.song.findMany({
      where: { user_id: userId },
      select: { file_path: true },
    });

    for (const song of songs) {
      AudioService.deleteFile(song.file_path);
    }

    await prisma.user.delete({
      where: { id: userId },
    });

    res.clearCookie("auth_token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });

    return res
      .status(200)
      .json({ message: "Cuenta y datos eliminados correctamente" });
  } catch (error) {
    console.error(error);

    return res.status(500).json({ error: "Error al eliminar la cuenta" });
  }
};

const setAuthCookie = (res: Response, token: string) => {
  res.cookie("auth_token", token, {
    httpOnly: true, // Inaccesible para JS
    secure: process.env.NODE_ENV === "production", // HTTPS en producción
    sameSite: "lax", // Protección contra CSRF
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/", // Disponible en toda la app
  });
};

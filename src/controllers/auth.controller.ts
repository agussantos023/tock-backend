import type { Request, Response } from "express";
import { prisma } from "../config/db";
import { generateToken } from "../utils/jwt";
import { EmailService } from "../services/email.service";
import jwt from "jsonwebtoken";

export const register = async (req: Request, res: Response): Promise<any> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ error: "Email y contraseña son obligatorios" });
    }

    const existUser = await prisma.user.findUnique({ where: { email } });

    if (existUser) {
      return res.status(400).json({ error: "El usuario ya existe" });
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

    return res.status(201).json({
      message: "Usuario creado con éxito",
      token,
      user: {
        id: newUser.id,
        email: newUser.email,
        storage_limit: newUser.storage_limit.toString(),
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al registrar usuario" });
  }
};

export const login = async (req: Request, res: Response): Promise<any> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ error: "Email y contraseña son obligatorios" });
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return res.status(400).json({ error: "Usuario no encontrado" });
    }

    const isPasswordValid = await Bun.password.verify(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ error: "Credenciales inválidas" });
    }

    const token = generateToken(user.id);

    return res.status(200).json({
      message: "Login exitoso",
      token,
      isVerified: user.is_verified,
      user: {
        id: user.id,
        email: user.email,
        storage_limit: user.storage_limit.toString(),
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al iniciar sesion" });
  }
};

export const verifyOtp = async (req: Request, res: Response): Promise<any> => {
  try {
    const { otpCode } = req.body;
    const userId = req.userId as number;

    // Buscar al usuario
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.otp_code) {
      return res.status(404).json({ error: "Usuario o código no encontrado" });
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
    if (user.otp_code !== otpCode.toUpperCase()) {
      return res.status(400).json({ error: "Código no válido" });
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
    return res.status(500).json({ message: "Error interno del servidor" });
  }
};

export const resendOtp = async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.userId as number;

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    if (user.is_verified) {
      return res.status(400).json({ error: "Esta cuenta ya está verificada" });
    }

    await EmailService.sendVerificationCode(user.id, user.email);

    return res.status(200).json({ message: "Nuevo código enviado al correo" });
  } catch (error) {
    return res.status(500).json({ error: "Error al reenviar el código" });
  }
};

export const checkAuth = async (req: Request, res: Response): Promise<any> => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) return res.status(200).json({ status: "unauthenticated" });

    // Decodificar token
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as {
      id: number;
    };

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { is_verified: true },
    });

    if (!user) {
      return res.status(200).json({ status: "unauthenticated" });
    }

    // Validar si está verificado
    if (!user.is_verified) {
      return res.status(200).json({
        status: "unverified",
      });
    }

    return res.status(200).json({
      status: "authenticated",
    });
  } catch (error) {
    console.error(error);

    return res.status(200).json({ status: "unauthenticated" });
  }
};

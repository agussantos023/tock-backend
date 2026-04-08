import { validate } from "middlewares/validate.middleware";
import { authenticateToken } from "../middlewares/auth.middleware";
import {
  checkLoginStatus,
  checkRegisterStatus,
  checkUserLimit,
} from "../middlewares/config.middleware";
import {
  checkAuth,
  deleteAccount,
  getRegistrationStatus,
  login,
  logout,
  register,
  resendOtp,
  verifyOtp,
} from "./../controllers/auth.controller";
import { Router } from "express";
import { loginSchema, otpSchema, registerSchema } from "schemas/auth.schema";

const authRoutes = Router();

authRoutes.get("/registration-status", getRegistrationStatus);

authRoutes.post(
  "/register",
  checkRegisterStatus,
  checkUserLimit,
  validate(registerSchema),
  register,
);
authRoutes.post("/login", checkLoginStatus, validate(loginSchema), login);

authRoutes.post(
  "/verify-otp",
  authenticateToken,
  validate(otpSchema),
  verifyOtp,
);

authRoutes.post("/resend-otp", authenticateToken, resendOtp);

authRoutes.post("/logout", authenticateToken, logout);

authRoutes.delete("/delete-account", authenticateToken, deleteAccount);

authRoutes.post("/validate-token", checkAuth);

export default authRoutes;

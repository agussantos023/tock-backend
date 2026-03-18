import { authenticateToken } from "../middlewares/auth.middleware";
import {
  checkLoginStatus,
  checkRegisterStatus,
} from "../middlewares/config.middleware";
import {
  checkAuth,
  login,
  register,
  resendOtp,
  verifyOtp,
} from "./../controllers/auth.controller";
import { Router } from "express";

const authRoutes = Router();

authRoutes.post("/login", checkLoginStatus, login);
authRoutes.post("/register", checkRegisterStatus, register);

authRoutes.post("/verify-otp", authenticateToken, verifyOtp);
authRoutes.post("/resend-otp", authenticateToken, resendOtp);

authRoutes.post("/validate-token", checkAuth);

export default authRoutes;

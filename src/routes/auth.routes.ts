import { authenticateToken } from "../middlewares/auth.middleware";
import {
  checkLoginStatus,
  checkRegisterStatus,
} from "../middlewares/config.middleware";
import {
  checkAuth,
  deleteAccount,
  login,
  logout,
  register,
  resendOtp,
  verifyOtp,
} from "./../controllers/auth.controller";
import { Router } from "express";

const authRoutes = Router();

authRoutes.post("/register", checkRegisterStatus, register);
authRoutes.post("/login", checkLoginStatus, login);

authRoutes.post("/verify-otp", authenticateToken, verifyOtp);
authRoutes.post("/resend-otp", authenticateToken, resendOtp);

authRoutes.post("/logout", authenticateToken, logout);

authRoutes.delete("/delete-account", authenticateToken, deleteAccount);

authRoutes.post("/validate-token", checkAuth);

export default authRoutes;

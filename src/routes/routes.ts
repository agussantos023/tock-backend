import { Router } from "express";
import authRoutes from "./auth.routes";
import songRouter from "./song.routes";

const router = Router();

router.get("/", (req, res) => {
  res.send("Hola desde el back 🐳");
});

router.use("/auth", authRoutes);
router.use("/songs", songRouter);

export default router;

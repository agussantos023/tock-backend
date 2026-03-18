import express from "express";
import router from "./routes/routes";
import cors from "cors";
import { CleanupService } from "./services/cleanup.service";
import { setupSwagger } from "./config/swagger";

(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

const app = express();

app.use(
  cors({
    origin: ["https://tock-music.agussantos.dev", "http://localhost:4200"],
    credentials: true,
  }),
);

app.use(express.json());

setupSwagger(app);

app.use("/api", router);

if (process.env.NODE_ENV !== "test") {
  CleanupService.initCleanupCron();
}

export default app;

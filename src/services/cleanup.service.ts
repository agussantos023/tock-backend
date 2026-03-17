import cron from "node-cron";
import { prisma } from "../config/db";

export const CleanupService = {
  async initCleanupCron() {
    cron.schedule("0 0 * * *", async () => {
      console.log("--- Iniciando tareas de mantenimiento de media noche ---");
      await this.cleanupUnverifiedUsers();
      await this.resetSystemConfig();
    });
  },

  async cleanupUnverifiedUsers() {
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    const deleted = await prisma.user.deleteMany({
      where: {
        is_verified: false,
        created_at: { lt: oneDayAgo },
      },
    });
    console.log(`🧹 Usuarios limpiados: ${deleted.count}`);
  },

  async resetSystemConfig() {
    await prisma.systemConfig.update({
      where: { id: 1 },
      data: { is_register_blocked: false },
    });
    console.log("🔓 Registro reactivado para el nuevo día");
  },
};

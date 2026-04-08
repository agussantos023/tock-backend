import { Resend } from "resend";
import { generateHexadecimalCode } from "../utils/codes";
import { prisma } from "../config/db";

export const EmailService = {
  _resend: new Resend(process.env.RESEND_API_KEY),
  async sendVerificationCode(userId: number, email: string) {
    const otpCode = generateHexadecimalCode(4);

    try {
      const { data, error } = await this._resend.emails.send({
        from: "Tock Music <onboardin@agussantos.dev>",
        to: email,
        subject: `Tu código de verificación es ${otpCode}`,
        html: `tu código es: ${otpCode}`,
      });

      // Resend devuelve un error
      if (error) {
        console.error("Error de Resend:", error);
        throw new Error(error?.name);
      }

      await prisma.user.update({
        where: { id: userId },
        data: {
          otp_code: otpCode,
          otp_create_at: new Date(),
        },
      });
    } catch (err: any) {
      // Centralizamos el log y relanzamos un error amigable
      console.error("Fallo en EmailService:", err.message);

      if (err.message === "rate_limit_exceeded" || err.status === 429) {
        // Bloqueamos registros globalmente
        await prisma.systemConfig.update({
          where: { id: 1 },
          data: { is_register_blocked: true },
        });

        throw new Error("DAILY_LIMIT_REACHED");
      }

      throw new Error("EMAIL_SEND_FAILED");
    }
  },
};

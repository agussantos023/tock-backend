// Se extiende la interfaz de Request para incluir userId
export declare global {
  namespace Express {
    interface Request {
      userId?: number;
    }
  }
}

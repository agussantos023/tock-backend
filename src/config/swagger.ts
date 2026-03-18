import swaggerUi from "swagger-ui-express";
import type { Express } from "express";
import swaggerDocument from "./swagger.json";

export const setupSwagger = (app: Express) => {
  if (process.env.NODE_ENV === "production") return;

  const port = process.env.PORT || 3000;

  app.use(
    "/api-docs",
    swaggerUi.serve,
    swaggerUi.setup(swaggerDocument, {
      customSiteTitle: "Tock API Docs",
    }),
  );

  console.log(`Docs disponibles en http://localhost:${port}/api-docs 🐳`);
};

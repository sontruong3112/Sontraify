import app from "./app.js";
import { connectDatabase } from "./config/db.js";
import { env, validateEnv } from "./config/env.js";

const bootstrap = async () => {
  validateEnv();
  await connectDatabase();

  app.listen(env.port, () => {
    console.log(`Server listening on port ${env.port}`);
  });
};

bootstrap().catch((error) => {
  console.error("Failed to start server", error);
  console.error("Hint: create backend/.env from backend/.env.example before running npm run dev");
  process.exit(1);
});
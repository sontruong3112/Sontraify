import app from "./app.js";
import { createServer } from "node:http";
import { connectDatabase } from "./config/db.js";
import { env, validateEnv } from "./config/env.js";
import { initRealtimeSocket } from "./services/realtimeSocket.js";

const bootstrap = async () => {
  validateEnv();
  await connectDatabase();

  const httpServer = createServer(app);
  initRealtimeSocket(httpServer);

  httpServer.listen(env.port, () => {
    console.log(`Server listening on port ${env.port}`);
  });
};

bootstrap().catch((error) => {
  console.error("Failed to start server", error);
  console.error("Hint: create backend/.env from backend/.env.example before running npm run dev");
  process.exit(1);
});
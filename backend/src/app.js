import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./config/env.js";
import { errorHandler, notFoundHandler } from "./middlewares/errorMiddleware.js";
import authRoutes from "./routes/authRoutes.js";
import playlistRoutes from "./routes/playlistRoutes.js";
import songRoutes from "./routes/songRoutes.js";
import uploadRoutes from "./routes/uploadRoutes.js";

const app = express();

const normalizeOrigin = (value = "") => String(value).trim().replace(/\/$/, "");
const allowedClientOrigins = String(env.clientOrigin || "")
  .split(",")
  .map((origin) => normalizeOrigin(origin))
  .filter(Boolean);

const isAllowedDevOrigin = (origin) => {
  if (!origin) {
    return true;
  }

  const normalizedOrigin = normalizeOrigin(origin);

  if (allowedClientOrigins.includes(normalizedOrigin)) {
    return true;
  }

  return (
    normalizedOrigin.startsWith("http://localhost:") ||
    normalizedOrigin.startsWith("http://127.0.0.1:")
  );
};

app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      if (isAllowedDevOrigin(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);
app.use(morgan("dev"));
app.use(express.json());
app.use(cookieParser());

app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", service: "music-backend" });
});

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/songs", songRoutes);
app.use("/api/v1/playlists", playlistRoutes);
app.use("/api/v1/uploads", uploadRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;

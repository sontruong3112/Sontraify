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

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: env.clientOrigin,
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

app.use(notFoundHandler);
app.use(errorHandler);

export default app;

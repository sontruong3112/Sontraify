import dotenv from "dotenv";

dotenv.config();

export const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT) || 3000,
  mongodbUri: process.env.MONGODB_URI || "",
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET || "",
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || "",
  jwtAccessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || "15m",
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
  clientOrigin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
  cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME || "",
  cloudinaryApiKey: process.env.CLOUDINARY_API_KEY || "",
  cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET || "",
  cloudinaryFolder: process.env.CLOUDINARY_FOLDER || "music-app",
  googleClientId: process.env.GOOGLE_CLIENT_ID || "",
  clerkSecretKey: process.env.CLERK_SECRET_KEY || "",
};

export const validateEnv = () => {
  const required = [
    ["MONGODB_URI", env.mongodbUri],
    ["JWT_ACCESS_SECRET", env.jwtAccessSecret],
    ["JWT_REFRESH_SECRET", env.jwtRefreshSecret],
  ];

  const missing = required.filter(([, value]) => !value).map(([name]) => name);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }
};

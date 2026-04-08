import express from "express";
import { getUploadSignature } from "../controllers/uploadController.js";
import { requireAuth, requireRole } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/signature", requireAuth, requireRole("admin"), getUploadSignature);

export default router;

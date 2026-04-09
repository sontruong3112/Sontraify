import express from "express";
import { getUploadSignature } from "../controllers/uploadController.js";
import { requireAuth } from "../middlewares/authMiddleware.js";
import { validateRequest } from "../middlewares/validateRequest.js";
import { uploadSignatureValidator } from "../validators/uploadValidators.js";

const router = express.Router();

router.post(
	"/signature",
	requireAuth,
	uploadSignatureValidator,
	validateRequest,
	getUploadSignature
);

export default router;

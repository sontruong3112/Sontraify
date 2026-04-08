import express from "express";
import {
	getMe,
	loginAdmin,
	login,
	logout,
	refreshAccessToken,
	register,
} from "../controllers/authController.js";
import { requireAuth } from "../middlewares/authMiddleware.js";
import { validateRequest } from "../middlewares/validateRequest.js";
import {
	loginValidator,
	logoutValidator,
	registerValidator,
} from "../validators/authValidators.js";

const router = express.Router();

router.post("/register", registerValidator, validateRequest, register);
router.post("/login", loginValidator, validateRequest, login);
router.post("/admin/login", loginValidator, validateRequest, loginAdmin);
router.post("/refresh-token", refreshAccessToken);
router.post("/logout", logoutValidator, validateRequest, logout);
router.get("/me", requireAuth, getMe);

export default router;

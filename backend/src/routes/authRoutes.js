import express from "express";
import {
	applyPreferenceAction,
	googleLogin,
	getMe,
	getPreferences,
	loginAdmin,
	login,
	logout,
	refreshAccessToken,
	register,
	updateMe,
	updatePreferences,
} from "../controllers/authController.js";
import { requireAuth } from "../middlewares/authMiddleware.js";
import { validateRequest } from "../middlewares/validateRequest.js";
import {
	loginValidator,
	logoutValidator,
	preferenceActionValidator,
	registerValidator,
	googleAuthValidator,
	updateMeValidator,
} from "../validators/authValidators.js";

const router = express.Router();

router.post("/register", registerValidator, validateRequest, register);
router.post("/login", loginValidator, validateRequest, login);
router.post("/google", googleAuthValidator, validateRequest, googleLogin);
router.post("/admin/login", loginValidator, validateRequest, loginAdmin);
router.post("/refresh-token", refreshAccessToken);
router.post("/logout", logoutValidator, validateRequest, logout);
router.get("/me", requireAuth, getMe);
router.patch("/me", requireAuth, updateMeValidator, validateRequest, updateMe);
router.get("/preferences", requireAuth, getPreferences);
router.put("/preferences", requireAuth, updatePreferences);
router.post(
	"/preferences/actions",
	requireAuth,
	preferenceActionValidator,
	validateRequest,
	applyPreferenceAction
);

export default router;

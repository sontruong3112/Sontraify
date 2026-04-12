import express from "express";
import {
	applyPreferenceAction,
	clerkLogin,
	googleLogin,
	getMe,
	getPreferences,
	listUsersForAdmin,
	loginAdmin,
	login,
	logout,
	refreshAccessToken,
	register,
	deleteUserByAdmin,
	listMyNotifications,
	updateUserByAdmin,
	markAllNotificationsRead,
	markNotificationRead,
	resetUserPasswordByAdmin,
	sendNotificationByAdmin,
	updateMe,
	updatePreferences,
} from "../controllers/authController.js";
import { requireAuth, requireRole } from "../middlewares/authMiddleware.js";
import { validateRequest } from "../middlewares/validateRequest.js";
import {
	loginValidator,
	logoutValidator,
	preferenceActionValidator,
	registerValidator,
	googleAuthValidator,
	clerkAuthValidator,
	updateMeValidator,
} from "../validators/authValidators.js";

const router = express.Router();

router.post("/register", registerValidator, validateRequest, register);
router.post("/login", loginValidator, validateRequest, login);
router.post("/google", googleAuthValidator, validateRequest, googleLogin);
router.post("/clerk", clerkAuthValidator, validateRequest, clerkLogin);
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
router.get("/admin/users", requireAuth, requireRole("admin"), listUsersForAdmin);
router.patch("/admin/users/:userId", requireAuth, requireRole("admin"), updateUserByAdmin);
router.delete("/admin/users/:userId", requireAuth, requireRole("admin"), deleteUserByAdmin);
router.post(
	"/admin/users/:userId/reset-password",
	requireAuth,
	requireRole("admin"),
	resetUserPasswordByAdmin
);
router.post(
	"/admin/notifications",
	requireAuth,
	requireRole("admin"),
	sendNotificationByAdmin
);
router.get("/notifications", requireAuth, listMyNotifications);
router.post("/notifications/read-all", requireAuth, markAllNotificationsRead);
router.post("/notifications/:notificationId/read", requireAuth, markNotificationRead);

export default router;

import express from "express";
import {
  getConversationMessages,
  getFriendRequests,
  getFriends,
  respondToFriendRequest,
  searchUsers,
  sendFriendRequest,
  sendMessage,
} from "../controllers/socialController.js";
import { requireAuth } from "../middlewares/authMiddleware.js";
import { validateRequest } from "../middlewares/validateRequest.js";
import {
  friendActionValidator,
  friendRequestValidator,
  listMessagesValidator,
  searchUsersValidator,
  sendMessageValidator,
} from "../validators/socialValidators.js";

const router = express.Router();

router.use(requireAuth);

router.get("/users", searchUsersValidator, validateRequest, searchUsers);
router.get("/friends", getFriends);
router.get("/friends/requests", getFriendRequests);
router.post("/friends/requests", friendRequestValidator, validateRequest, sendFriendRequest);
router.post("/friends/requests/:userId/respond", friendActionValidator, validateRequest, respondToFriendRequest);
router.get("/conversations/:friendId/messages", listMessagesValidator, validateRequest, getConversationMessages);
router.post("/conversations/:friendId/messages", sendMessageValidator, validateRequest, sendMessage);

export default router;

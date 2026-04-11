import mongoose from "mongoose";
import { Message } from "../models/Message.js";
import { User } from "../models/User.js";
import {
  emitConversationSeen,
  emitRealtimeMessage,
  getUserActivity,
  isUserOnline,
} from "../services/realtimeSocket.js";
import { fail, ok } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const toIdSet = (value) => {
  if (!Array.isArray(value)) {
    return new Set();
  }

  return new Set(value.map((item) => item.toString()));
};

const toPublicUser = (user) => ({
  id: user._id.toString(),
  name: user.name,
  email: user.email,
  avatarUrl: user.avatarUrl || "",
});

const getAuthUser = async (req) => {
  return User.findById(req.user?.userId);
};

const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(String(value || ""));

const ensureFriend = (user, friendId) => {
  return toIdSet(user.friendIds).has(String(friendId));
};

const syncFriendState = async (currentUser, targetUser, action) => {
  const currentId = currentUser._id.toString();
  const targetId = targetUser._id.toString();

  const currentIncoming = toIdSet(currentUser.pendingIncomingFriendRequestIds);
  const currentOutgoing = toIdSet(currentUser.pendingOutgoingFriendRequestIds);
  const currentFriends = toIdSet(currentUser.friendIds);

  const targetIncoming = toIdSet(targetUser.pendingIncomingFriendRequestIds);
  const targetOutgoing = toIdSet(targetUser.pendingOutgoingFriendRequestIds);
  const targetFriends = toIdSet(targetUser.friendIds);

  currentIncoming.delete(targetId);
  currentOutgoing.delete(targetId);
  targetIncoming.delete(currentId);
  targetOutgoing.delete(currentId);

  if (action === "accept") {
    currentFriends.add(targetId);
    targetFriends.add(currentId);
  }

  currentUser.pendingIncomingFriendRequestIds = Array.from(currentIncoming);
  currentUser.pendingOutgoingFriendRequestIds = Array.from(currentOutgoing);
  currentUser.friendIds = Array.from(currentFriends);

  targetUser.pendingIncomingFriendRequestIds = Array.from(targetIncoming);
  targetUser.pendingOutgoingFriendRequestIds = Array.from(targetOutgoing);
  targetUser.friendIds = Array.from(targetFriends);

  await Promise.all([currentUser.save(), targetUser.save()]);
};

export const searchUsers = asyncHandler(async (req, res) => {
  const currentUser = await getAuthUser(req);

  if (!currentUser) {
    return fail(res, { statusCode: 401, message: "Unauthorized" });
  }

  const keyword = String(req.query.q || "").trim();
  const query = {
    _id: { $ne: currentUser._id },
  };

  if (keyword) {
    query.$or = [
      { name: { $regex: keyword, $options: "i" } },
      { email: { $regex: keyword, $options: "i" } },
    ];
  }

  const users = await User.find(query)
    .sort({ createdAt: -1 })
    .limit(20)
    .select("name email avatarUrl");

  const friends = toIdSet(currentUser.friendIds);
  const incoming = toIdSet(currentUser.pendingIncomingFriendRequestIds);
  const outgoing = toIdSet(currentUser.pendingOutgoingFriendRequestIds);

  const items = users.map((user) => {
    const userId = user._id.toString();
    let relationship = "none";

    if (friends.has(userId)) {
      relationship = "friends";
    } else if (incoming.has(userId)) {
      relationship = "incoming";
    } else if (outgoing.has(userId)) {
      relationship = "outgoing";
    }

    return {
      ...toPublicUser(user),
      relationship,
    };
  });

  return ok(res, {
    data: { users: items },
    extra: { users: items },
  });
});

export const sendFriendRequest = asyncHandler(async (req, res) => {
  const currentUser = await getAuthUser(req);

  if (!currentUser) {
    return fail(res, { statusCode: 401, message: "Unauthorized" });
  }

  const targetId = String(req.body.userId || "").trim();

  if (!isValidObjectId(targetId)) {
    return fail(res, { statusCode: 400, message: "Invalid userId" });
  }

  if (targetId === currentUser._id.toString()) {
    return fail(res, { statusCode: 400, message: "You cannot add yourself" });
  }

  const targetUser = await User.findById(targetId);

  if (!targetUser) {
    return fail(res, { statusCode: 404, message: "User not found" });
  }

  const currentFriends = toIdSet(currentUser.friendIds);
  const currentIncoming = toIdSet(currentUser.pendingIncomingFriendRequestIds);
  const currentOutgoing = toIdSet(currentUser.pendingOutgoingFriendRequestIds);

  if (currentFriends.has(targetId)) {
    return fail(res, { statusCode: 409, message: "You are already friends" });
  }

  if (currentOutgoing.has(targetId)) {
    return fail(res, { statusCode: 409, message: "Friend request already sent" });
  }

  if (currentIncoming.has(targetId)) {
    await syncFriendState(currentUser, targetUser, "accept");

    return ok(res, {
      message: "Friend request accepted",
      data: { accepted: true },
      extra: { accepted: true },
    });
  }

  const targetIncoming = toIdSet(targetUser.pendingIncomingFriendRequestIds);
  const targetOutgoing = toIdSet(targetUser.pendingOutgoingFriendRequestIds);

  currentOutgoing.add(targetId);
  targetIncoming.add(currentUser._id.toString());

  currentUser.pendingOutgoingFriendRequestIds = Array.from(currentOutgoing);
  targetUser.pendingIncomingFriendRequestIds = Array.from(targetIncoming);

  // Keep both sides in sync to avoid duplicate pending state.
  targetOutgoing.delete(currentUser._id.toString());
  targetUser.pendingOutgoingFriendRequestIds = Array.from(targetOutgoing);

  await Promise.all([currentUser.save(), targetUser.save()]);

  return ok(res, {
    message: "Friend request sent",
    data: { sent: true },
    extra: { sent: true },
  });
});

export const respondToFriendRequest = asyncHandler(async (req, res) => {
  const currentUser = await getAuthUser(req);

  if (!currentUser) {
    return fail(res, { statusCode: 401, message: "Unauthorized" });
  }

  const userId = String(req.params.userId || "").trim();
  const action = String(req.body.action || "").trim();

  if (!isValidObjectId(userId)) {
    return fail(res, { statusCode: 400, message: "Invalid userId" });
  }

  const targetUser = await User.findById(userId);

  if (!targetUser) {
    return fail(res, { statusCode: 404, message: "User not found" });
  }

  const incoming = toIdSet(currentUser.pendingIncomingFriendRequestIds);

  if (!incoming.has(userId)) {
    return fail(res, { statusCode: 404, message: "Friend request not found" });
  }

  await syncFriendState(currentUser, targetUser, action);

  return ok(res, {
    message: action === "accept" ? "Friend request accepted" : "Friend request declined",
    data: { action },
    extra: { action },
  });
});

export const getFriends = asyncHandler(async (req, res) => {
  const currentUser = await getAuthUser(req);

  if (!currentUser) {
    return fail(res, { statusCode: 401, message: "Unauthorized" });
  }

  const user = await User.findById(currentUser._id)
    .populate({ path: "friendIds", select: "name email avatarUrl" })
    .select("friendIds");

  const friends = (user?.friendIds || [])
    .map((friend) => ({
      ...toPublicUser(friend),
      isOnline: isUserOnline(friend._id.toString()),
      listeningNow: getUserActivity(friend._id.toString()),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return ok(res, {
    data: { friends },
    extra: { friends },
  });
});

export const getFriendRequests = asyncHandler(async (req, res) => {
  const currentUser = await getAuthUser(req);

  if (!currentUser) {
    return fail(res, { statusCode: 401, message: "Unauthorized" });
  }

  const user = await User.findById(currentUser._id)
    .populate({ path: "pendingIncomingFriendRequestIds", select: "name email avatarUrl" })
    .populate({ path: "pendingOutgoingFriendRequestIds", select: "name email avatarUrl" })
    .select("pendingIncomingFriendRequestIds pendingOutgoingFriendRequestIds");

  const incoming = (user?.pendingIncomingFriendRequestIds || []).map((item) => toPublicUser(item));
  const outgoing = (user?.pendingOutgoingFriendRequestIds || []).map((item) => toPublicUser(item));

  return ok(res, {
    data: { incoming, outgoing },
    extra: { incoming, outgoing },
  });
});

export const getConversationMessages = asyncHandler(async (req, res) => {
  const currentUser = await getAuthUser(req);

  if (!currentUser) {
    return fail(res, { statusCode: 401, message: "Unauthorized" });
  }

  const friendId = String(req.params.friendId || "").trim();

  if (!isValidObjectId(friendId)) {
    return fail(res, { statusCode: 400, message: "Invalid friendId" });
  }

  if (!ensureFriend(currentUser, friendId)) {
    return fail(res, { statusCode: 403, message: "You can only message friends" });
  }

  const limit = Math.max(1, Math.min(100, Number(req.query.limit) || 40));
  const beforeRaw = String(req.query.before || "").trim();
  const filter = {
    participants: { $all: [currentUser._id, friendId] },
  };

  if (beforeRaw) {
    const beforeDate = new Date(beforeRaw);

    if (!Number.isNaN(beforeDate.getTime())) {
      filter.createdAt = { $lt: beforeDate };
    }
  }

  const messages = await Message.find(filter)
    .sort({ createdAt: -1 })
    .limit(limit);

  const normalized = messages
    .reverse()
    .map((message) => ({
      id: message._id.toString(),
      senderId: message.senderId.toString(),
      receiverId: message.receiverId.toString(),
      text: message.text,
      createdAt: message.createdAt,
      seenAt: message.seenAt,
    }));

  return ok(res, {
    data: { messages: normalized },
    extra: { messages: normalized },
  });
});

export const sendMessage = asyncHandler(async (req, res) => {
  const currentUser = await getAuthUser(req);

  if (!currentUser) {
    return fail(res, { statusCode: 401, message: "Unauthorized" });
  }

  const friendId = String(req.params.friendId || "").trim();
  const text = String(req.body.text || "").trim();
  const clientTempId = String(req.body.clientTempId || "").trim();

  if (!isValidObjectId(friendId)) {
    return fail(res, { statusCode: 400, message: "Invalid friendId" });
  }

  if (!ensureFriend(currentUser, friendId)) {
    return fail(res, { statusCode: 403, message: "You can only message friends" });
  }

  if (!text) {
    return fail(res, { statusCode: 400, message: "Message cannot be empty" });
  }

  const participants = [currentUser._id.toString(), friendId].sort();

  const created = await Message.create({
    senderId: currentUser._id,
    receiverId: friendId,
    participants,
    text,
  });

  const payload = {
    id: created._id.toString(),
    senderId: created.senderId.toString(),
    receiverId: created.receiverId.toString(),
    text: created.text,
    createdAt: created.createdAt,
    seenAt: created.seenAt,
    clientTempId: clientTempId || undefined,
  };

  emitRealtimeMessage({
    participantIds: [currentUser._id.toString(), friendId],
    message: payload,
  });

  return ok(res, {
    statusCode: 201,
    message: "Message sent",
    data: { message: payload },
    extra: { message: payload },
  });
});

export const markConversationSeen = asyncHandler(async (req, res) => {
  const currentUser = await getAuthUser(req);

  if (!currentUser) {
    return fail(res, { statusCode: 401, message: "Unauthorized" });
  }

  const friendId = String(req.params.friendId || "").trim();

  if (!isValidObjectId(friendId)) {
    return fail(res, { statusCode: 400, message: "Invalid friendId" });
  }

  if (!ensureFriend(currentUser, friendId)) {
    return fail(res, { statusCode: 403, message: "You can only mark friends conversations" });
  }

  const seenAt = new Date();

  const result = await Message.updateMany(
    {
      senderId: friendId,
      receiverId: currentUser._id,
      seenAt: null,
    },
    {
      $set: { seenAt },
    }
  );

  if ((result.modifiedCount || 0) > 0) {
    emitConversationSeen({
      participantIds: [currentUser._id.toString(), friendId],
      payload: {
        readerId: currentUser._id.toString(),
        friendId,
        seenAt: seenAt.toISOString(),
      },
    });
  }

  return ok(res, {
    message: "Conversation seen updated",
    data: { seenAt: seenAt.toISOString(), modifiedCount: result.modifiedCount || 0 },
    extra: { seenAt: seenAt.toISOString(), modifiedCount: result.modifiedCount || 0 },
  });
});

export const getFriendPresence = asyncHandler(async (req, res) => {
  const currentUser = await getAuthUser(req);

  if (!currentUser) {
    return fail(res, { statusCode: 401, message: "Unauthorized" });
  }

  const friendId = String(req.params.friendId || "").trim();

  if (!isValidObjectId(friendId)) {
    return fail(res, { statusCode: 400, message: "Invalid friendId" });
  }

  if (!ensureFriend(currentUser, friendId)) {
    return fail(res, { statusCode: 403, message: "Forbidden" });
  }

  return ok(res, {
    data: {
      userId: friendId,
      isOnline: isUserOnline(friendId),
    },
    extra: {
      userId: friendId,
      isOnline: isUserOnline(friendId),
    },
  });
});

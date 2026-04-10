import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    participants: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
      ],
      validate: {
        validator: (value) => Array.isArray(value) && value.length === 2,
        message: "participants must contain exactly 2 users",
      },
      index: true,
    },
    text: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    seenAt: {
      type: Date,
      default: null,
      index: true,
    },
  },
  { timestamps: true }
);

messageSchema.index({ participants: 1, createdAt: -1 });

export const Message = mongoose.model("Message", messageSchema);

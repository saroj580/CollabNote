import mongoose from "mongoose"
import crypto from "crypto"

const VersionSchema = new mongoose.Schema({
  content: {
    type: Object,
    required: true,
  },
  savedAt: {
    type: Date,
    default: Date.now,
  },
  savedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
})

const CommentSchema = new mongoose.Schema({
  content: {
    type: String,
    required: true,
  },
  position: {
    type: {
      from: Number,
      to: Number,
    },
    required: true,
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  resolved: {
    type: Boolean,
    default: false,
  },
  replies: [
    {
      content: String,
      author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      createdAt: {
        type: Date,
        default: Date.now,
      },
    },
  ],
  createdAt: {
    type: Date,
    default: Date.now,
  },
})

const NoteSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Please provide a title"],
      trim: true,
      maxlength: [200, "Title cannot be more than 200 characters"],
    },
    content: {
      type: Object,
      default: {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [],
          },
        ],
      },
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    collaborators: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        permission: {
          type: String,
          enum: ["view", "edit"],
          default: "view",
        },
      },
    ],
    shareLink: {
      type: String,
      unique: true,
      sparse: true,
    },
    isPublic: {
      type: Boolean,
      default: false,
    },
    versions: [VersionSchema],
    comments: [CommentSchema],
    activeUsers: [
      {
        type: String,
      },
    ],
  },
  {
    timestamps: true,
  },
)

// Generate unique share link
NoteSchema.methods.generateShareLink = function () {
  this.shareLink = crypto.randomBytes(16).toString("hex")
  return this.shareLink
}

export default mongoose.models.Note || mongoose.model("Note", NoteSchema)

import { NextResponse } from "next/server"
import connectDB from "@/lib/db"
import Note from "@/models/Note"
import { verifyToken, getTokenFromHeader } from "@/lib/auth"

// Update comment (resolve/unresolve or add reply)
export async function PATCH(request, { params }) {
  try {
    const token = getTokenFromHeader(request)
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    const { id, commentId } = await params
    const body = await request.json()

    await connectDB()

    const note = await Note.findById(id)
    if (!note) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 })
    }

    // Check access
    const isOwner = note.owner.toString() === decoded.userId
    const isCollaborator = note.collaborators.some((c) => c.user.toString() === decoded.userId)

    if (!isOwner && !isCollaborator) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    const comment = note.comments.id(commentId)
    if (!comment) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 })
    }

    // Update resolved status
    if (typeof body.resolved === "boolean") {
      comment.resolved = body.resolved
    }

    // Add reply
    if (body.reply) {
      comment.replies.push({
        content: body.reply,
        author: decoded.userId,
      })
    }

    await note.save()

    const savedNote = await Note.findById(id)
      .populate("comments.author", "name email avatar")
      .populate("comments.replies.author", "name email avatar")

    const updatedComment = savedNote.comments.id(commentId)

    return NextResponse.json({ comment: updatedComment })
  } catch (error) {
    console.error("Update comment error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// Delete comment
export async function DELETE(request, { params }) {
  try {
    const token = getTokenFromHeader(request)
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    const { id, commentId } = await params

    await connectDB()

    const note = await Note.findById(id)
    if (!note) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 })
    }

    const comment = note.comments.id(commentId)
    if (!comment) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 })
    }

    // Only comment author or note owner can delete
    const isOwner = note.owner.toString() === decoded.userId
    const isCommentAuthor = comment.author.toString() === decoded.userId

    if (!isOwner && !isCommentAuthor) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    note.comments.pull(commentId)
    await note.save()

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Delete comment error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}


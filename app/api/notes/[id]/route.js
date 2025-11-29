import { NextResponse } from "next/server"
import connectDB from "@/lib/db"
import Note from "@/models/Note"
import { verifyToken, getTokenFromHeader } from "@/lib/auth"

// Get single note
export async function GET(request, { params }) {
  try {
    const { id } = await params

    await connectDB()

    // First try to find by ID
    let note = await Note.findById(id)
      .populate("owner", "name email avatar")
      .populate("collaborators.user", "name email avatar")

    // If not found by ID, try share link
    if (!note) {
      note = await Note.findOne({ shareLink: id })
        .populate("owner", "name email avatar")
        .populate("collaborators.user", "name email avatar")
    }

    if (!note) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 })
    }

    // Check if note is public or user has access
    const token = getTokenFromHeader(request)
    if (note.isPublic || note.shareLink === id) {
      return NextResponse.json({ note })
    }

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    const isOwner = note.owner._id.toString() === decoded.userId
    const isCollaborator = note.collaborators.some((c) => c.user._id.toString() === decoded.userId)

    if (!isOwner && !isCollaborator) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    return NextResponse.json({ note })
  } catch (error) {
    console.error("Get note error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// Update note
export async function PUT(request, { params }) {
  try {
    const token = getTokenFromHeader(request)
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    const { id } = await params
    const { title, content, isPublic } = await request.json()

    await connectDB()

    const note = await Note.findById(id)
    if (!note) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 })
    }

    // Check permissions
    const isOwner = note.owner.toString() === decoded.userId
    const collaborator = note.collaborators.find((c) => c.user.toString() === decoded.userId)
    const canEdit = isOwner || (collaborator && collaborator.permission === "edit")

    if (!canEdit) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    // Always save current as version before updating, but only if content actually changes
    let shouldVersion = false;
    if (content !== undefined) {
      // Compare current content to new content (stringify for deep equality)
      const oldContentStr = JSON.stringify(note.content);
      const newContentStr = JSON.stringify(content);
      if (oldContentStr !== newContentStr) {
        shouldVersion = true;
      }
    }
    if (shouldVersion && note.content) {
      note.versions.push({
        content: note.content,
        savedAt: new Date(),
        savedBy: decoded.userId,
      })
      // Keep only last 20 versions
      if (note.versions.length > 20) {
        note.versions = note.versions.slice(-20)
      }
    }

    // Update fields
    if (title !== undefined) note.title = title
    if (content !== undefined) note.content = content
    if (isPublic !== undefined && isOwner) note.isPublic = isPublic

    await note.save()

    return NextResponse.json({ note })
  } catch (error) {
    console.error("Update note error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// Delete note
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

    const { id } = await params

    await connectDB()

    const note = await Note.findById(id)
    if (!note) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 })
    }

    // Only owner can delete
    if (note.owner.toString() !== decoded.userId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    await Note.findByIdAndDelete(id)

    return NextResponse.json({ message: "Note deleted successfully" })
  } catch (error) {
    console.error("Delete note error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

import { NextResponse } from "next/server"
import connectDB from "@/lib/db"
import Note from "@/models/Note"
import { verifyToken, getTokenFromHeader } from "@/lib/auth"

// Get all comments for a note
export async function GET(request, { params }) {
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
      .select("comments owner collaborators")
      .populate("comments.author", "name email avatar")
      .populate("comments.replies.author", "name email avatar")

    if (!note) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 })
    }

    // Check access
    const isOwner = note.owner.toString() === decoded.userId
    const isCollaborator = note.collaborators.some((c) => c.user.toString() === decoded.userId)

    if (!isOwner && !isCollaborator) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    return NextResponse.json({ comments: note.comments || [] })
  } catch (error) {
    console.error("Get comments error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// Add a new comment
export async function POST(request, { params }) {
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
    const { content, position } = await request.json()

    if (!content || !position) {
      return NextResponse.json({ error: "Content and position are required" }, { status: 400 })
    }

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

    // Add comment
    note.comments.push({
      content,
      position,
      author: decoded.userId,
    })

    await note.save()

    const savedNote = await Note.findById(id)
      .populate("comments.author", "name email avatar")
      .populate("comments.replies.author", "name email avatar")

    const newComment = savedNote.comments[savedNote.comments.length - 1]

    return NextResponse.json({ comment: newComment })
  } catch (error) {
    console.error("Add comment error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}


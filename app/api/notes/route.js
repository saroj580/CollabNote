import { NextResponse } from "next/server"
import connectDB from "@/lib/db"
import Note from "@/models/Note"
import { verifyToken, getTokenFromHeader } from "@/lib/auth"

// Get all notes for user
export async function GET(request) {
  try {
    const token = getTokenFromHeader(request)
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    await connectDB()

    // Get notes where user is owner or collaborator
    const notes = await Note.find({
      $or: [{ owner: decoded.userId }, { "collaborators.user": decoded.userId }],
    })
      .populate("owner", "name email")
      .sort({ updatedAt: -1 })

    return NextResponse.json({ notes })
  } catch (error) {
    console.error("Get notes error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// Create new note
export async function POST(request) {
  try {
    const token = getTokenFromHeader(request)
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    await connectDB()

    const { title, content } = await request.json()

    const note = await Note.create({
      title: title || "Untitled Note",
      content: content || {
        type: "doc",
        content: [{ type: "paragraph", content: [] }],
      },
      owner: decoded.userId,
    })

    // Generate share link
    note.generateShareLink()
    await note.save()

    return NextResponse.json({ note }, { status: 201 })
  } catch (error) {
    console.error("Create note error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

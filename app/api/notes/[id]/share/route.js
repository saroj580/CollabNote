import { NextResponse } from "next/server"
import connectDB from "@/lib/db"
import Note from "@/models/Note"
import User from "@/models/User"
import { verifyToken, getTokenFromHeader } from "@/lib/auth"

// Add collaborator
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
    const { email, permission = "view" } = await request.json()

    await connectDB()

    const note = await Note.findById(id)
    if (!note) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 })
    }

    // Only owner can add collaborators
    if (note.owner.toString() !== decoded.userId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    // Find user to add
    const userToAdd = await User.findOne({ email })
    if (!userToAdd) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Check if already a collaborator
    const existingCollaborator = note.collaborators.find((c) => c.user.toString() === userToAdd._id.toString())

    if (existingCollaborator) {
      existingCollaborator.permission = permission
    } else {
      note.collaborators.push({
        user: userToAdd._id,
        permission,
      })
    }

    await note.save()

    const updatedNote = await Note.findById(id)
      .populate("owner", "name email")
      .populate("collaborators.user", "name email avatar")

    return NextResponse.json({ note: updatedNote })
  } catch (error) {
    console.error("Share note error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// Remove collaborator
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
    const { userId } = await request.json()

    await connectDB()

    const note = await Note.findById(id)
    if (!note) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 })
    }

    // Only owner can remove collaborators
    if (note.owner.toString() !== decoded.userId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    // Remove collaborator
    note.collaborators = note.collaborators.filter(
      (c) => c.user.toString() !== userId
    )

    await note.save()

    const updatedNote = await Note.findById(id)
      .populate("owner", "name email")
      .populate("collaborators.user", "name email avatar")

    return NextResponse.json({ note: updatedNote })
  } catch (error) {
    console.error("Remove collaborator error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

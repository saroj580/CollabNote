import { NextResponse } from "next/server"
import connectDB from "@/lib/db"
import Note from "@/models/Note"
import { verifyToken, getTokenFromHeader } from "@/lib/auth"

// Get version history
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
      .select("versions owner collaborators")
      .populate("versions.savedBy", "name email")

    if (!note) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 })
    }

    // Check access
    const isOwner = note.owner.toString() === decoded.userId
    const isCollaborator = note.collaborators.some((c) => c.user.toString() === decoded.userId)

    if (!isOwner && !isCollaborator) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    return NextResponse.json({ versions: note.versions })
  } catch (error) {
    console.error("Get versions error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// Restore version
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
    const { versionIndex } = await request.json()

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

    // Validate version index
    if (versionIndex < 0 || versionIndex >= note.versions.length) {
      return NextResponse.json({ error: "Invalid version" }, { status: 400 })
    }

    // Save current as version before restoring
    note.versions.push({
      content: note.content,
      savedAt: new Date(),
      savedBy: decoded.userId,
    })

    // Restore selected version
    note.content = note.versions[versionIndex].content

    await note.save()

    return NextResponse.json({ note })
  } catch (error) {
    console.error("Restore version error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

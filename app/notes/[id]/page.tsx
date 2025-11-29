"use client"

import { useEffect, useState, use } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@/components/auth-provider"
import { Navbar } from "@/components/navbar"
import { Editor } from "@/components/editor"
import { ShareDialog } from "@/components/share-dialog"
import { VersionHistory } from "@/components/version-history"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { ArrowLeft, Loader2, Share2, Check, X } from "lucide-react"

interface Note {
  _id: string
  title: string
  content: any
  owner: {
    _id: string
    name: string
    email: string
  }
  collaborators: Array<{
    user: {
      _id: string
      name: string
    }
    permission: string
  }>
  isPublic: boolean
  shareLink: string
  updatedAt: string
}

export default function NoteEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const noteId = resolvedParams.id
  const { user, token, isLoading: authLoading } = useAuth()
  const [note, setNote] = useState<Note | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [shareDialogOpen, setShareDialogOpen] = useState(false)
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [editedTitle, setEditedTitle] = useState("")
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    if (!authLoading) {
      fetchNote()
    }
  }, [noteId, token, authLoading])

  const fetchNote = async () => {
    try {
      const headers: Record<string, string> = {}
      if (token) {
        headers.Authorization = `Bearer ${token}`
      }

      const response = await fetch(`/api/notes/${noteId}`, { headers })
      const data = await response.json()

      if (response.ok) {
        setNote(data.note)
        setEditedTitle(data.note.title)
      } else if (response.status === 401 || response.status === 403) {
        toast({
          title: "Access denied",
          description: "You don't have permission to view this note",
          variant: "destructive",
        })
        router.push("/login")
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to load note",
          variant: "destructive",
        })
        router.push("/dashboard")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load note",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleTitleSave = async () => {
    if (!note || !token) return

    try {
      const response = await fetch(`/api/notes/${note._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ title: editedTitle }),
      })

      if (response.ok) {
        setNote({ ...note, title: editedTitle })
        setIsEditingTitle(false)
        toast({
          title: "Title updated",
          description: "Note title has been saved",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update title",
        variant: "destructive",
      })
    }
  }

  const handleContentRestore = (content: any) => {
    if (note) {
      setNote({ ...note, content })
    }
  }

  const canEdit = () => {
    if (!user || !note) return false
    const isOwner = note.owner._id === user.id
    const editCollaborator = note.collaborators?.find((c) => c.user._id === user.id && c.permission === "edit")
    return isOwner || !!editCollaborator
  }

  if (isLoading || authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!note) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center">
        <h1 className="text-2xl font-bold">Note not found</h1>
        <Link href="/dashboard">
          <Button className="mt-4">Go to Dashboard</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Back link */}
        {user && (
          <Link
            href="/dashboard"
            className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
        )}

        {/* Note header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex-1">
            {isEditingTitle && canEdit() ? (
              <div className="flex items-center gap-2">
                <Input
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  className="text-2xl font-bold"
                  autoFocus
                />
                <Button size="icon" variant="ghost" onClick={handleTitleSave}>
                  <Check className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => {
                    setEditedTitle(note.title)
                    setIsEditingTitle(false)
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <h1
                className={`text-2xl font-bold ${canEdit() ? "cursor-pointer hover:text-primary" : ""}`}
                onClick={() => canEdit() && setIsEditingTitle(true)}
              >
                {note.title}
              </h1>
            )}
            <p className="mt-1 text-sm text-muted-foreground">
              by {note.owner.name} • Last updated {new Date(note.updatedAt).toLocaleDateString()}
            </p>
          </div>

          {user && (
            <div className="flex items-center gap-2">
              <VersionHistory noteId={note._id} token={token || ""} onRestore={handleContentRestore} />
              <Button
                variant="outline"
                size="sm"
                className="gap-2 bg-transparent"
                onClick={() => setShareDialogOpen(true)}
              >
                <Share2 className="h-4 w-4" />
                Share
              </Button>
            </div>
          )}
        </div>

        {/* Editor */}
        {token ? (
          <Editor noteId={note._id} initialContent={note.content} token={token} readOnly={!canEdit()} />
        ) : (
          <div className="rounded-lg border border-border bg-card p-6">
            <div className="prose prose-invert max-w-none">
              {/* Render content as read-only */}
              <div
                dangerouslySetInnerHTML={{
                  __html: `<p class="text-muted-foreground">Sign in to view and edit this note</p>`,
                }}
              />
            </div>
          </div>
        )}

        {/* Share Dialog */}
        <ShareDialog open={shareDialogOpen} onOpenChange={setShareDialogOpen} note={note} token={token || ""} />
      </main>
    </div>
  )
}

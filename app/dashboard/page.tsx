"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useAuth } from "@/components/auth-provider"
import { ProtectedRoute } from "@/components/protected-route"
import { Navbar } from "@/components/navbar"
import { NoteCard } from "@/components/note-card"
import { ShareDialog } from "@/components/share-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useToast } from "@/hooks/use-toast"
import { Plus, Search, FileText, Loader2 } from "lucide-react"

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

export default function DashboardPage() {
  const { user, token } = useAuth()
  const [notes, setNotes] = useState<Note[]>([])
  const [filteredNotes, setFilteredNotes] = useState<Note[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [deleteNoteId, setDeleteNoteId] = useState<string | null>(null)
  const [shareNote, setShareNote] = useState<Note | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    if (token) {
      fetchNotes()
    }
  }, [token])

  useEffect(() => {
    if (searchQuery) {
      const filtered = notes.filter((note) => note.title.toLowerCase().includes(searchQuery.toLowerCase()))
      setFilteredNotes(filtered)
    } else {
      setFilteredNotes(notes)
    }
  }, [searchQuery, notes])

  const fetchNotes = async () => {
    try {
      const response = await fetch("/api/notes", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      const data = await response.json()
      if (response.ok) {
        setNotes(data.notes)
        setFilteredNotes(data.notes)
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch notes",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (noteId: string) => {
    try {
      const response = await fetch(`/api/notes/${noteId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        setNotes(notes.filter((note) => note._id !== noteId))
        toast({
          title: "Note deleted",
          description: "The note has been permanently deleted",
        })
      } else {
        const data = await response.json()
        toast({
          title: "Error",
          description: data.error || "Failed to delete note",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete note",
        variant: "destructive",
      })
    } finally {
      setDeleteNoteId(null)
    }
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <Navbar />

        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold">My Notes</h1>
              <p className="mt-1 text-muted-foreground">
                Welcome back, {user?.name}. You have {notes.length} notes.
              </p>
            </div>
            <Link href="/notes/create">
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                New Note
              </Button>
            </Link>
          </div>

          {/* Search */}
          <div className="relative mb-8">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Notes Grid */}
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredNotes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <FileText className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="mb-2 text-lg font-semibold">{searchQuery ? "No notes found" : "No notes yet"}</h3>
              <p className="mb-6 text-muted-foreground">
                {searchQuery ? "Try a different search term" : "Create your first note to get started"}
              </p>
              {!searchQuery && (
                <Link href="/notes/create">
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    Create Note
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filteredNotes.map((note) => (
                <NoteCard
                  key={note._id}
                  note={note}
                  currentUserId={user?.id || ""}
                  onDelete={(id) => setDeleteNoteId(id)}
                  onShare={(note) => setShareNote(note)}
                />
              ))}
            </div>
          )}
        </main>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={!!deleteNoteId} onOpenChange={() => setDeleteNoteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Note</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this note? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteNoteId && handleDelete(deleteNoteId)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Share Dialog */}
        <ShareDialog open={!!shareNote} onOpenChange={() => setShareNote(null)} note={shareNote} token={token || ""} />
      </div>
    </ProtectedRoute>
  )
}

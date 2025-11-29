"use client"

import Link from "next/link"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { Clock, MoreVertical, Share2, Trash2, Users } from "lucide-react"
import { formatDistanceToNow } from "date-fns"

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

interface NoteCardProps {
  note: Note
  currentUserId: string
  onDelete: (id: string) => void
  onShare: (note: Note) => void
}

export function NoteCard({ note, currentUserId, onDelete, onShare }: NoteCardProps) {
  const isOwner = note.owner._id === currentUserId
  const collaboratorCount = note.collaborators?.length || 0

  // Extract plain text preview from content
  const getContentPreview = () => {
    if (!note.content?.content) return "No content yet..."
    const textContent = note.content.content
      .map((node: any) => {
        if (node.content) {
          return node.content.map((c: any) => c.text || "").join("")
        }
        return ""
      })
      .join(" ")
    return textContent.slice(0, 150) || "No content yet..."
  }

  return (
    <Card className="group relative transition-all hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5">
      <Link href={`/notes/${note._id}`}>
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <CardTitle className="line-clamp-1 text-lg">{note.title}</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="line-clamp-3 text-sm text-muted-foreground">{getContentPreview()}</p>
        </CardContent>
      </Link>
      <CardFooter className="flex items-center justify-between border-t border-border pt-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>{formatDistanceToNow(new Date(note.updatedAt), { addSuffix: true })}</span>
        </div>
        <div className="flex items-center gap-2">
          {collaboratorCount > 0 && (
            <Badge variant="secondary" className="gap-1">
              <Users className="h-3 w-3" />
              {collaboratorCount}
            </Badge>
          )}
          {note.isPublic && <Badge variant="outline">Public</Badge>}
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.preventDefault()}>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={(e) => {
                  e.preventDefault()
                  onShare(note)
                }}
                className="gap-2"
              >
                <Share2 className="h-4 w-4" />
                Share
              </DropdownMenuItem>
              {isOwner && (
                <DropdownMenuItem
                  onClick={(e) => {
                    e.preventDefault()
                    onDelete(note._id)
                  }}
                  className="gap-2 text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardFooter>
    </Card>
  )
}

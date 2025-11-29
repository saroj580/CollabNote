"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Copy, Check, Link, UserPlus, X, Trash2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/components/auth-provider"

interface Collaborator {
  user: {
    _id: string
    name: string
    email: string
    avatar?: string
  }
  permission: string
}

interface ShareDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  note: {
    _id: string
    title: string
    shareLink: string
    isPublic: boolean
    owner?: {
      _id: string
      name: string
      email: string
    }
    collaborators?: Collaborator[]
  } | null
  token: string
}

export function ShareDialog({ open, onOpenChange, note, token }: ShareDialogProps) {
  const [email, setEmail] = useState("")
  const [permission, setPermission] = useState("view")
  const [isPublic, setIsPublic] = useState(note?.isPublic || false)
  const [copied, setCopied] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [collaborators, setCollaborators] = useState<Collaborator[]>(note?.collaborators || [])
  const [isRemoving, setIsRemoving] = useState<string | null>(null)
  const { toast } = useToast()
  const { user } = useAuth()

  useEffect(() => {
    if (open && note) {
      fetchNote()
    }
  }, [open, note?._id])

  const fetchNote = async () => {
    if (!note?._id) return
    try {
      const response = await fetch(`/api/notes/${note._id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      const data = await response.json()
      if (response.ok) {
        setCollaborators(data.note.collaborators || [])
        setIsPublic(data.note.isPublic || false)
      }
    } catch (error) {
      console.error("Failed to fetch note:", error)
    }
  }

  const shareUrl = note ? `${window.location.origin}/notes/${note.shareLink}` : ""

  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast({
      title: "Link copied",
      description: "Share link has been copied to clipboard",
    })
  }

  const handleAddCollaborator = async () => {
    if (!email || !note) return

    setIsLoading(true)
    try {
      const response = await fetch(`/api/notes/${note._id}/share`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ email, permission }),
      })

      const data = await response.json()

      if (response.ok) {
        setCollaborators(data.note.collaborators || [])
        toast({
          title: "Collaborator added",
          description: `${email} has been added as a collaborator`,
        })
        setEmail("")
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to add collaborator",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add collaborator",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleTogglePublic = async () => {
    if (!note) return

    try {
      const response = await fetch(`/api/notes/${note._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isPublic: !isPublic }),
      })

      if (response.ok) {
        setIsPublic(!isPublic)
        toast({
          title: isPublic ? "Note is now private" : "Note is now public",
          description: isPublic ? "Only collaborators can access this note" : "Anyone with the link can view this note",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update note visibility",
        variant: "destructive",
      })
    }
  }

  const handleRemoveCollaborator = async (userId: string) => {
    if (!note) return

    setIsRemoving(userId)
    try {
      const response = await fetch(`/api/notes/${note._id}/share`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userId }),
      })

      const data = await response.json()

      if (response.ok) {
        setCollaborators(data.note.collaborators || [])
        toast({
          title: "Collaborator removed",
          description: "The collaborator has been removed from this note",
        })
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to remove collaborator",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to remove collaborator",
        variant: "destructive",
      })
    } finally {
      setIsRemoving(null)
    }
  }

  const isOwner = user?.id === note?.owner?._id

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share Note</DialogTitle>
          <DialogDescription>Share &quot;{note?.title}&quot; with others</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-6 py-4">
          {/* Share link section */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Link className="h-4 w-4 text-muted-foreground" />
              <Label>Share Link</Label>
            </div>
            <div className="flex gap-2">
              <Input value={shareUrl} readOnly className="flex-1" />
              <Button variant="outline" size="icon" onClick={copyLink}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {/* Public toggle */}
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <Label>Public Access</Label>
              <span className="text-sm text-muted-foreground">Anyone with the link can view</span>
            </div>
            <Switch checked={isPublic} onCheckedChange={handleTogglePublic} />
          </div>

          {/* Existing collaborators */}
          {collaborators.length > 0 && (
            <div className="flex flex-col gap-3">
              <Label>Collaborators ({collaborators.length})</Label>
              <ScrollArea className="max-h-48">
                <div className="flex flex-col gap-2">
                  {collaborators.map((collab) => (
                    <div
                      key={collab.user._id}
                      className="flex items-center justify-between rounded-lg border border-border p-3"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          {collab.user.avatar ? (
                            <AvatarImage src={collab.user.avatar} alt={collab.user.name} />
                          ) : null}
                          <AvatarFallback className="text-xs">
                            {collab.user.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">{collab.user.name}</span>
                          <span className="text-xs text-muted-foreground">{collab.user.email}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={collab.permission === "edit" ? "default" : "secondary"}>
                          {collab.permission}
                        </Badge>
                        {isOwner && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveCollaborator(collab.user._id)}
                            disabled={isRemoving === collab.user._id}
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          >
                            {isRemoving === collab.user._id ? (
                              <X className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Add collaborator section */}
          {isOwner && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-muted-foreground" />
                <Label>Add Collaborator</Label>
              </div>
              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && email && !isLoading) {
                      handleAddCollaborator()
                    }
                  }}
                  className="flex-1"
                />
                <Select value={permission} onValueChange={setPermission}>
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="view">View</SelectItem>
                    <SelectItem value="edit">Edit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleAddCollaborator} disabled={!email || isLoading} className="w-full">
                {isLoading ? "Adding..." : "Add Collaborator"}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

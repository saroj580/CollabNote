"use client"

import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Placeholder from "@tiptap/extension-placeholder"
import Image from "@tiptap/extension-image"
import Link from "@tiptap/extension-link"
import Underline from "@tiptap/extension-underline"
import { useCallback, useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Toggle } from "@/components/ui/toggle"
import { Separator } from "@/components/ui/separator"
import {
  Bold,
  Italic,
  UnderlineIcon,
  List,
  ListOrdered,
  Quote,
  Code,
  Heading1,
  Heading2,
  Heading3,
  Undo,
  Redo,
  LinkIcon,
  ImageIcon,
  Save,
  Users,
  Wifi,
  WifiOff,
} from "lucide-react"
import { io, type Socket } from "socket.io-client"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { CommentsPanel } from "@/components/comments-panel"

interface EditorProps {
  noteId: string
  initialContent?: any
  token: string
  onSave?: (content: any) => void
  readOnly?: boolean
}

interface ActiveUser {
  userId: string
  name: string
  email: string
  avatar?: string
}

export function Editor({ noteId, initialContent, token, onSave, readOnly = false }: EditorProps) {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([])
  const [typingUsers, setTypingUsers] = useState<Map<string, string>>(new Map())
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [linkUrl, setLinkUrl] = useState("")
  const [imageUrl, setImageUrl] = useState("")
  const autoSaveRef = useRef<NodeJS.Timeout | null>(null)
  const isRemoteUpdate = useRef(false)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [selectedText, setSelectedText] = useState("")
  const [selectionPosition, setSelectionPosition] = useState<{ from: number; to: number } | undefined>()

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Placeholder.configure({
        placeholder: "Start writing your note...",
      }),
      Image.configure({
        HTMLAttributes: {
          class: "rounded-lg max-w-full",
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-primary underline cursor-pointer",
        },
      }),
      Underline,
    ],
    content: initialContent || {
      type: "doc",
      content: [{ type: "paragraph", content: [] }],
    },
    editable: !readOnly,
    onSelectionUpdate: ({ editor }) => {
      const { from, to } = editor.state.selection
      if (from !== to) {
        const selectedText = editor.state.doc.textBetween(from, to)
        setSelectedText(selectedText)
        setSelectionPosition({ from, to })
      } else {
        setSelectedText("")
        setSelectionPosition(undefined)
      }
    },
    onUpdate: ({ editor }) => {
      if (!isRemoteUpdate.current) {
        // Emit changes to socket
        if (socket && isConnected) {
          socket.emit("note:update", {
            noteId,
            content: editor.getJSON(),
          })

          // Emit typing indicator
          if (!readOnly) {
            socket.emit("note:typing", { noteId, isTyping: true })

            // Clear existing timeout
            if (typingTimeoutRef.current) {
              clearTimeout(typingTimeoutRef.current)
            }

            // Stop typing indicator after 1 second of inactivity
            typingTimeoutRef.current = setTimeout(() => {
              if (socket && isConnected) {
                socket.emit("note:typing", { noteId, isTyping: false })
              }
            }, 1000)
          }
        }
      }
      isRemoteUpdate.current = false
    },
  })

  // Socket.IO connection
  useEffect(() => {
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || window.location.origin
    console.log("[Editor] Connecting to Socket.IO at:", socketUrl)
    const newSocket = io(socketUrl, {
      path: "/api/socketio",
      auth: { token },
      query: { noteId },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    })

    newSocket.on("connect", () => {
      setIsConnected(true)
      newSocket.emit("note:join", { noteId })
    })

    newSocket.on("disconnect", () => {
      setIsConnected(false)
    })

    newSocket.on("connect_error", (error) => {
      console.error("Socket connection error:", error)
      setIsConnected(false)
      // App will still work without real-time collaboration
    })

    newSocket.on("error", (error) => {
      console.error("Socket error:", error)
    })

    newSocket.on("note:content", (data: { content: any }) => {
      if (editor && data.content) {
        isRemoteUpdate.current = true
        editor.commands.setContent(data.content)
      }
    })

    newSocket.on("note:users", (data: { users: ActiveUser[] }) => {
      setActiveUsers(data.users || [])
    })

    newSocket.on("note:typing", (data: { userId: string; userName: string; isTyping: boolean }) => {
      setTypingUsers((prev) => {
        const newMap = new Map(prev)
        if (data.isTyping) {
          newMap.set(data.userId, data.userName)
        } else {
          newMap.delete(data.userId)
        }
        return newMap
      })
    })

    setSocket(newSocket)

    return () => {
      // Stop typing indicator
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
      if (newSocket && isConnected) {
        newSocket.emit("note:typing", { noteId, isTyping: false })
      }
      newSocket.emit("note:leave", { noteId })
      newSocket.disconnect()
    }
  }, [noteId, token, editor])

  // Auto-save every 5 seconds
  useEffect(() => {
    if (!editor || readOnly) return

    autoSaveRef.current = setInterval(() => {
      handleSave()
    }, 5000)

    return () => {
      if (autoSaveRef.current) {
        clearInterval(autoSaveRef.current)
      }
    }
  }, [editor, readOnly])

  const handleSave = useCallback(async () => {
    if (!editor || readOnly) return

    setIsSaving(true)
    try {
      const response = await fetch(`/api/notes/${noteId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          content: editor.getJSON(),
          saveVersion: true,
        }),
      })

      if (response.ok) {
        setLastSaved(new Date())
        if (onSave) {
          onSave(editor.getJSON())
        }
      }
    } catch (error) {
      console.error("Save error:", error)
    } finally {
      setIsSaving(false)
    }
  }, [editor, noteId, token, onSave, readOnly])

  const addLink = useCallback(() => {
    if (linkUrl && editor) {
      editor.chain().focus().setLink({ href: linkUrl }).run()
      setLinkUrl("")
    }
  }, [editor, linkUrl])

  const addImage = useCallback(() => {
    if (imageUrl && editor) {
      editor.chain().focus().setImage({ src: imageUrl }).run()
      setImageUrl("")
    }
  }, [editor, imageUrl])

  if (!editor) return null

  return (
    <div className="flex flex-col rounded-lg border border-border bg-card">
      {/* Toolbar */}
      {!readOnly && (
        <div className="flex flex-wrap items-center gap-1 border-b border-border p-2">
          <Toggle
            size="sm"
            pressed={editor.isActive("bold")}
            onPressedChange={() => editor.chain().focus().toggleBold().run()}
          >
            <Bold className="h-4 w-4" />
          </Toggle>
          <Toggle
            size="sm"
            pressed={editor.isActive("italic")}
            onPressedChange={() => editor.chain().focus().toggleItalic().run()}
          >
            <Italic className="h-4 w-4" />
          </Toggle>
          <Toggle
            size="sm"
            pressed={editor.isActive("underline")}
            onPressedChange={() => editor.chain().focus().toggleUnderline().run()}
          >
            <UnderlineIcon className="h-4 w-4" />
          </Toggle>

          <Separator orientation="vertical" className="mx-1 h-6" />

          <Toggle
            size="sm"
            pressed={editor.isActive("heading", { level: 1 })}
            onPressedChange={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          >
            <Heading1 className="h-4 w-4" />
          </Toggle>
          <Toggle
            size="sm"
            pressed={editor.isActive("heading", { level: 2 })}
            onPressedChange={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          >
            <Heading2 className="h-4 w-4" />
          </Toggle>
          <Toggle
            size="sm"
            pressed={editor.isActive("heading", { level: 3 })}
            onPressedChange={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          >
            <Heading3 className="h-4 w-4" />
          </Toggle>

          <Separator orientation="vertical" className="mx-1 h-6" />

          <Toggle
            size="sm"
            pressed={editor.isActive("bulletList")}
            onPressedChange={() => editor.chain().focus().toggleBulletList().run()}
          >
            <List className="h-4 w-4" />
          </Toggle>
          <Toggle
            size="sm"
            pressed={editor.isActive("orderedList")}
            onPressedChange={() => editor.chain().focus().toggleOrderedList().run()}
          >
            <ListOrdered className="h-4 w-4" />
          </Toggle>
          <Toggle
            size="sm"
            pressed={editor.isActive("blockquote")}
            onPressedChange={() => editor.chain().focus().toggleBlockquote().run()}
          >
            <Quote className="h-4 w-4" />
          </Toggle>
          <Toggle
            size="sm"
            pressed={editor.isActive("codeBlock")}
            onPressedChange={() => editor.chain().focus().toggleCodeBlock().run()}
          >
            <Code className="h-4 w-4" />
          </Toggle>

          <Separator orientation="vertical" className="mx-1 h-6" />

          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm">
                <LinkIcon className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Link</DialogTitle>
              </DialogHeader>
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <Label>URL</Label>
                  <Input
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    placeholder="https://example.com"
                  />
                </div>
                <Button onClick={addLink}>Add Link</Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm">
                <ImageIcon className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Image</DialogTitle>
              </DialogHeader>
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <Label>Image URL</Label>
                  <Input
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="https://example.com/image.jpg"
                  />
                </div>
                <Button onClick={addImage}>Add Image</Button>
              </div>
            </DialogContent>
          </Dialog>

          <Separator orientation="vertical" className="mx-1 h-6" />

          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
          >
            <Undo className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
          >
            <Redo className="h-4 w-4" />
          </Button>

          <Separator orientation="vertical" className="mx-1 h-6" />

          {/* Comments Panel */}
          {!readOnly && (
            <CommentsPanel
              noteId={noteId}
              token={token}
              selectedText={selectedText}
              selectionPosition={selectionPosition}
            />
          )}

          <div className="ml-auto flex items-center gap-2">
            {/* Connection status */}
            <Badge variant={isConnected ? "default" : "destructive"} className="gap-1">
              {isConnected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
              {isConnected ? "Connected" : "Offline"}
            </Badge>

            {/* Presence Status - Active Users Avatars */}
            {activeUsers.length > 0 && (
              <TooltipProvider>
                <div className="flex items-center gap-1">
                  {activeUsers.slice(0, 5).map((user) => (
                    <Tooltip key={user.userId}>
                      <TooltipTrigger asChild>
                        <Avatar className="h-6 w-6 border-2 border-background">
                          {user.avatar ? (
                            <AvatarImage src={user.avatar} alt={user.name} />
                          ) : null}
                          <AvatarFallback className="text-xs">
                            {user.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{user.name}</p>
                      </TooltipContent>
                    </Tooltip>
                  ))}
                  {activeUsers.length > 5 && (
                    <Badge variant="secondary" className="h-6 px-2 text-xs">
                      +{activeUsers.length - 5}
                    </Badge>
                  )}
                </div>
              </TooltipProvider>
            )}

            {/* Typing Indicators */}
            {typingUsers.size > 0 && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <span>
                  {Array.from(typingUsers.values())
                    .slice(0, 2)
                    .join(", ")}
                  {typingUsers.size > 2 ? ` and ${typingUsers.size - 2} more` : ""} {typingUsers.size === 1 ? "is" : "are"} typing...
                </span>
              </div>
            )}

            {/* Save button */}
            <Button size="sm" onClick={handleSave} disabled={isSaving} className="gap-2">
              <Save className="h-4 w-4" />
              {isSaving ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      )}

      {/* Status bar */}
      {lastSaved && (
        <div className="border-b border-border bg-muted/50 px-3 py-1 text-xs text-muted-foreground">
          Last saved: {lastSaved.toLocaleTimeString()}
        </div>
      )}

      {/* Editor content */}
      <div className="p-4">
        <EditorContent editor={editor} className="prose prose-invert max-w-none" />
      </div>

    </div>
  )
}

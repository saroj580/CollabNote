"use client"

import { useState, useEffect } from "react"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { MessageSquare, Send, Check, X, Trash2, Reply } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/components/auth-provider"

interface Comment {
  _id: string
  content: string
  position: {
    from: number
    to: number
  }
  author: {
    _id: string
    name: string
    email: string
    avatar?: string
  }
  resolved: boolean
  replies: Array<{
    _id: string
    content: string
    author: {
      _id: string
      name: string
      email: string
      avatar?: string
    }
    createdAt: string
  }>
  createdAt: string
}

interface CommentsPanelProps {
  noteId: string
  token: string
  selectedText?: string
  selectionPosition?: { from: number; to: number }
  onCommentAdded?: () => void
}

export function CommentsPanel({
  noteId,
  token,
  selectedText,
  selectionPosition,
  onCommentAdded,
}: CommentsPanelProps) {
  const [comments, setComments] = useState<Comment[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [newComment, setNewComment] = useState("")
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyContent, setReplyContent] = useState("")
  const { user } = useAuth()
  const { toast } = useToast()

  useEffect(() => {
    if (isOpen) {
      fetchComments()
    }
  }, [isOpen, noteId, token])

  const fetchComments = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/notes/${noteId}/comments`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      const data = await response.json()
      if (response.ok) {
        setComments(data.comments || [])
      }
    } catch (error) {
      console.error("Failed to fetch comments:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddComment = async () => {
    if (!newComment.trim() || !selectionPosition) {
      toast({
        title: "Error",
        description: "Please select text and enter a comment",
        variant: "destructive",
      })
      return
    }

    try {
      const response = await fetch(`/api/notes/${noteId}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          content: newComment,
          position: selectionPosition,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setComments([...comments, data.comment])
        setNewComment("")
        toast({
          title: "Comment added",
          description: "Your comment has been added",
        })
        if (onCommentAdded) {
          onCommentAdded()
        }
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to add comment",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add comment",
        variant: "destructive",
      })
    }
  }

  const handleResolve = async (commentId: string, resolved: boolean) => {
    try {
      const response = await fetch(`/api/notes/${noteId}/comments/${commentId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ resolved }),
      })

      const data = await response.json()

      if (response.ok) {
        setComments(
          comments.map((c) => (c._id === commentId ? { ...c, resolved: data.comment.resolved } : c))
        )
      }
    } catch (error) {
      console.error("Failed to resolve comment:", error)
    }
  }

  const handleAddReply = async (commentId: string) => {
    if (!replyContent.trim()) return

    try {
      const response = await fetch(`/api/notes/${noteId}/comments/${commentId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reply: replyContent }),
      })

      const data = await response.json()

      if (response.ok) {
        setComments(comments.map((c) => (c._id === commentId ? data.comment : c)))
        setReplyContent("")
        setReplyingTo(null)
      }
    } catch (error) {
      console.error("Failed to add reply:", error)
    }
  }

  const handleDelete = async (commentId: string) => {
    try {
      const response = await fetch(`/api/notes/${noteId}/comments/${commentId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        setComments(comments.filter((c) => c._id !== commentId))
        toast({
          title: "Comment deleted",
          description: "The comment has been removed",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete comment",
        variant: "destructive",
      })
    }
  }

  const unresolvedCount = comments.filter((c) => !c.resolved).length

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 bg-transparent">
          <MessageSquare className="h-4 w-4" />
          Comments
          {unresolvedCount > 0 && (
            <Badge variant="destructive" className="ml-1 h-5 min-w-5 px-1.5 text-xs">
              {unresolvedCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Comments</SheetTitle>
          <SheetDescription>Discuss and collaborate on this note</SheetDescription>
        </SheetHeader>

        <div className="mt-6 flex flex-col gap-4">
          {/* Add new comment */}
          {selectionPosition && selectedText && (
            <div className="rounded-lg border border-border bg-muted/50 p-4">
              <div className="mb-2 text-sm font-medium">Selected text:</div>
              <div className="mb-3 rounded bg-background p-2 text-sm italic text-muted-foreground">
                &quot;{selectedText}&quot;
              </div>
              <Textarea
                placeholder="Add a comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                rows={3}
              />
              <Button onClick={handleAddComment} className="mt-2 w-full" size="sm">
                <Send className="mr-2 h-4 w-4" />
                Add Comment
              </Button>
            </div>
          )}

          {/* Comments list */}
          <ScrollArea className="h-[calc(100vh-300px)]">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <span className="text-muted-foreground">Loading comments...</span>
              </div>
            ) : comments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <MessageSquare className="h-12 w-12 text-muted-foreground/50" />
                <p className="mt-2 text-sm text-muted-foreground">No comments yet</p>
                <p className="mt-1 text-xs text-muted-foreground">Select text to add a comment</p>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {comments.map((comment) => (
                  <div
                    key={comment._id}
                    className={`rounded-lg border p-4 ${comment.resolved ? "bg-muted/30 opacity-60" : "bg-card"}`}
                  >
                    <div className="mb-2 flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          {comment.author.avatar ? (
                            <AvatarImage src={comment.author.avatar} alt={comment.author.name} />
                          ) : null}
                          <AvatarFallback className="text-xs">
                            {comment.author.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="text-sm font-medium">{comment.author.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {comment.resolved ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleResolve(comment._id, false)}
                            className="h-7 w-7 p-0"
                          >
                            <Check className="h-3 w-3" />
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleResolve(comment._id, true)}
                            className="h-7 w-7 p-0"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        )}
                        {(user?.id === comment.author._id) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(comment._id)}
                            className="h-7 w-7 p-0 text-destructive"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                    <p className="mb-3 text-sm">{comment.content}</p>

                    {/* Replies */}
                    {comment.replies && comment.replies.length > 0 && (
                      <div className="ml-8 mt-3 space-y-2 border-l-2 border-border pl-3">
                        {comment.replies.map((reply) => (
                          <div key={reply._id} className="flex items-start gap-2">
                            <Avatar className="h-5 w-5">
                              {reply.author.avatar ? (
                                <AvatarImage src={reply.author.avatar} alt={reply.author.name} />
                              ) : null}
                              <AvatarFallback className="text-xs">
                                {reply.author.name.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-medium">{reply.author.name}</span>
                                <span className="text-xs text-muted-foreground">
                                  {formatDistanceToNow(new Date(reply.createdAt), { addSuffix: true })}
                                </span>
                              </div>
                              <p className="text-sm text-muted-foreground">{reply.content}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Reply input */}
                    {replyingTo === comment._id ? (
                      <div className="mt-3 flex gap-2">
                        <Textarea
                          placeholder="Write a reply..."
                          value={replyContent}
                          onChange={(e) => setReplyContent(e.target.value)}
                          rows={2}
                          className="flex-1"
                        />
                        <div className="flex flex-col gap-1">
                          <Button onClick={() => handleAddReply(comment._id)} size="sm" className="h-8">
                            <Send className="h-3 w-3" />
                          </Button>
                          <Button
                            onClick={() => {
                              setReplyingTo(null)
                              setReplyContent("")
                            }}
                            variant="ghost"
                            size="sm"
                            className="h-8"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setReplyingTo(comment._id)}
                        className="mt-2 h-7 text-xs"
                      >
                        <Reply className="mr-1 h-3 w-3" />
                        Reply
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  )
}


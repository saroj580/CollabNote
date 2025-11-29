"use client"

import { useState, useEffect } from "react"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { History, RotateCcw, Eye, Clock } from "lucide-react"
import { formatDistanceToNow, format } from "date-fns"
import { useToast } from "@/hooks/use-toast"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface Version {
  _id: string
  content: any
  savedAt: string
  savedBy: {
    name: string
    email: string
  }
}

interface VersionHistoryProps {
  noteId: string
  token: string
  onRestore: (content: any) => void
}

export function VersionHistory({ noteId, token, onRestore }: VersionHistoryProps) {
  const [versions, setVersions] = useState<Version[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [previewVersion, setPreviewVersion] = useState<Version | null>(null)
  const { toast } = useToast()

  const fetchVersions = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/notes/${noteId}/versions`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      const data = await response.json()
      if (response.ok) {
        setVersions(data.versions || [])
      }
    } catch (error) {
      console.error("Failed to fetch versions:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      fetchVersions()
    }
  }, [isOpen])

  const handleRestore = async (versionIndex: number) => {
    try {
      const response = await fetch(`/api/notes/${noteId}/versions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ versionIndex }),
      })

      const data = await response.json()

      if (response.ok) {
        onRestore(data.note.content)
        toast({
          title: "Version restored",
          description: "The note has been restored to the selected version",
        })
        setIsOpen(false)
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to restore version",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to restore version",
        variant: "destructive",
      })
    }
  }

  const getContentPreview = (content: any): string => {
    if (!content || !content.content) return "Empty"
    try {
      // Extract text from TipTap JSON structure
      const extractText = (node: any): string => {
        if (node.type === "text") return node.text || ""
        if (node.content && Array.isArray(node.content)) {
          return node.content.map(extractText).join(" ")
        }
        return ""
      }
      const text = extractText(content)
      return text.length > 100 ? text.substring(0, 100) + "..." : text || "Empty"
    } catch {
      return "Unable to preview"
    }
  }

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 bg-transparent">
          <History className="h-4 w-4" />
          History
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Version History</SheetTitle>
          <SheetDescription>View and restore previous versions of this note</SheetDescription>
        </SheetHeader>

        <ScrollArea className="mt-6 h-[calc(100vh-200px)]">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <span className="text-muted-foreground">Loading versions...</span>
            </div>
          ) : versions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <History className="h-12 w-12 text-muted-foreground/50" />
              <p className="mt-2 text-sm text-muted-foreground">No versions saved yet</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {versions.map((version, index) => (
                <div
                  key={version._id || index}
                  className="flex flex-col gap-3 rounded-lg border border-border p-4 transition-colors hover:bg-muted/50"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold">Version {versions.length - index}</span>
                          {index === versions.length - 1 && (
                            <Badge variant="default" className="text-xs">
                              Current
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {format(new Date(version.savedAt), "MMM d, yyyy 'at' h:mm a")}
                        </div>
                        {version.savedBy && (
                          <div className="flex items-center gap-2">
                            <Avatar className="h-5 w-5">
                              <AvatarFallback className="text-xs">
                                {version.savedBy.name.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-xs text-muted-foreground">{version.savedBy.name}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="rounded bg-muted/50 p-2 text-xs text-muted-foreground">
                    {getContentPreview(version.content)}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPreviewVersion(version)}
                      className="gap-2"
                    >
                      <Eye className="h-4 w-4" />
                      Preview
                    </Button>
                    {index !== versions.length - 1 && (
                      <Button variant="ghost" size="sm" onClick={() => handleRestore(index)} className="gap-2">
                        <RotateCcw className="h-4 w-4" />
                        Restore
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </SheetContent>

      {/* Preview Dialog */}
      <Dialog open={!!previewVersion} onOpenChange={() => setPreviewVersion(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>
              Version Preview
              {previewVersion && versions.length > 0 && (
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  Version {versions.length - versions.findIndex((v) => v._id === previewVersion._id)}
                </span>
              )}
            </DialogTitle>
            <DialogDescription>
              {previewVersion?.savedBy && (
                <span>
                  Saved by {previewVersion.savedBy.name} on{" "}
                  {format(new Date(previewVersion.savedAt), "MMM d, yyyy 'at' h:mm a")}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <div className="prose prose-invert max-w-none rounded-lg border border-border bg-card p-4">
              {previewVersion?.content ? (
                <div
                  dangerouslySetInnerHTML={{
                    __html: JSON.stringify(previewVersion.content, null, 2),
                  }}
                />
              ) : (
                <p className="text-muted-foreground">No content in this version</p>
              )}
            </div>
          </ScrollArea>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setPreviewVersion(null)}>
              Close
            </Button>
            {previewVersion &&
              versions.findIndex((v) => v._id === previewVersion._id) !== versions.length - 1 && (
                <Button
                  onClick={() => {
                    const index = versions.findIndex((v) => v._id === previewVersion._id)
                    handleRestore(index)
                    setPreviewVersion(null)
                  }}
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Restore This Version
                </Button>
              )}
          </div>
        </DialogContent>
      </Dialog>
    </Sheet>
  )
}

// Load environment variables FIRST before any other imports
import dotenv from "dotenv"
dotenv.config()

import { createServer } from "http"
import { parse } from "url"
import next from "next"
import { Server } from "socket.io"

// Dynamic imports for modules that depend on environment variables
// These must be loaded AFTER dotenv.config() runs
const { default: connectDB } = await import("./lib/db.js")
const { default: Note } = await import("./models/Note.js")
const { default: User } = await import("./models/User.js")
const authModule = await import("./lib/auth.js")
const { verifyToken } = authModule

const dev = process.env.NODE_ENV !== "production"
const hostname = "localhost"
const port = process.env.PORT || 3000

const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

// Store active users per note
const noteRooms = new Map() // Map<noteId, Set<userId>>
// Store user info per socket
const socketUsers = new Map() // Map<socketId, {userId, name, email, avatar}>
// Store typing indicators per note
const typingUsers = new Map() // Map<noteId, Map<userId, {name, timeout}>>

app.prepare().then(() => {
  const httpServer = createServer(async (req, res) => {
    // Skip Socket.IO requests - let Socket.IO handle them
    if (req.url?.startsWith("/api/socketio")) {
      return
    }
    try {
      const parsedUrl = parse(req.url, true)
      await handle(req, res, parsedUrl)
    } catch (err) {
      console.error("Error occurred handling", req.url, err)
      res.statusCode = 500
      res.end("internal server error")
    }
  })

  const io = new Server(httpServer, {
    path: "/api/socketio",
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
      credentials: true,
    },
    transports: ["websocket", "polling"],
    allowEIO3: true,
  })

  // Socket.IO authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token
      if (!token) {
        return next(new Error("Authentication error: No token provided"))
      }

      const decoded = verifyToken(token)
      if (!decoded) {
        return next(new Error("Authentication error: Invalid token"))
      }

      socket.userId = decoded.userId
      next()
    } catch (error) {
      next(new Error("Authentication error"))
    }
  })

  io.on("connection", async (socket) => {
    console.log(`[Socket.IO] User ${socket.userId} connected`)
    console.log(`[Socket.IO] Socket ID: ${socket.id}`)

    // Fetch and store user info
    try {
      await connectDB()
      const user = await User.findById(socket.userId).select("name email avatar")
      if (user) {
        socketUsers.set(socket.id, {
          userId: socket.userId,
          name: user.name,
          email: user.email,
          avatar: user.avatar || "",
        })
      }
    } catch (error) {
      console.error("Error fetching user info:", error)
    }

    socket.on("note:join", async ({ noteId }) => {
      try {
        // Verify user has access to note
        const note = await Note.findById(noteId)
        if (!note) {
          socket.emit("error", { message: "Note not found" })
          return
        }

        // Check if user is owner or collaborator
        const isOwner = note.owner.toString() === socket.userId
        const isCollaborator = note.collaborators.some(
          (collab) => collab.user.toString() === socket.userId
        )

        if (!isOwner && !isCollaborator) {
          socket.emit("error", { message: "Access denied" })
          return
        }

        // Join the note room
        socket.join(`note:${noteId}`)

        // Add user to active users
        if (!noteRooms.has(noteId)) {
          noteRooms.set(noteId, new Set())
        }
        noteRooms.get(noteId).add(socket.userId)

        // Update note's activeUsers array
        const userIdStr = socket.userId.toString()
        if (!note.activeUsers.includes(userIdStr)) {
          note.activeUsers.push(userIdStr)
          await note.save()
        }

        // Get user info for all active users
        const activeUserIds = Array.from(noteRooms.get(noteId))
        const activeUsersInfo = []
        for (const [sockId, userInfo] of socketUsers.entries()) {
          if (activeUserIds.includes(userInfo.userId)) {
            // Check if socket is still connected and in this room
            const sock = io.sockets.sockets.get(sockId)
            if (sock && sock.rooms.has(`note:${noteId}`)) {
              activeUsersInfo.push(userInfo)
            }
          }
        }

        // Broadcast updated user list with user info
        io.to(`note:${noteId}`).emit("note:users", { users: activeUsersInfo })

        // Send current content to the new user
        socket.emit("note:content", { content: note.content })
      } catch (error) {
        console.error("Error joining note:", error)
        socket.emit("error", { message: "Failed to join note" })
      }
    })

    socket.on("note:update", async ({ noteId, content }) => {
      try {
        // Verify user has edit access
        const note = await Note.findById(noteId)
        if (!note) return

        const isOwner = note.owner.toString() === socket.userId
        const canEdit =
          isOwner ||
          note.collaborators.some(
            (collab) =>
              collab.user.toString() === socket.userId && collab.permission === "edit"
          )

        if (!canEdit) return

        // Update note content
        note.content = content
        await note.save()

        // Broadcast to all users in the room (except sender)
        socket.to(`note:${noteId}`).emit("note:content", { content })
      } catch (error) {
        console.error("Error updating note:", error)
      }
    })

    socket.on("note:typing", ({ noteId, isTyping }) => {
      try {
        const userInfo = socketUsers.get(socket.id)
        if (!userInfo) return

        if (!typingUsers.has(noteId)) {
          typingUsers.set(noteId, new Map())
        }

        if (isTyping) {
          // Clear existing timeout if any
          const existing = typingUsers.get(noteId).get(socket.userId)
          if (existing?.timeout) {
            clearTimeout(existing.timeout)
          }

          // Set new timeout to stop typing indicator after 3 seconds
          const timeout = setTimeout(() => {
            typingUsers.get(noteId).delete(socket.userId)
            if (typingUsers.get(noteId).size === 0) {
              typingUsers.delete(noteId)
            }
            socket.to(`note:${noteId}`).emit("note:typing", {
              userId: socket.userId,
              userName: userInfo.name,
              isTyping: false,
            })
          }, 3000)

          typingUsers.get(noteId).set(socket.userId, { name: userInfo.name, timeout })
          socket.to(`note:${noteId}`).emit("note:typing", {
            userId: socket.userId,
            userName: userInfo.name,
            isTyping: true,
          })
        } else {
          const existing = typingUsers.get(noteId).get(socket.userId)
          if (existing?.timeout) {
            clearTimeout(existing.timeout)
          }
          typingUsers.get(noteId).delete(socket.userId)
          if (typingUsers.get(noteId).size === 0) {
            typingUsers.delete(noteId)
          }
          socket.to(`note:${noteId}`).emit("note:typing", {
            userId: socket.userId,
            userName: userInfo.name,
            isTyping: false,
          })
        }
      } catch (error) {
        console.error("Error handling typing:", error)
      }
    })

    socket.on("note:leave", async ({ noteId }) => {
      try {
        socket.leave(`note:${noteId}`)

        // Clean up typing indicator
        if (typingUsers.has(noteId)) {
          const existing = typingUsers.get(noteId).get(socket.userId)
          if (existing?.timeout) {
            clearTimeout(existing.timeout)
          }
          typingUsers.get(noteId).delete(socket.userId)
          if (typingUsers.get(noteId).size === 0) {
            typingUsers.delete(noteId)
          }
        }

        if (noteRooms.has(noteId)) {
          noteRooms.get(noteId).delete(socket.userId)

          // Update note's activeUsers array
          const note = await Note.findById(noteId)
          if (note) {
            const userIdStr = socket.userId.toString()
            note.activeUsers = note.activeUsers.filter(
              (userId) => userId !== userIdStr
            )
            await note.save()

            // Get user info for all active users
            const activeUserIds = Array.from(noteRooms.get(noteId))
            const activeUsersInfo = []
            for (const [sockId, userInfo] of socketUsers.entries()) {
              if (activeUserIds.includes(userInfo.userId)) {
                const sock = io.sockets.sockets.get(sockId)
                if (sock && sock.rooms.has(`note:${noteId}`)) {
                  activeUsersInfo.push(userInfo)
                }
              }
            }

            // Broadcast updated user list with user info
            io.to(`note:${noteId}`).emit("note:users", { users: activeUsersInfo })
          }

          // Clean up empty rooms
          if (noteRooms.get(noteId).size === 0) {
            noteRooms.delete(noteId)
          }
        }
      } catch (error) {
        console.error("Error leaving note:", error)
      }
    })

    socket.on("disconnect", async () => {
      console.log(`User ${socket.userId} disconnected`)
      
      // Clean up typing indicators
      for (const [noteId, typingMap] of typingUsers.entries()) {
        if (typingMap.has(socket.userId)) {
          const existing = typingMap.get(socket.userId)
          if (existing?.timeout) {
            clearTimeout(existing.timeout)
          }
          typingMap.delete(socket.userId)
          if (typingMap.size === 0) {
            typingUsers.delete(noteId)
          }
        }
      }

      // Clean up socket user info
      socketUsers.delete(socket.id)

      // Clean up all rooms this user was in
      for (const [noteId, users] of noteRooms.entries()) {
        if (users.has(socket.userId)) {
          users.delete(socket.userId)
          try {
            const note = await Note.findById(noteId)
            if (note) {
              const userIdStr = socket.userId.toString()
              note.activeUsers = note.activeUsers.filter(
                (userId) => userId !== userIdStr
              )
              await note.save()
              // Get user info for all active users
              const activeUserIds = Array.from(noteRooms.get(noteId))
              const activeUsersInfo = []
              for (const [sockId, userInfo] of socketUsers.entries()) {
                if (activeUserIds.includes(userInfo.userId)) {
                  const sock = io.sockets.sockets.get(sockId)
                  if (sock && sock.rooms.has(`note:${noteId}`)) {
                    activeUsersInfo.push(userInfo)
                  }
                }
              }
              io.to(`note:${noteId}`).emit("note:users", { users: activeUsersInfo })
            }
          } catch (error) {
            console.error("Error cleaning up user:", error)
          }
        }
      }
    })
  })

  // Connect to database
  connectDB()
    .then(() => {
      console.log("Database connected")
    })
    .catch((err) => {
      console.error("Database connection error:", err)
    })

  httpServer
    .once("error", (err) => {
      console.error(err)
      process.exit(1)
    })
    .listen(port, () => {
      console.log(`> Ready on http://${hostname}:${port}`)
      console.log(`> Socket.IO server running on http://${hostname}:${port}/api/socketio`)
    })
})


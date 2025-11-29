// Socket.IO client configuration
import { io } from "socket.io-client"

let socket = null

export function getSocket() {
  if (!socket) {
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || ""
    socket = io(socketUrl, {
      path: "/api/socketio",
      addTrailingSlash: false,
    })
  }
  return socket
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}

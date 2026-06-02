import React, { createContext, useContext, useEffect, useState } from 'react'
import io from 'socket.io-client'

const SocketContext = createContext()

export const useSocket = () => {
  const context = useContext(SocketContext)
  if (!context) {
    throw new Error('useSocket must be used within SocketProvider')
  }
  return context
}

export const SocketProvider = ({ children, token, user }) => {
  const [socket, setSocket] = useState(null)
  const [onlineUsers, setOnlineUsers] = useState([])
  const [rooms, setRooms] = useState([])

  useEffect(() => {
    if (!token || !user) return

    const newSocket = io('http://localhost:5002', {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5
    })

    newSocket.on('connect', () => {
      newSocket.emit('user_online', {
        userId: user.userId,
        username: user.username
      })
    })

    newSocket.on('users_updated', (users) => {
      setOnlineUsers(users)
    })

    newSocket.on('rooms_updated', (updatedRooms) => {
      setRooms(updatedRooms)
    })

    setSocket(newSocket)

    return () => {
      newSocket.close()
    }
  }, [token, user])

  const value = {
    socket,
    onlineUsers,
    rooms,
    setRooms
  }

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  )
}

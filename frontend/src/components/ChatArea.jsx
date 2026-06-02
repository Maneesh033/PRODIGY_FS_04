import React, { useState, useEffect, useRef } from 'react'
import { useSocket } from '../context/SocketContext'

export const ChatArea = ({ currentRoom, currentUser, onSelectRoom }) => {
  const { socket, rooms } = useSocket()
  
  // Always find the latest state of the room in the reactive rooms list
  const room = rooms.find(r => r.id === currentRoom.id) || currentRoom

  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [typingUsers, setTypingUsers] = useState(new Set())
  const messagesEndRef = useRef(null)
  const typingTimeoutRef = useRef(null)

  const isCreator = room.createdBy === currentUser.userId
  const isMember = isCreator || (room.members || []).includes(currentUser.userId)
  const isPending = !isMember && (room.pendingRequests || []).some(r => r.userId === currentUser.userId)

  useEffect(() => {
    if (!socket || !currentRoom || !isMember) return

    setMessages([])
    socket.emit('get_room_messages', currentRoom.id)

    socket.on('room_messages', ({ roomId, messages: loadedMessages }) => {
      if (roomId === currentRoom.id) {
        setMessages(loadedMessages)
      }
    })

    socket.on('new_message', (message) => {
      if (message.roomId === currentRoom.id) {
        setMessages(prev => [...prev, message])
      }
    })

    socket.on('user_typing', ({ userId, username, roomId }) => {
      if (roomId === currentRoom.id) {
        setTypingUsers(prev => new Set(prev).add(username))
      }
    })

    socket.on('user_stop_typing', ({ userId, roomId }) => {
      if (roomId === currentRoom.id) {
        setTypingUsers(prev => {
          const newSet = new Set(prev)
          newSet.forEach(username => {
            if (username !== 'unknown') {
              newSet.delete(username)
            }
          })
          return newSet
        })
      }
    })

    return () => {
      socket.off('room_messages')
      socket.off('new_message')
      socket.off('user_typing')
      socket.off('user_stop_typing')
    }
  }, [socket, currentRoom, isMember])

  useEffect(() => {
    if (!socket || !currentRoom) return

    const handleRoomDeleted = ({ roomId }) => {
      if (roomId === currentRoom.id) {
        alert('This room has been deleted by the admin.')
        onSelectRoom(null)
      }
    }

    socket.on('room_deleted', handleRoomDeleted)

    return () => {
      socket.off('room_deleted', handleRoomDeleted)
    }
  }, [socket, currentRoom, onSelectRoom])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleRequestAccess = () => {
    if (socket && room) {
      socket.emit('request_to_join', {
        roomId: room.id,
        userId: currentUser.userId,
        username: currentUser.username
      })
    }
  }

  const handleAcceptUser = (targetUserId) => {
    if (socket && room) {
      socket.emit('accept_request', {
        roomId: room.id,
        targetUserId
      })
    }
  }

  const handleRejectUser = (targetUserId) => {
    if (socket && room) {
      socket.emit('reject_request', {
        roomId: room.id,
        targetUserId
      })
    }
  }

  const handleDeleteRoom = () => {
    if (!window.confirm('Are you sure you want to delete this room? This will permanently delete all messages and remove all members.')) return

    if (socket && room) {
      socket.emit('delete_room', {
        roomId: room.id,
        userId: currentUser.userId
      })
      onSelectRoom(null)
    }
  }

  const handleSendMessage = (e) => {
    e.preventDefault()
    if (!input.trim() || !socket || !currentRoom || !isMember) return

    socket.emit('send_message', {
      roomId: currentRoom.id,
      userId: currentUser.userId,
      username: currentUser.username,
      text: input,
      timestamp: new Date()
    })

    socket.emit('stop_typing', {
      roomId: currentRoom.id,
      userId: currentUser.userId
    })

    setInput('')
  }

  const handleInputChange = (e) => {
    setInput(e.target.value)

    if (!socket || !currentRoom || !isMember) return

    socket.emit('typing', {
      roomId: currentRoom.id,
      userId: currentUser.userId,
      username: currentUser.username
    })

    clearTimeout(typingTimeoutRef.current)
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('stop_typing', {
        roomId: currentRoom.id,
        userId: currentUser.userId
      })
    }, 1000)
  }

  // --- ACCESS CONTROL: CONDITIONAL RENDER FOR LOCKED / PENDING SCREENS ---
  if (!isMember) {
    return (
      <div className="chat-area welcome-screen" style={{ flexDirection: 'column', background: '#f8fafc' }}>
        <div style={{
          textAlign: 'center',
          padding: '3rem 2rem',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1.5rem',
          background: 'white',
          borderRadius: '16px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
          border: '1px solid #e2e8f0',
          maxWidth: '440px',
          width: '90%'
        }}>
          <div style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            background: isPending ? 'rgba(245, 158, 11, 0.08)' : 'rgba(99, 102, 241, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '2.5rem',
          }}>
            {isPending ? '⏳' : '🔒'}
          </div>
          <h2 style={{ fontSize: '1.5rem', color: '#0f172a', fontWeight: 700 }}>
            {room.roomName}
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.95rem', lineHeight: '1.6' }}>
            {isPending
              ? "Your request to join this private room is pending approval from the group owner."
              : "This room is private. You must request access from the group owner to view messages and chat."}
          </p>
          {isPending ? (
            <div style={{
              padding: '0.75rem 1.5rem',
              background: '#fef3c7',
              border: '1px solid #fde68a',
              borderRadius: '12px',
              fontSize: '0.9rem',
              color: '#d97706',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <span>⏳ Request Pending Approval</span>
            </div>
          ) : (
            <button
              onClick={handleRequestAccess}
              style={{
                padding: '0.85rem 2rem',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                color: 'white',
                border: 'none',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(79, 70, 229, 0.25)',
                transition: 'transform 0.15s ease'
              }}
              onMouseEnter={(e) => e.target.style.transform = 'translateY(-1px)'}
              onMouseLeave={(e) => e.target.style.transform = 'none'}
            >
              Request Access
            </button>
          )}
        </div>
      </div>
    )
  }

  // --- MEMBER CHAT SCREEN ---
  return (
    <div className="chat-area">
      <div className="chat-header">
        <div>
          <h2>{room.roomName}</h2>
          <span style={{ fontSize: '0.85rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            👤 {room.members?.length || 1} members 
            {isCreator && <span style={{ color: '#4f46e5', fontWeight: 600 }}>• Admin</span>}
          </span>
        </div>
        {isCreator && (
          <button
            onClick={handleDeleteRoom}
            style={{
              padding: '0.5rem 1rem',
              background: 'rgba(239, 68, 68, 0.08)',
              color: '#ef4444',
              border: '1px solid rgba(239, 68, 68, 0.15)',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '0.8rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = '#ef4444'
              e.target.style.color = 'white'
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'rgba(239, 68, 68, 0.08)'
              e.target.style.color = '#ef4444'
            }}
          >
            Delete Room
          </button>
        )}
      </div>

      {/* ADMIN PANEL: PENDING REQUESTS */}
      {isCreator && (room.pendingRequests || []).length > 0 && (
        <div style={{
          margin: '1rem 1.5rem 0 1.5rem',
          padding: '1rem 1.25rem',
          background: '#fffbeb',
          border: '1px solid #fef3c7',
          borderRadius: '12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
          boxShadow: '0 2px 6px rgba(245, 158, 11, 0.05)'
        }}>
          <h4 style={{ color: '#b45309', fontSize: '0.85rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
            <span>🔔</span> Join Requests ({(room.pendingRequests || []).length})
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {(room.pendingRequests || []).map(req => (
              <div
                key={req.userId}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: 'white',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '8px',
                  border: '1px solid rgba(245, 158, 11, 0.15)'
                }}
              >
                <span style={{ fontSize: '0.85rem', color: '#1e293b', fontWeight: 600 }}>{req.username}</span>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  <button
                    onClick={() => handleAcceptUser(req.userId)}
                    style={{
                      padding: '0.3rem 0.6rem',
                      background: '#10b981',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => handleRejectUser(req.userId)}
                    style={{
                      padding: '0.3rem 0.6rem',
                      background: '#ef4444',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="messages-container">
        {messages.map(msg => (
          <div
            key={msg.id}
            className={`message ${msg.userId === currentUser.userId ? 'own' : ''}`}
          >
            <div className="message-avatar">
              {msg.username[0].toUpperCase()}
            </div>
            <div className="message-content">
              <div className="message-bubble">
                {msg.text}
              </div>
              <div className="message-info">
                <strong>{msg.username}</strong>
                <span>•</span>
                <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </div>
          </div>
        ))}

        {typingUsers.size > 0 && (
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
              {Array.from(typingUsers).join(', ')} {typingUsers.size === 1 ? 'is' : 'are'} typing
            </span>
            <div className="typing-indicator">
              <div className="typing-dot"></div>
              <div className="typing-dot"></div>
              <div className="typing-dot"></div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <form className="input-area" onSubmit={handleSendMessage}>
        <input
          type="text"
          value={input}
          onChange={handleInputChange}
          placeholder="Type a message..."
        />
        <button type="submit">Send</button>
      </form>
    </div>
  )
}

import React, { useState, useEffect } from 'react'
import { useSocket } from '../context/SocketContext'

export const Sidebar = ({ onSelectRoom, currentRoom, currentUser }) => {
  const { socket, onlineUsers, rooms, setRooms } = useSocket()
  const [newRoomName, setNewRoomName] = useState('')

  const handleCreateRoom = (e) => {
    e.preventDefault()
    if (!newRoomName.trim() || !socket) return

    const roomData = {
      roomName: newRoomName,
      createdBy: currentUser.userId,
      createdByUsername: currentUser.username
    }

    socket.emit('create_room', roomData)
    setNewRoomName('')
  }

  const handleJoinRoom = (room) => {
    if (!socket) return

    if (currentRoom && currentRoom.id !== room.id) {
      const isCurrentRoomMember = currentRoom.createdBy === currentUser.userId || (currentRoom.members || []).includes(currentUser.userId)
      if (isCurrentRoomMember) {
        socket.emit('leave_room', {
          roomId: currentRoom.id,
          userId: currentUser.userId
        })
      }
    }

    const isMember = room.createdBy === currentUser.userId || (room.members || []).includes(currentUser.userId)

    if (isMember) {
      socket.emit('join_room', {
        roomId: room.id,
        userId: currentUser.userId
      })
    }

    onSelectRoom(room)
  }

  useEffect(() => {
    if (!socket) return

    const handleRoomCreated = (room) => {
      if (room.createdBy === currentUser.userId) {
        handleJoinRoom(room)
      }
    }

    socket.on('room_created', handleRoomCreated)

    return () => {
      socket.off('room_created', handleRoomCreated)
    }
  }, [socket, currentUser, currentRoom])

  useEffect(() => {
    if (!socket) return

    const handleRequestAccepted = ({ roomId, userId }) => {
      if (userId === currentUser.userId) {
        if (currentRoom && currentRoom.id === roomId) {
          socket.emit('join_room', {
            roomId: roomId,
            userId: currentUser.userId
          })
        }
      }
    }

    socket.on('request_accepted', handleRequestAccepted)

    return () => {
      socket.off('request_accepted', handleRequestAccepted)
    }
  }, [socket, currentUser, currentRoom])

  return (
    <div className="sidebar">
      <div style={{ flex: 1, overflow: 'auto' }}>
        <div className="sidebar-section">
          <h3>Chat Rooms</h3>
          <form className="room-creation" onSubmit={handleCreateRoom}>
            <input
              type="text"
              value={newRoomName}
              onChange={(e) => setNewRoomName(e.target.value)}
              placeholder="New room..."
            />
            <button type="submit">+</button>
          </form>
          <ul className="room-list">
            {rooms.map(room => {
              const isCreator = room.createdBy === currentUser.userId;
              const isMember = isCreator || (room.members || []).includes(currentUser.userId);
              const isPending = !isMember && (room.pendingRequests || []).some(r => r.userId === currentUser.userId);

              return (
                <li
                  key={room.id}
                  className={`room-item ${currentRoom?.id === room.id ? 'active' : ''}`}
                  onClick={() => handleJoinRoom(room)}
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: '1rem', flexShrink: 0 }}>
                      {isMember ? '🏠' : isPending ? '⏳' : '🔒'}
                    </span>
                    <span style={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      flex: 1
                    }}>
                      {room.roomName}
                    </span>
                  </div>
                  {!isMember && (
                    <span style={{
                      fontSize: '0.65rem',
                      padding: '0.15rem 0.4rem',
                      borderRadius: '4px',
                      background: isPending ? 'rgba(245, 158, 11, 0.15)' : 'rgba(100, 116, 139, 0.15)',
                      color: isPending ? '#d97706' : '#475569',
                      fontWeight: 600,
                      flexShrink: 0,
                      marginLeft: '0.5rem'
                    }}>
                      {isPending ? 'Pending' : 'Request'}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>

        <div className="sidebar-section">
          <h3>Online Users ({onlineUsers.length})</h3>
          <ul className="user-list">
            {onlineUsers.map(user => (
              <li
                key={user.socketId}
                className={`user-item ${currentUser?.userId === user.userId ? 'active' : ''}`}
              >
                <div className={`status-indicator ${user.status === 'online' ? '' : 'offline'}`}></div>
                <span>{user.username}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div style={{ padding: '1rem', borderTop: '1px solid #e0e0e0', fontSize: '0.85rem', color: '#999' }}>
        Logged in as:<br />
        <strong style={{ color: '#333' }}>{currentUser?.username}</strong>
      </div>
    </div>
  )
}

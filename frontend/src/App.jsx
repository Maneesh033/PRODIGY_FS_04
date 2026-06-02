import React, { useState, useEffect } from 'react'
import { AuthPage } from './components/AuthPage'
import { ChatArea } from './components/ChatArea'
import { Sidebar } from './components/Sidebar'
import { SocketProvider } from './context/SocketContext'

function App() {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(null)
  const [currentRoom, setCurrentRoom] = useState(null)

  useEffect(() => {
    const storedToken = localStorage.getItem('token')
    const storedUser = localStorage.getItem('user')
    if (storedToken && storedUser) {
      setToken(storedToken)
      setUser(JSON.parse(storedUser))
    }
  }, [])

  const handleLogin = (userData, authToken) => {
    setUser(userData)
    setToken(authToken)
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
    setToken(null)
    setCurrentRoom(null)
  }

  if (!user || !token) {
    return <AuthPage onLogin={handleLogin} />
  }

  return (
    <SocketProvider token={token} user={user}>
      <div className="container">
        <div className="header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h1>💬 Real-Time Chat App</h1>
              <p>Connect with others instantly</p>
            </div>
            <button
              onClick={handleLogout}
              style={{
                padding: '0.5rem 1rem',
                background: 'rgba(255, 255, 255, 0.2)',
                color: 'white',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                borderRadius: '4px',
                cursor: 'pointer',
                transition: 'background 0.2s'
              }}
              onMouseEnter={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.3)'}
              onMouseLeave={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.2)'}
            >
              Logout
            </button>
          </div>
        </div>

        <div className="main-content">
          <Sidebar
            onSelectRoom={setCurrentRoom}
            currentRoom={currentRoom}
            currentUser={user}
          />

          {currentRoom ? (
            <ChatArea
              currentRoom={currentRoom}
              currentUser={user}
              onSelectRoom={setCurrentRoom}
            />
          ) : (
            <div className="chat-area welcome-screen">
              <div>
                👋 Select a room or create a new one to start chatting!
              </div>
            </div>
          )}
        </div>
      </div>
    </SocketProvider>
  )
}

export default App

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
require('dotenv').config();

const initializeDatabase = require('./config/init-db');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const { verifyToken } = require('./middleware/auth');
const Message = require('./models/Message');
const ChatRoom = require('./models/ChatRoom');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
});

let dbReady = false;

initializeDatabase().then(success => {
  dbReady = success;
});

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/users', verifyToken, userRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'Server running', database: dbReady ? 'connected' : 'initializing' });
});

const PORT = process.env.PORT || 5002;

let onlineUsers = new Map();
let userSockets = new Map();

const emitOnlineUsers = () => {
  io.emit('users_updated', Array.from(onlineUsers.values()));
};

const emitRooms = async () => {
  try {
    if (dbReady) {
      const rooms = await ChatRoom.findAll({
        attributes: ['id', 'roomName', 'createdBy', 'members', 'createdAt']
      });
      io.emit('rooms_updated', rooms);
    }
  } catch (error) {
    console.log('Error fetching rooms');
  }
};

io.on('connection', (socket) => {
  socket.on('user_online', async (userData) => {
    onlineUsers.set(socket.id, {
      socketId: socket.id,
      userId: userData.userId,
      username: userData.username,
      status: 'online',
      joinedAt: new Date()
    });
    userSockets.set(userData.userId, socket.id);
    emitOnlineUsers();
    await emitRooms();
  });

  socket.on('create_room', async (roomData) => {
    try {
      if (!dbReady) return;

      const { roomName, createdBy, createdByUsername } = roomData;

      const room = await ChatRoom.create({
        roomName,
        createdBy,
        createdByUsername,
        members: [createdBy]
      });

      socket.join(room.id);
      socket.emit('room_created', room);
      emitRooms();
    } catch (error) {
      socket.emit('error', { message: 'Failed to create room' });
    }
  });

  socket.on('join_room', async (roomData) => {
    try {
      if (!dbReady) return;

      const { roomId, userId } = roomData;
      const room = await ChatRoom.findByPk(roomId);
      if (room) {
        const members = room.members || [];
        // Only allow joining socket room if user is the creator or already a member
        if (room.createdBy === userId || members.includes(userId)) {
          socket.join(roomId);

          io.to(roomId).emit('user_joined', {
            userId,
            roomId,
            members
          });
        } else {
          socket.emit('error', { message: 'Access denied: You are not a member of this room' });
        }
      }
    } catch (error) {
      socket.emit('error', { message: 'Failed to join room' });
    }
  });

  socket.on('leave_room', async (roomData) => {
    try {
      if (!dbReady) return;

      const { roomId, userId } = roomData;
      socket.leave(roomId);

      const room = await ChatRoom.findByPk(roomId);
      if (room) {
        const members = room.members || [];
        io.to(roomId).emit('user_left', {
          userId,
          roomId,
          members
        });
      }
    } catch (error) {
      socket.emit('error', { message: 'Failed to leave room' });
    }
  });

  socket.on('request_to_join', async (requestData) => {
    try {
      if (!dbReady) return;

      const { roomId, userId, username } = requestData;
      const room = await ChatRoom.findByPk(roomId);
      if (room) {
        const pendingRequests = room.pendingRequests || [];
        // Check if already requested
        if (!pendingRequests.some(r => r.userId === userId)) {
          pendingRequests.push({ userId, username });
          await room.update({ pendingRequests });
          emitRooms();
        }
      }
    } catch (error) {
      socket.emit('error', { message: 'Failed to send request' });
    }
  });

  socket.on('accept_request', async (requestData) => {
    try {
      if (!dbReady) return;

      const { roomId, targetUserId } = requestData;
      const room = await ChatRoom.findByPk(roomId);
      if (room) {
        let pendingRequests = room.pendingRequests || [];
        let members = room.members || [];

        // Remove from pending
        pendingRequests = pendingRequests.filter(r => r.userId !== targetUserId);

        // Add to members
        if (!members.includes(targetUserId)) {
          members.push(targetUserId);
        }

        await room.update({ pendingRequests, members });
        emitRooms();

        // Broadcast to let the user know they were accepted
        io.emit('request_accepted', { roomId, userId: targetUserId });
      }
    } catch (error) {
      socket.emit('error', { message: 'Failed to accept request' });
    }
  });

  socket.on('reject_request', async (requestData) => {
    try {
      if (!dbReady) return;

      const { roomId, targetUserId } = requestData;
      const room = await ChatRoom.findByPk(roomId);
      if (room) {
        let pendingRequests = room.pendingRequests || [];
        pendingRequests = pendingRequests.filter(r => r.userId !== targetUserId);

        await room.update({ pendingRequests });
        emitRooms();
      }
    } catch (error) {
      socket.emit('error', { message: 'Failed to reject request' });
    }
  });

  socket.on('delete_room', async (roomData) => {
    try {
      if (!dbReady) return;

      const { roomId, userId } = roomData;
      const room = await ChatRoom.findByPk(roomId);
      
      // Only the creator can delete the room
      if (room && room.createdBy === userId) {
        await Message.destroy({ where: { roomId } });
        await room.destroy();
        
        io.to(roomId).emit('room_deleted', { roomId });
        emitRooms();
      }
    } catch (error) {
      socket.emit('error', { message: 'Failed to delete room' });
    }
  });

  socket.on('send_message', async (messageData) => {
    try {
      if (!dbReady) return;

      const { roomId, userId, username, text, timestamp } = messageData;

      const message = await Message.create({
        roomId,
        userId,
        username,
        text,
        timestamp
      });

      io.to(roomId).emit('new_message', {
        id: message.id,
        userId,
        username,
        text,
        timestamp,
        roomId
      });
    } catch (error) {
      socket.emit('error', { message: 'Failed to send message' });
    }
  });

  socket.on('get_room_messages', async (roomId) => {
    try {
      if (!dbReady) {
        socket.emit('room_messages', { roomId, messages: [] });
        return;
      }

      const messages = await Message.findAll({
        where: { roomId },
        order: [['timestamp', 'ASC']],
        limit: 50,
        attributes: ['id', 'userId', 'username', 'text', 'timestamp', 'roomId']
      });

      const formattedMessages = messages.map(msg => ({
        id: msg.id,
        userId: msg.userId,
        username: msg.username,
        text: msg.text,
        timestamp: msg.timestamp,
        roomId: msg.roomId
      }));

      socket.emit('room_messages', { roomId, messages: formattedMessages });
    } catch (error) {
      socket.emit('error', { message: 'Failed to fetch messages' });
    }
  });

  socket.on('typing', (typingData) => {
    const { roomId, userId, username } = typingData;
    if (roomId) {
      socket.to(roomId).emit('user_typing', { userId, username, roomId });
    }
  });

  socket.on('stop_typing', (typingData) => {
    const { roomId, userId } = typingData;
    if (roomId) {
      socket.to(roomId).emit('user_stop_typing', { userId, roomId });
    }
  });

  socket.on('disconnect', () => {
    const user = onlineUsers.get(socket.id);
    if (user) {
      onlineUsers.delete(socket.id);
      userSockets.delete(user.userId);
      emitOnlineUsers();
    }
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📍 http://localhost:${PORT}`);
});


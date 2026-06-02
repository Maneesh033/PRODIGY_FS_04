const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ChatRoom = sequelize.define('ChatRoom', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  roomName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  createdBy: DataTypes.STRING,
  createdByUsername: DataTypes.STRING,
  members: {
    type: DataTypes.JSON,
    defaultValue: []
  },
  pendingRequests: {
    type: DataTypes.JSON,
    defaultValue: []
  }
}, {
  timestamps: true
});

module.exports = ChatRoom;

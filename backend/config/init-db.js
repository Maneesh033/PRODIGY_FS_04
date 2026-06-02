const database  = require('./database');
const ChatRoom = require('../models/ChatRoom');
const User = require('../models/User');
const Message = require('../models/Message');

const initializeDatabase = async () => {
  try {
    await database.authenticate();
    console.log('✅ Database connection established');

    await database.sync({ alter: true });
    console.log('✅ Database tables synced');

    return true;
  } catch (error) {
    console.error('❌ Database initialization failed:', error.message);
    return false;
  }
};

module.exports = initializeDatabase;

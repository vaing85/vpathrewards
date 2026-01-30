const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const socketIo = require('socket.io');

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Performance monitoring middleware (must be before routes)
const { trackApiPerformance } = require('./middleware/performanceMonitor');
app.use(trackApiPerformance);

// Error logging middleware (must be before routes)
const { errorHandler } = require('./middleware/errorLogger');

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/games', require('./routes/games'));
app.use('/api/games', require('./routes/games-extended'));
app.use('/api/users', require('./routes/users'));
app.use('/api/transactions', require('./routes/transactions'));
app.use('/api/leaderboard', require('./routes/leaderboard'));
app.use('/api/notifications', require('./routes/notifications').router);
app.use('/api/bonuses', require('./routes/bonuses'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/admin', require('./routes/admin-transactions'));
app.use('/api/admin', require('./routes/admin-promotions'));
app.use('/api/admin/analytics', require('./routes/analytics'));
app.use('/api/achievements', require('./routes/achievements').router);
app.use('/api/performance', require('./routes/performance'));
app.use('/api/admin/activity', require('./routes/user-activity'));
app.use('/api/tournaments', require('./routes/tournaments'));

// Error handling middleware (must be after all routes)
app.use(errorHandler);

// Socket.io for real-time games
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  socket.on('join-game', (gameId) => {
    socket.join(gameId);
  });
  
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// MongoDB connection with retry logic
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/casino';
const MAX_RETRIES = 5;
const RETRY_DELAY = 5000; // 5 seconds

const connectWithRetry = async (retries = MAX_RETRIES) => {
  try {
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    console.log('MongoDB connected successfully');
    
    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err);
    });
    
    mongoose.connection.on('disconnected', () => {
      console.warn('MongoDB disconnected. Attempting to reconnect...');
      if (retries > 0) {
        setTimeout(() => connectWithRetry(retries - 1), RETRY_DELAY);
      }
    });
    
    mongoose.connection.on('reconnected', () => {
      console.log('MongoDB reconnected');
    });
  } catch (err) {
    console.error(`MongoDB connection error (${MAX_RETRIES - retries + 1}/${MAX_RETRIES}):`, err.message);
    
    if (retries > 0) {
      console.log(`Retrying connection in ${RETRY_DELAY / 1000} seconds...`);
      setTimeout(() => connectWithRetry(retries - 1), RETRY_DELAY);
    } else {
      console.error('Failed to connect to MongoDB after all retries. Exiting...');
      if (process.env.NODE_ENV === 'production') {
        process.exit(1);
      } else {
        console.warn('Continuing in development mode without database connection.');
      }
    }
  }
};

connectWithRetry();

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = { app, io };


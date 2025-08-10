require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { Server } = require('socket.io');
const http = require('http');
const messageRoutes = require('./routes/messageRoutes');

const app = express();
const server = http.createServer(app);

// Socket.io setup
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000"
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Atlas connection to "whatsapp" DB
mongoose.connect(`${process.env.MONGO_URI}/whatsapp`)
  .then(() => console.log('✅ Connected to MongoDB Atlas'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// Routes
app.use('/api/messages', messageRoutes(io));

// Socket.io connection
io.on('connection', (socket) => {
  console.log('🔌 New client connected');
  socket.on('disconnect', () => console.log('❌ Client disconnected'));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));

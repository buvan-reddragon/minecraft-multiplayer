// server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);

// Enable Socket.IO with permissive CORS for production/Render
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Serve static files from the public folder
app.use(express.static(path.join(__dirname, 'public')));

// Store connected players
const players = {};

io.on('connection', (socket) => {
  console.log(`Player connected: ${socket.id}`);

  // Initialize new player
  players[socket.id] = {
    id: socket.id,
    x: 0,
    y: 0,
    z: 0,
    rotation: 0
  };

  // Broadcast current players to the new player
  socket.emit('currentPlayers', players);

  // Broadcast new player to all other players
  socket.broadcast.emit('newPlayer', players[socket.id]);

  // Handle player movement
  socket.on('playerMovement', (movementData) => {
    if (players[socket.id]) {
      players[socket.id].x = movementData.x;
      players[socket.id].y = movementData.y;
      players[socket.id].z = movementData.z;
      players[socket.id].rotation = movementData.rotation;
      socket.broadcast.emit('playerMoved', players[socket.id]);
    }
  });

  // Handle live chat
  socket.on('chatMessage', (data) => {
    io.emit('receiveMessage', {
      sender: `Knight_${socket.id.substring(0, 4)}`,
      text: data.text
    });
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log(`Player disconnected: ${socket.id}`);
    delete players[socket.id];
    io.emit('playerDisconnected', socket.id);
  });
});

// Render dynamic port binding
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Arcadia of Knight server running on port ${PORT}`);
});
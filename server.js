// server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.use(express.static(path.join(__dirname, 'public')));

const players = {};

io.on('connection', (socket) => {
  console.log(`Player connected: ${socket.id}`);

  // Create default player state
  players[socket.id] = {
    id: socket.id,
    name: `Knight_${socket.id.substring(0, 4)}`,
    x: 0,
    y: 0,
    z: 0,
    rotation: 0
  };

  // Send existing players to new connection
  socket.emit('currentPlayers', players);
  socket.broadcast.emit('newPlayer', players[socket.id]);

  // Handle position updates
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
      sender: players[socket.id]?.name || 'Knight',
      text: data.text
    });
  });

  socket.on('disconnect', () => {
    console.log(`Player disconnected: ${socket.id}`);
    delete players[socket.id];
    io.emit('playerDisconnected', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Arcadia of knight server running on port ${PORT}`);
});
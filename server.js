// server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

app.use(express.static(path.join(__dirname, 'public')));

const players = {};

io.on('connection', (socket) => {
  console.log(`Player connected: ${socket.id}`);

  // 1. Join game with chosen username
  socket.on('joinGame', (username) => {
    players[socket.id] = {
      id: socket.id,
      name: username || `Knight_${socket.id.substring(0, 4)}`,
      x: (Math.random() - 0.5) * 20,
      y: 0,
      z: (Math.random() - 0.5) * 20,
      rotation: 0,
      isMoving: false
    };

    // Send existing players to caller
    socket.emit('currentPlayers', players);
    // Broadcast new player to others
    socket.broadcast.emit('newPlayer', players[socket.id]);
  });

  // 2. Relay player position and movement
  socket.on('playerMovement', (movementData) => {
    if (players[socket.id]) {
      players[socket.id].x = movementData.x;
      players[socket.id].y = movementData.y;
      players[socket.id].z = movementData.z;
      players[socket.id].rotation = movementData.rotation;
      players[socket.id].isMoving = movementData.isMoving;
      socket.broadcast.emit('playerMoved', players[socket.id]);
    }
  });

  // 3. Relay live chat
  socket.on('chatMessage', (data) => {
    const senderName = players[socket.id] ? players[socket.id].name : 'Knight';
    io.emit('receiveMessage', { sender: senderName, text: data.text });
  });

  // 4. Handle player exit
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
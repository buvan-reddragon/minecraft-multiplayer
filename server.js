const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

app.use(express.static(path.join(__dirname, 'public')));

const players = {};

io.on('connection', (socket) => {
  console.log('Player connected:', socket.id);

  // Initialize new player in global room
  players[socket.id] = {
    id: socket.id,
    x: 0,
    y: 1.6,
    z: 0
  };

  // Send current players list to new connection
  socket.emit('currentPlayers', players);

  // Broadcast new player to all other connected players
  socket.broadcast.emit('newPlayer', players[socket.id]);

  // Movement handler
  socket.on('playerMovement', (movementData) => {
    if (players[socket.id]) {
      players[socket.id].x = movementData.x;
      players[socket.id].y = movementData.y;
      players[socket.id].z = movementData.z;
      socket.broadcast.emit('playerMoved', players[socket.id]);
    }
  });

  // Global Chat Handler
  socket.on('chatMessage', (msg) => {
    io.emit('chatMessage', { id: socket.id, text: msg });
  });

  // Weapon Firing Handler
  socket.on('playerShot', (shotData) => {
    socket.broadcast.emit('playerShot', { id: socket.id, ...shotData });
  });

  // Disconnect Handler
  socket.on('disconnect', () => {
    console.log('Player disconnected:', socket.id);
    delete players[socket.id];
    io.emit('playerDisconnected', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
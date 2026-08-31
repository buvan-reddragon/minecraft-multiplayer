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
  socket.on('joinGame', (username) => {
    players[socket.id] = {
      id: socket.id,
      name: username || `Knight_${socket.id.substring(0, 4)}`,
      x: (Math.random() - 0.5) * 6,
      y: 0,
      z: (Math.random() - 0.5) * 6,
      rotation: 0,
      isMoving: false,
      health: 5,
      weapon: 'sword'
    };

    socket.emit('currentPlayers', players);
    socket.broadcast.emit('newPlayer', players[socket.id]);
  });

  socket.on('playerMovement', (data) => {
    if (players[socket.id]) {
      Object.assign(players[socket.id], data);
      socket.broadcast.emit('playerMoved', players[socket.id]);
    }
  });

  socket.on('playerAttack', (attackData) => {
    socket.broadcast.emit('remoteAttack', { id: socket.id, ...attackData });
  });

  socket.on('playerHit', (targetId) => {
    if (players[targetId]) {
      players[targetId].health -= 1;
      if (players[targetId].health <= 0) {
        // Player dies -> trigger respawn
        players[targetId].health = 5;
        players[targetId].x = (Math.random() - 0.5) * 6;
        players[targetId].y = 0;
        players[targetId].z = (Math.random() - 0.5) * 6;
        io.emit('playerRespawned', players[targetId]);
      } else {
        io.emit('healthUpdate', { id: targetId, health: players[targetId].health });
      }
    }
  });

  socket.on('chatMessage', (data) => {
    const senderName = players[socket.id] ? players[socket.id].name : 'Knight';
    io.emit('receiveMessage', { sender: senderName, text: data.text });
  });

  socket.on('disconnect', () => {
    delete players[socket.id];
    io.emit('playerDisconnected', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
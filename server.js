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
      y: 45, // Spawn high up in middle of Sky Wormhole
      z: (Math.random() - 0.5) * 6,
      rotation: 0,
      health: 100
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

  socket.on('playerDamage', (amount) => {
    if (players[socket.id]) {
      players[socket.id].health = Math.max(0, players[socket.id].health - amount);
      if (players[socket.id].health <= 0) {
        players[socket.id].health = 100;
        players[socket.id].x = (Math.random() - 0.5) * 6;
        players[socket.id].y = 45; // Respawn falling from Sky Wormhole
        players[socket.id].z = (Math.random() - 0.5) * 6;
        io.emit('playerRespawned', players[socket.id]);
      } else {
        socket.emit('healthUpdate', { id: socket.id, health: players[socket.id].health });
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
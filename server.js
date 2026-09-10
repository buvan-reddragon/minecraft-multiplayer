// server.js
const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.use(express.static('public'));

const players = {};

io.on('connection', (socket) => {
  console.log('Player connected:', socket.id);

  players[socket.id] = {
    id: socket.id,
    x: 96,
    y: 96,
    rotation: 0,
    name: 'Soldier',
    isLocked: false
  };

  socket.emit('currentPlayers', players);
  socket.broadcast.emit('newPlayer', players[socket.id]);

  socket.on('joinGame', (name) => {
    if (players[socket.id]) {
      players[socket.id].name = name;
      io.emit('currentPlayers', players);
    }
  });

  socket.on('playerMovement', (movementData) => {
    if (players[socket.id]) {
      players[socket.id].x = movementData.x;
      players[socket.id].y = movementData.y;
      players[socket.id].rotation = movementData.rotation;
      socket.broadcast.emit('playerMoved', players[socket.id]);
    }
  });

  socket.on('fireBullet', (bulletData) => {
    socket.broadcast.emit('bulletFired', bulletData);
  });

  // Cell Lock Sync Event
  socket.on('playerLocked', (data) => {
    if (players[data.targetId]) {
      players[data.targetId].isLocked = true;
    }
    io.emit('playerLocked', data);
  });

  // Cell Unlock Sync Event
  socket.on('playerUnlocked', (data) => {
    if (players[data.targetId]) {
      players[data.targetId].isLocked = false;
    }
    io.emit('playerUnlocked', data);
  });

  // Fixed Chat Broadcast Event
  socket.on('chatMessage', (msg) => {
    const senderName = players[socket.id] ? players[socket.id].name : 'Soldier';
    io.emit('chatMessage', { name: senderName, msg: msg });
  });

  socket.on('disconnect', () => {
    delete players[socket.id];
    io.emit('playerDisconnected', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
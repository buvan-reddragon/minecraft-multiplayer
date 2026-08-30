const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.static(path.join(__dirname, 'public')));

const players = {};

io.on('connection', (socket) => {
  console.log('Player connected:', socket.id);

  players[socket.id] = {
    id: socket.id,
    name: 'Player',
    x: 0,
    y: 1.6,
    z: 0,
    rotationY: 0,
    inCar: false,
    carId: null,
    isMoving: false
  };

  socket.on('joinGame', (name) => {
    if (players[socket.id]) {
      players[socket.id].name = name || `Player_${socket.id.substring(0, 4)}`;
    }
    socket.emit('currentPlayers', players);
    socket.broadcast.emit('newPlayer', players[socket.id]);
  });

  socket.on('playerMovement', (data) => {
    if (players[socket.id]) {
      Object.assign(players[socket.id], data);
      socket.broadcast.emit('playerMoved', players[socket.id]);
    }
  });

  socket.on('chatMessage', (msg) => {
    const senderName = players[socket.id] ? players[socket.id].name : 'Player';
    io.emit('chatMessage', { name: senderName, text: msg });
  });

  socket.on('playerShot', (shotData) => {
    socket.broadcast.emit('playerShot', { id: socket.id, ...shotData });
  });

  socket.on('disconnect', () => {
    delete players[socket.id];
    io.emit('playerDisconnected', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
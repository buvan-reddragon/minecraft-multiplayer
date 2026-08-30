const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.static(path.join(__dirname, 'public')));

const players = {};
const carsState = {
  0: { driver: null },
  1: { driver: null }
};

io.on('connection', (socket) => {
  players[socket.id] = {
    id: socket.id,
    name: 'Player',
    x: 0,
    y: 1.6,
    z: 0,
    rotationY: 0,
    inCar: false,
    carId: null,
    isDriver: false,
    isMoving: false,
    emote: null
  };

  socket.on('joinGame', (name) => {
    if (players[socket.id]) {
      players[socket.id].name = name || `Player_${socket.id.substring(0, 4)}`;
    }
    socket.emit('currentPlayers', players);
    socket.broadcast.emit('newPlayer', players[socket.id]);
  });

  socket.on('requestCarEntry', (carId) => {
    if (carsState[carId]) {
      const isDriver = (carsState[carId].driver === null);
      if (isDriver) {
        carsState[carId].driver = socket.id;
      }
      socket.emit('carEntryResult', { carId, isDriver, success: true });
    }
  });

  socket.on('leaveCar', (carId) => {
    if (carsState[carId] && carsState[carId].driver === socket.id) {
      carsState[carId].driver = null;
    }
  });

  socket.on('playerMovement', (data) => {
    if (players[socket.id]) {
      Object.assign(players[socket.id], data);
      socket.broadcast.emit('playerMoved', players[socket.id]);
    }
  });

  socket.on('playEmote', (emoteName) => {
    if (players[socket.id]) {
      players[socket.id].emote = emoteName;
      io.emit('playerEmote', { id: socket.id, emote: emoteName });
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
    Object.keys(carsState).forEach(cId => {
      if (carsState[cId].driver === socket.id) carsState[cId].driver = null;
    });
    delete players[socket.id];
    io.emit('playerDisconnected', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
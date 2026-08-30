const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve files from the /public folder
app.use(express.static('public'));

// Track player states across 4 rooms
const players = {};

io.on('connection', (socket) => {
  console.log(`Player connected: ${socket.id}`);

  // Set default room on join
  let currentRoom = 'room-1';
  socket.join(currentRoom);

  players[socket.id] = {
    x: 0,
    y: 2,
    z: 0,
    room: currentRoom,
    color: Math.floor(Math.random() * 16777215)
  };

  // Send initial room players to new player
  socket.emit('currentPlayers', getPlayersInRoom(currentRoom));
  
  // Notify others in room 1 about new player
  socket.to(currentRoom).emit('newPlayer', { id: socket.id, player: players[socket.id] });

  // Handle Switching Rooms
  socket.on('switchRoom', (newRoom) => {
    socket.leave(currentRoom);
    socket.to(currentRoom).emit('playerDisconnected', socket.id);

    currentRoom = newRoom;
    socket.join(currentRoom);
    players[socket.id].room = currentRoom;

    socket.emit('currentPlayers', getPlayersInRoom(currentRoom));
    socket.to(currentRoom).emit('newPlayer', { id: socket.id, player: players[socket.id] });
  });

  // Sync Player Movement
  socket.on('playerMovement', (pos) => {
    if (players[socket.id]) {
      players[socket.id].x = pos.x;
      players[socket.id].y = pos.y;
      players[socket.id].z = pos.z;
      socket.to(currentRoom).emit('playerMoved', { id: socket.id, position: pos });
    }
  });

  // Room Isolated Chat
  socket.on('roomChat', (text) => {
    io.to(currentRoom).emit('chatMessage', { id: socket.id.substring(0, 4), text: text });
  });

  // Handle Disconnect
  socket.on('disconnect', () => {
    console.log(`Player disconnected: ${socket.id}`);
    socket.to(currentRoom).emit('playerDisconnected', socket.id);
    delete players[socket.id];
  });
});

function getPlayersInRoom(roomName) {
  const roomPlayers = {};
  for (const id in players) {
    if (players[id].room === roomName) {
      roomPlayers[id] = players[id];
    }
  }
  return roomPlayers;
}

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Server is live at http://localhost:${PORT}`);
});
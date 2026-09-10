// client.js - 2D GTA 1 Top-Down Multiplayer Engine
const socket = io();
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// --- 1. Maze Layout & Tile Map ---
const TILE_SIZE = 64;
const MAP_COLS = 25;
const MAP_ROWS = 25;

// 1 = Maze Wall, 0 = Open Corridor, 2 = Center Conquest Zone
const mazeMap = [
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,0,0,0,1,0,0,0,0,0,1,0,0,0,1,0,0,0,0,0,1,0,0,0,1],
  [1,0,1,0,1,0,1,1,1,0,1,0,1,0,1,0,1,1,1,0,1,0,1,0,1],
  [1,0,1,0,0,0,0,0,1,0,0,0,1,0,0,0,0,0,1,0,0,0,1,0,1],
  [1,0,1,1,1,1,1,0,1,1,1,0,1,1,1,1,1,0,1,1,1,0,1,0,1],
  [1,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,1,0,1],
  [1,1,1,1,1,0,1,1,1,1,1,0,1,1,1,0,1,1,1,1,1,0,1,0,1],
  [1,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0,1],
  [1,0,1,0,1,1,1,0,1,1,1,1,1,1,1,0,1,1,1,0,1,1,1,0,1],
  [1,0,1,0,0,0,0,0,1,2,2,2,2,2,1,0,0,0,0,0,0,0,1,0,1],
  [1,0,1,1,1,0,1,0,1,2,2,2,2,2,1,0,1,0,1,1,1,0,1,0,1],
  [1,0,0,0,1,0,1,0,1,2,2,2,2,2,1,0,1,0,1,0,0,0,0,0,1],
  [1,1,1,0,1,0,1,0,1,2,2,2,2,2,1,0,1,0,1,0,1,1,1,1,1],
  [1,0,0,0,1,0,1,0,1,2,2,2,2,2,1,0,1,0,1,0,0,0,0,0,1],
  [1,0,1,1,1,0,1,0,1,1,1,1,1,1,1,0,1,0,1,1,1,1,1,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,1],
  [1,0,1,1,1,1,1,0,1,1,1,0,1,1,1,1,1,0,1,1,1,0,1,0,1],
  [1,0,0,0,1,0,0,0,0,0,1,0,0,0,1,0,0,0,0,0,1,0,0,0,1],
  [1,0,1,0,1,0,1,1,1,0,1,0,1,0,1,0,1,1,1,0,1,0,1,0,1],
  [1,0,1,0,0,0,0,0,1,0,0,0,1,0,0,0,0,0,1,0,0,0,1,0,1],
  [1,0,1,1,1,1,1,0,1,1,1,0,1,1,1,1,1,0,1,1,1,0,1,0,1],
  [1,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,1,0,1],
  [1,1,1,0,1,0,1,1,1,1,1,0,1,1,1,0,1,1,1,1,1,0,1,0,1],
  [1,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
];

function isWallTile(x, y) {
  const col = Math.floor(x / TILE_SIZE);
  const row = Math.floor(y / TILE_SIZE);
  if (col < 0 || col >= MAP_COLS || row < 0 || row >= MAP_ROWS) return true;
  return mazeMap[row][col] === 1;
}

// --- 2. State & Variables ---
let localPlayer = {
  id: null,
  x: 1.5 * TILE_SIZE,
  y: 1.5 * TILE_SIZE,
  angle: 0,
  speed: 3.5,
  radius: 16,
  health: 100,
  kills: 0,
  name: "Knight",
  animFrame: 0,
  isMoving: false
};

const remotePlayers = {};
const bullets = [];
const mouse = { x: 0, y: 0 };
const keys = {};

// --- 3. Input Handlers & Chat ---
document.getElementById('join-btn').addEventListener('click', () => {
  const val = document.getElementById('username-input').value.trim();
  if (val) localPlayer.name = val;
  document.getElementById('name-portal').style.display = 'none';

  socket.emit('joinGame', localPlayer.name);
});

const chatInput = document.getElementById('chat-input');
const chatMessages = document.getElementById('chat-messages');

window.addEventListener('keydown', (e) => {
  if (e.code === 'Enter') {
    if (document.activeElement === chatInput) {
      const msg = chatInput.value.trim();
      if (msg) {
        appendChatMessage(`${localPlayer.name}: ${msg}`);
        socket.emit('chatMessage', msg);
        chatInput.value = '';
      }
      chatInput.blur();
    } else {
      chatInput.focus();
    }
    return;
  }

  if (document.activeElement === chatInput) return;
  keys[e.code] = true;
});

window.addEventListener('keyup', (e) => {
  if (document.activeElement === chatInput) return;
  keys[e.code] = false;
});

window.addEventListener('mousemove', (e) => {
  mouse.x = e.clientX;
  mouse.y = e.clientY;
});

window.addEventListener('mousedown', (e) => {
  if (document.activeElement === chatInput || e.button !== 0) return;
  shootBullet();
});

function appendChatMessage(msg) {
  const div = document.createElement('div');
  div.innerText = msg;
  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// --- 4. Bullets & Combat ---
function shootBullet() {
  const centerScreenX = canvas.width / 2;
  const centerScreenY = canvas.height / 2;
  const angle = Math.atan2(mouse.y - centerScreenY, mouse.x - centerScreenX);

  const bullet = {
    x: localPlayer.x + Math.cos(angle) * 20,
    y: localPlayer.y + Math.sin(angle) * 20,
    vx: Math.cos(angle) * 10,
    vy: Math.sin(angle) * 10,
    ownerId: socket.id
  };

  bullets.push(bullet);
  socket.emit('fireBullet', bullet);
}

// --- 5. Network Handlers ---
socket.on('currentPlayers', (players) => {
  Object.keys(players).forEach(id => {
    if (id !== socket.id) {
      remotePlayers[id] = players[id];
    }
  });
});

socket.on('newPlayer', (data) => {
  remotePlayers[data.id] = data;
});

socket.on('playerMoved', (data) => {
  if (remotePlayers[data.id]) {
    remotePlayers[data.id].x = data.x;
    remotePlayers[data.id].y = data.y;
    remotePlayers[data.id].angle = data.rotation;
  }
});

socket.on('playerDisconnected', (id) => {
  delete remotePlayers[id];
});

socket.on('bulletFired', (bulletData) => {
  bullets.push(bulletData);
});

socket.on('chatMessage', (data) => {
  appendChatMessage(`${data.name}: ${data.msg}`);
});

// --- 6. Rendering Logic (GTA 1 Top-Down Perspective) ---
function drawMaze(camX, camY) {
  const startCol = Math.max(0, Math.floor((camX - canvas.width / 2) / TILE_SIZE));
  const endCol = Math.min(MAP_COLS, Math.ceil((camX + canvas.width / 2) / TILE_SIZE));
  const startRow = Math.max(0, Math.floor((camY - canvas.height / 2) / TILE_SIZE));
  const endRow = Math.min(MAP_ROWS, Math.ceil((camY + canvas.height / 2) / TILE_SIZE));

  for (let r = startRow; r < endRow; r++) {
    for (let c = startCol; c < endCol; c++) {
      const tile = mazeMap[r][c];
      const screenX = c * TILE_SIZE - camX + canvas.width / 2;
      const screenY = r * TILE_SIZE - camY + canvas.height / 2;

      if (tile === 1) {
        // Maze Wall Top-Down Design
        ctx.fillStyle = '#334155';
        ctx.fillRect(screenX, screenY, TILE_SIZE, TILE_SIZE);
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 2;
        ctx.strokeRect(screenX, screenY, TILE_SIZE, TILE_SIZE);
      } else if (tile === 2) {
        // Conquest Arena Zone
        ctx.fillStyle = '#7c3aed22';
        ctx.fillRect(screenX, screenY, TILE_SIZE, TILE_SIZE);
        ctx.strokeStyle = '#a855f7';
        ctx.strokeRect(screenX, screenY, TILE_SIZE, TILE_SIZE);
      } else {
        // Corridor Floor
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(screenX, screenY, TILE_SIZE, TILE_SIZE);
        ctx.strokeStyle = '#1e293b';
        ctx.strokeRect(screenX, screenY, TILE_SIZE, TILE_SIZE);
      }
    }
  }
}

function drawTopDownKnight(x, y, angle, color, name, isMoving, animFrame, camX, camY) {
  const screenX = x - camX + canvas.width / 2;
  const screenY = y - camY + canvas.height / 2;

  ctx.save();
  ctx.translate(screenX, screenY);
  ctx.rotate(angle);

  // Animated Feet (GTA 1 Walking Animation)
  const legOffset = isMoving ? Math.sin(animFrame * 0.2) * 6 : 0;

  ctx.fillStyle = '#0f172a';
  ctx.fillRect(-10 + legOffset, -14, 6, 8); // Left Foot
  ctx.fillRect(-10 - legOffset, 6, 6, 8);  // Right Foot

  // Body / Shoulders
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(0, 0, 16, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Helmet Visor / Head
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.arc(2, 0, 8, 0, Math.PI * 2);
  ctx.fill();

  // Gun Rifle Barrel
  ctx.fillStyle = '#94a3b8';
  ctx.fillRect(8, 4, 14, 4);

  ctx.restore();

  // Name Tag
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(name, screenX, screenY - 24);
}

// --- 7. Main Game Loop ---
function update() {
  if (document.getElementById('name-portal').style.display !== 'none') return;

  // Player Movement & Wall Collisions
  let dx = 0;
  let dy = 0;

  if (keys['KeyW']) dy -= 1;
  if (keys['KeyS']) dy += 1;
  if (keys['KeyA']) dx -= 1;
  if (keys['KeyD']) dx += 1;

  if (dx !== 0 && dy !== 0) {
    dx *= 0.7071;
    dy *= 0.7071;
  }

  const nextX = localPlayer.x + dx * localPlayer.speed;
  const nextY = localPlayer.y + dy * localPlayer.speed;

  // Collision with Maze Walls
  if (!isWallTile(nextX + (dx > 0 ? localPlayer.radius : -localPlayer.radius), localPlayer.y)) {
    localPlayer.x = nextX;
  }
  if (!isWallTile(localPlayer.x, nextY + (dy > 0 ? localPlayer.radius : -localPlayer.radius))) {
    localPlayer.y = nextY;
  }

  localPlayer.isMoving = dx !== 0 || dy !== 0;
  if (localPlayer.isMoving) localPlayer.animFrame++;

  // Aim Rotation
  const centerScreenX = canvas.width / 2;
  const centerScreenY = canvas.height / 2;
  localPlayer.angle = Math.atan2(mouse.y - centerScreenY, mouse.x - centerScreenX);

  // Sync Position with Server
  socket.emit('playerMovement', {
    x: localPlayer.x,
    y: localPlayer.y,
    rotation: localPlayer.angle
  });

  // Bullets Update & Collisions
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    b.x += b.vx;
    b.y += b.vy;

    if (isWallTile(b.x, b.y)) {
      bullets.splice(i, 1);
      continue;
    }

    // Check hit on local player
    if (b.ownerId !== socket.id) {
      const dist = Math.hypot(b.x - localPlayer.x, b.y - localPlayer.y);
      if (dist < localPlayer.radius) {
        localPlayer.health -= 15;
        document.getElementById('health-bar-fill').style.width = `${localPlayer.health}%`;
        document.getElementById('health-text').innerText = `HP: ${Math.max(0, localPlayer.health)} / 100`;

        if (localPlayer.health <= 0) {
          alert('You were slain in the maze! Respawning...');
          localPlayer.health = 100;
          localPlayer.x = 1.5 * TILE_SIZE;
          localPlayer.y = 1.5 * TILE_SIZE;
          document.getElementById('health-bar-fill').style.width = '100%';
          document.getElementById('health-text').innerText = 'HP: 100 / 100';
        }
        bullets.splice(i, 1);
      }
    }
  }
}

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const camX = localPlayer.x;
  const camY = localPlayer.y;

  drawMaze(camX, camY);

  // Draw Bullets
  ctx.fillStyle = '#ef4444';
  bullets.forEach(b => {
    const screenX = b.x - camX + canvas.width / 2;
    const screenY = b.y - camY + canvas.height / 2;
    ctx.beginPath();
    ctx.arc(screenX, screenY, 4, 0, Math.PI * 2);
    ctx.fill();
  });

  // Draw Remote Opponents
  Object.values(remotePlayers).forEach(p => {
    drawTopDownKnight(p.x, p.y, p.angle || 0, '#ec4899', p.name || 'Opponent', false, 0, camX, camY);
  });

  // Draw Local Player
  drawTopDownKnight(
    localPlayer.x, localPlayer.y, localPlayer.angle,
    '#38bdf8', localPlayer.name, localPlayer.isMoving,
    localPlayer.animFrame, camX, camY
  );
}

function gameLoop() {
  update();
  render();
  requestAnimationFrame(gameLoop);
}

gameLoop();
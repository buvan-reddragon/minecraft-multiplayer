// client.js
const socket = io();
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// --- 1. Maze Layout & Cell Constants ---
const TILE_SIZE = 64;
const MAP_COLS = 25;
const MAP_ROWS = 25;

// Violet Cell Center Coordinates
const VIOLET_CELL_X = 11.5 * TILE_SIZE;
const VIOLET_CELL_Y = 11.5 * TILE_SIZE;

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

// --- 2. Player State & Variables ---
let localPlayer = {
  id: null,
  x: 1.5 * TILE_SIZE,
  y: 1.5 * TILE_SIZE,
  angle: 0,
  speed: 3.5,
  radius: 18,
  hitCount: 0,
  isLocked: false,
  lockTimer: 0,
  name: "Soldier",
  animFrame: 0,
  isMoving: false
};

const remotePlayers = {};
const bullets = [];
const mouse = { x: 0, y: 0 };
const keys = {};
let lockInterval = null;

// --- 3. Fixed Chat System & Input Listeners ---
const chatInput = document.getElementById('chat-input');
const chatMessages = document.getElementById('chat-messages');

document.getElementById('join-btn').addEventListener('click', () => {
  const val = document.getElementById('username-input').value.trim();
  if (val) localPlayer.name = val;
  document.getElementById('name-portal').style.display = 'none';
  socket.emit('joinGame', localPlayer.name);
});

window.addEventListener('keydown', (e) => {
  if (e.code === 'Enter') {
    if (document.activeElement === chatInput) {
      const msg = chatInput.value.trim();
      if (msg !== '') {
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
  if (document.activeElement === chatInput || e.button !== 0 || localPlayer.isLocked) return;
  shootBullet();
});

function appendChatMessage(sender, msg) {
  const div = document.createElement('div');
  div.innerHTML = `<b style="color:#f59e0b;">${sender}:</b> ${msg}`;
  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

socket.on('chatMessage', (data) => {
  appendChatMessage(data.name, data.msg);
});

// --- 4. Cell Lock System ---
document.getElementById('unlock-btn').addEventListener('click', unlockLocalPlayer);

function lockLocalPlayerInCell() {
  localPlayer.isLocked = true;
  localPlayer.x = VIOLET_CELL_X;
  localPlayer.y = VIOLET_CELL_Y;
  localPlayer.hitCount = 0;
  localPlayer.lockTimer = 30;

  document.getElementById('hits-counter').innerText = `Status: LOCKED IN CELL (0 / 10 Hits)`;
  const overlay = document.getElementById('cell-overlay');
  overlay.style.display = 'flex';

  if (lockInterval) clearInterval(lockInterval);
  lockInterval = setInterval(() => {
    localPlayer.lockTimer--;
    document.getElementById('timer-text').innerText = `Unlocking in: ${localPlayer.lockTimer}s`;
    if (localPlayer.lockTimer <= 0) {
      unlockLocalPlayer();
    }
  }, 1000);

  socket.emit('playerLocked', { targetId: socket.id });
}

function unlockLocalPlayer() {
  localPlayer.isLocked = false;
  document.getElementById('cell-overlay').style.display = 'none';
  document.getElementById('hits-counter').innerText = `Opponent Hits Remaining to Cell Lock: 10`;
  if (lockInterval) clearInterval(lockInterval);
  socket.emit('playerUnlocked', { targetId: socket.id });
}

// --- 5. Shooting Mechanics ---
function shootBullet() {
  const centerScreenX = canvas.width / 2;
  const centerScreenY = canvas.height / 2;
  const angle = Math.atan2(mouse.y - centerScreenY, mouse.x - centerScreenX);

  const bullet = {
    x: localPlayer.x + Math.cos(angle) * 22,
    y: localPlayer.y + Math.sin(angle) * 22,
    vx: Math.cos(angle) * 11,
    vy: Math.sin(angle) * 11,
    ownerId: socket.id
  };

  bullets.push(bullet);
  socket.emit('fireBullet', bullet);
}

// --- 6. Network Listeners ---
socket.on('currentPlayers', (players) => {
  Object.keys(players).forEach(id => {
    if (id !== socket.id) remotePlayers[id] = players[id];
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

// --- 7. Top-Down Tactical Soldier Renderer ---
function drawSoldier(x, y, angle, vestColor, helmetColor, name, isMoving, animFrame, camX, camY) {
  const screenX = x - camX + canvas.width / 2;
  const screenY = y - camY + canvas.height / 2;

  ctx.save();
  ctx.translate(screenX, screenY);
  ctx.rotate(angle);

  // 1. Moving Boots / Legs
  const legOffset = isMoving ? Math.sin(animFrame * 0.25) * 8 : 0;

  ctx.fillStyle = '#1e293b';
  ctx.fillRect(-12 + legOffset, -16, 8, 10); // Left Boot
  ctx.fillRect(-12 - legOffset, 6, 8, 10);  // Right Boot

  // 2. Tactical Vest & Body
  ctx.fillStyle = vestColor;
  ctx.beginPath();
  ctx.arc(0, 0, 16, 0, Math.PI * 2);
  ctx.fill();

  // 3. Armor Shoulders
  ctx.fillStyle = '#334155';
  ctx.fillRect(-6, -18, 12, 6);
  ctx.fillRect(-6, 12, 12, 6);

  // 4. Soldier Helmet
  ctx.fillStyle = helmetColor;
  ctx.beginPath();
  ctx.arc(0, 0, 10, 0, Math.PI * 2);
  ctx.fill();

  // Helmet Dark Visor Line
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(2, -5, 4, 10);

  // 5. Hands holding Assault Rifle
  ctx.fillStyle = '#f87171'; // Hand Skin Tone
  ctx.beginPath();
  ctx.arc(12, -8, 4, 0, Math.PI * 2);
  ctx.arc(18, 2, 4, 0, Math.PI * 2);
  ctx.fill();

  // 6. Assault Rifle Barrel & Suppressor
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(8, -2, 18, 5); // Main Gun Body
  ctx.fillStyle = '#64748b';
  ctx.fillRect(26, -1, 6, 3);  // Rifle Barrel Tip

  ctx.restore();

  // Name Tag
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(name, screenX, screenY - 26);
}

// --- 8. Maze & Map Renderer ---
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
        // Wall
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(screenX, screenY, TILE_SIZE, TILE_SIZE);
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 2;
        ctx.strokeRect(screenX, screenY, TILE_SIZE, TILE_SIZE);
      } else if (tile === 2) {
        // Central Violet Cell Box Area
        ctx.fillStyle = 'rgba(124, 58, 237, 0.35)';
        ctx.fillRect(screenX, screenY, TILE_SIZE, TILE_SIZE);
        ctx.strokeStyle = '#a855f7';
        ctx.lineWidth = 2;
        ctx.strokeRect(screenX, screenY, TILE_SIZE, TILE_SIZE);
      } else {
        // Normal Corridor Floor
        ctx.fillStyle = '#090d16';
        ctx.fillRect(screenX, screenY, TILE_SIZE, TILE_SIZE);
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 1;
        ctx.strokeRect(screenX, screenY, TILE_SIZE, TILE_SIZE);
      }
    }
  }
}

// --- 9. Game Loop ---
function update() {
  if (document.getElementById('name-portal').style.display !== 'none') return;

  // Prevent moving out of central cell if locked
  if (!localPlayer.isLocked) {
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

    if (!isWallTile(nextX + (dx > 0 ? localPlayer.radius : -localPlayer.radius), localPlayer.y)) {
      localPlayer.x = nextX;
    }
    if (!isWallTile(localPlayer.x, nextY + (dy > 0 ? localPlayer.radius : -localPlayer.radius))) {
      localPlayer.y = nextY;
    }

    localPlayer.isMoving = dx !== 0 || dy !== 0;
    if (localPlayer.isMoving) localPlayer.animFrame++;
  } else {
    localPlayer.isMoving = false;
  }

  // Aim Rotation
  const centerScreenX = canvas.width / 2;
  const centerScreenY = canvas.height / 2;
  localPlayer.angle = Math.atan2(mouse.y - centerScreenY, mouse.x - centerScreenX);

  // Sync Position
  socket.emit('playerMovement', {
    x: localPlayer.x,
    y: localPlayer.y,
    rotation: localPlayer.angle
  });

  // Bullets Collision
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    b.x += b.vx;
    b.y += b.vy;

    if (isWallTile(b.x, b.y)) {
      bullets.splice(i, 1);
      continue;
    }

    // Check hit on local player
    if (b.ownerId !== socket.id && !localPlayer.isLocked) {
      const dist = Math.hypot(b.x - localPlayer.x, b.y - localPlayer.y);
      if (dist < localPlayer.radius) {
        localPlayer.hitCount++;
        const remaining = 10 - localPlayer.hitCount;
        document.getElementById('hits-counter').innerText = `Opponent Hits Remaining to Cell Lock: ${remaining}`;

        if (localPlayer.hitCount >= 10) {
          lockLocalPlayerInCell();
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
  ctx.fillStyle = '#f43f5e';
  bullets.forEach(b => {
    const screenX = b.x - camX + canvas.width / 2;
    const screenY = b.y - camY + canvas.height / 2;
    ctx.beginPath();
    ctx.arc(screenX, screenY, 4, 0, Math.PI * 2);
    ctx.fill();
  });

  // Draw Remote Opponents (Pink Vest Soldiers)
  Object.values(remotePlayers).forEach(p => {
    drawSoldier(p.x, p.y, p.angle || 0, '#ec4899', '#9d174d', p.name || 'Opponent', false, 0, camX, camY);
  });

  // Draw Local Player (Blue Vest Soldier)
  drawSoldier(
    localPlayer.x, localPlayer.y, localPlayer.angle,
    '#2563eb', '#1d4ed8', localPlayer.name,
    localPlayer.isMoving, localPlayer.animFrame, camX, camY
  );
}

function gameLoop() {
  update();
  render();
  requestAnimationFrame(gameLoop);
}

gameLoop();
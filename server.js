// ============================================================
// ARCADIA MAZE CONQUEST - MULTIPLAYER SERVER
// Node.js + Express + Socket.IO
// ============================================================

const express = require("express");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// ------------------------------------------------------------
// STATIC FILES
// ------------------------------------------------------------

app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ------------------------------------------------------------
// GAME CONSTANTS
// ------------------------------------------------------------

const PORT = process.env.PORT || 3000;

const TILE_SIZE = 64;
const MAP_COLS = 25;
const MAP_ROWS = 25;

const PLAYER_RADIUS = 18;

const MAX_HEALTH = 100;
const MAX_ARMOR = 25;

const BULLET_DAMAGE = 25;
const FIRE_COOLDOWN = 120;

const MAGAZINE_SIZE = 30;
const RELOAD_TIME = 1500;

const LOCK_HITS = 10;
const LOCK_TIME = 30000;

const PLAYER_SPEED = 3.5;
const SPRINT_SPEED = 5.2;

// ------------------------------------------------------------
// MAZE
// 1 = wall
// 0 = floor
// 2 = violet cell
// ------------------------------------------------------------

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

// ------------------------------------------------------------
// PLAYER SPAWN POINTS
// ------------------------------------------------------------

const spawnPoints = [
  { x: 1.5 * TILE_SIZE, y: 1.5 * TILE_SIZE },
  { x: 23.5 * TILE_SIZE, y: 1.5 * TILE_SIZE },
  { x: 1.5 * TILE_SIZE, y: 23.5 * TILE_SIZE },
  { x: 23.5 * TILE_SIZE, y: 23.5 * TILE_SIZE },
  { x: 5.5 * TILE_SIZE, y: 5.5 * TILE_SIZE },
  { x: 19.5 * TILE_SIZE, y: 5.5 * TILE_SIZE },
  { x: 5.5 * TILE_SIZE, y: 19.5 * TILE_SIZE },
  { x: 19.5 * TILE_SIZE, y: 19.5 * TILE_SIZE }
];

// ------------------------------------------------------------
// GAME STATE
// ------------------------------------------------------------

const players = {};

let spawnIndex = 0;

// ------------------------------------------------------------
// HELPERS
// ------------------------------------------------------------

function getSpawnPoint() {
  const spawn = spawnPoints[spawnIndex % spawnPoints.length];
  spawnIndex++;

  return {
    x: spawn.x,
    y: spawn.y
  };
}

function isWallTile(x, y) {
  const col = Math.floor(x / TILE_SIZE);
  const row = Math.floor(y / TILE_SIZE);

  if (
    col < 0 ||
    col >= MAP_COLS ||
    row < 0 ||
    row >= MAP_ROWS
  ) {
    return true;
  }

  return mazeMap[row][col] === 1;
}

function isValidPosition(x, y) {
  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    return false;
  }

  if (isWallTile(x - PLAYER_RADIUS, y)) return false;
  if (isWallTile(x + PLAYER_RADIUS, y)) return false;
  if (isWallTile(x, y - PLAYER_RADIUS)) return false;
  if (isWallTile(x, y + PLAYER_RADIUS)) return false;

  return true;
}

function sanitizeName(name) {
  if (typeof name !== "string") {
    return "Soldier";
  }

  return name
    .replace(/[<>]/g, "")
    .trim()
    .substring(0, 14) || "Soldier";
}

function publicPlayer(player) {
  return {
    id: player.id,
    x: player.x,
    y: player.y,
    rotation: player.rotation,
    name: player.name,
    health: player.health,
    armor: player.armor,
    kills: player.kills,
    deaths: player.deaths,
    ammo: player.ammo,
    isReloading: player.isReloading,
    isLocked: player.isLocked,
    isSprinting: player.isSprinting
  };
}

function broadcastPlayers() {
  io.emit(
    "playersState",
    Object.values(players).map(publicPlayer)
  );
}

// ------------------------------------------------------------
// PLAYER CREATION
// ------------------------------------------------------------

function createPlayer(socket) {
  const spawn = getSpawnPoint();

  players[socket.id] = {
    id: socket.id,

    x: spawn.x,
    y: spawn.y,

    rotation: 0,

    name: "Soldier",

    health: MAX_HEALTH,
    armor: MAX_ARMOR,

    kills: 0,
    deaths: 0,

    ammo: MAGAZINE_SIZE,

    isReloading: false,
    reloadTimer: null,

    isLocked: false,
    lockTimer: null,

    lockHits: 0,

    isSprinting: false,

    lastShot: 0,

    respawnTimer: null
  };
}

// ------------------------------------------------------------
// CONNECTION
// ------------------------------------------------------------

io.on("connection", (socket) => {

  console.log("Player connected:", socket.id);

  createPlayer(socket);

  socket.emit("initialState", {
    player: publicPlayer(players[socket.id]),
    players: Object.values(players).map(publicPlayer)
  });

  socket.broadcast.emit(
    "playerJoined",
    publicPlayer(players[socket.id])
  );

  // ----------------------------------------------------------
  // JOIN GAME
  // ----------------------------------------------------------

  socket.on("joinGame", (name) => {

    const player = players[socket.id];

    if (!player) return;

    player.name = sanitizeName(name);

    socket.emit("joinAccepted", publicPlayer(player));

    broadcastPlayers();
  });

  // ----------------------------------------------------------
  // PLAYER MOVEMENT
  // ----------------------------------------------------------

  socket.on("playerMovement", (data) => {

    const player = players[socket.id];

    if (!player) return;

    if (player.isLocked) return;

    if (player.health <= 0) return;

    if (!data) return;

    const x = Number(data.x);
    const y = Number(data.y);
    const rotation = Number(data.rotation);

    if (
      !Number.isFinite(x) ||
      !Number.isFinite(y) ||
      !Number.isFinite(rotation)
    ) {
      return;
    }

    // Prevent impossible teleports.
    const distance = Math.hypot(
      x - player.x,
      y - player.y
    );

    const maxDistance = player.isSprinting
      ? SPRINT_SPEED * 4
      : PLAYER_SPEED * 4;

    if (distance > maxDistance) {
      return;
    }

    if (!isValidPosition(x, y)) {
      return;
    }

    player.x = x;
    player.y = y;

    player.rotation = rotation;

    socket.broadcast.emit(
      "playerMoved",
      publicPlayer(player)
    );
  });

  // ----------------------------------------------------------
  // SPRINT
  // ----------------------------------------------------------

  socket.on("sprintState", (sprinting) => {

    const player = players[socket.id];

    if (!player) return;

    player.isSprinting = Boolean(sprinting);

    socket.broadcast.emit("playerSprint", {
      id: player.id,
      sprinting: player.isSprinting
    });
  });

  // ----------------------------------------------------------
  // RELOAD
  // ----------------------------------------------------------

  socket.on("reload", () => {

    const player = players[socket.id];

    if (!player) return;

    if (player.isReloading) return;

    if (player.ammo >= MAGAZINE_SIZE) return;

    player.isReloading = true;

    io.emit("playerReloading", {
      id: player.id
    });

    player.reloadTimer = setTimeout(() => {

      if (!players[player.id]) return;

      player.ammo = MAGAZINE_SIZE;
      player.isReloading = false;

      io.emit("reloadComplete", {
        id: player.id,
        ammo: player.ammo
      });

    }, RELOAD_TIME);
  });

  // ----------------------------------------------------------
  // FIRE BULLET
  // ----------------------------------------------------------

  socket.on("fireBullet", (data) => {

    const player = players[socket.id];

    if (!player) return;

    if (player.health <= 0) return;

    if (player.isLocked) return;

    if (player.isReloading) return;

    const now = Date.now();

    if (now - player.lastShot < FIRE_COOLDOWN) {
      return;
    }

    if (player.ammo <= 0) {

      socket.emit("emptyMagazine");

      return;
    }

    if (!data) return;

    const angle = Number(data.angle);

    if (!Number.isFinite(angle)) {
      return;
    }

    player.lastShot = now;
    player.ammo--;

    // Bullet starts slightly in front of player.
    const startX =
      player.x + Math.cos(angle) * 25;

    const startY =
      player.y + Math.sin(angle) * 25;

    const bulletId =
      `${socket.id}-${Date.now()}-${Math.random()}`;

    const bullet = {
      id: bulletId,
      ownerId: socket.id,
      x: startX,
      y: startY,
      vx: Math.cos(angle) * 12,
      vy: Math.sin(angle) * 12,
      angle
    };

    io.emit("bulletFired", bullet);

    socket.emit("ammoUpdate", {
      ammo: player.ammo
    });

    // --------------------------------------------------------
    // SERVER-SIDE BULLET SIMULATION
    // --------------------------------------------------------

    let bulletX = startX;
    let bulletY = startY;

    const bulletSteps = 100;

    for (let i = 0; i < bulletSteps; i++) {

      bulletX += bullet.vx;
      bulletY += bullet.vy;

      if (isWallTile(bulletX, bulletY)) {
        break;
      }

      let hitPlayer = null;

      for (const target of Object.values(players)) {

        if (target.id === player.id) continue;

        if (target.health <= 0) continue;

        if (target.isLocked) continue;

        const distance = Math.hypot(
          bulletX - target.x,
          bulletY - target.y
        );

        if (distance <= PLAYER_RADIUS + 5) {
          hitPlayer = target;
          break;
        }
      }

      if (hitPlayer) {

        applyDamage(
          player,
          hitPlayer,
          BULLET_DAMAGE
        );

        break;
      }
    }
  });

  // ----------------------------------------------------------
  // DAMAGE
  // ----------------------------------------------------------

  function applyDamage(attacker, target, damage) {

    let remainingDamage = damage;

    // Armor absorbs damage first.
    if (target.armor > 0) {

      const armorDamage =
        Math.min(target.armor, remainingDamage);

      target.armor -= armorDamage;
      remainingDamage -= armorDamage;
    }

    target.health -= remainingDamage;

    if (target.health < 0) {
      target.health = 0;
    }

    // Increment cell-lock hit counter.
    target.lockHits++;

    io.emit("playerDamaged", {
      targetId: target.id,
      attackerId: attacker.id,
      health: target.health,
      armor: target.armor,
      lockHits: target.lockHits
    });

    // --------------------------------------------------------
    // DEATH
    // --------------------------------------------------------

    if (target.health <= 0) {

      attacker.kills++;
      target.deaths++;

      io.emit("playerKilled", {
        killerId: attacker.id,
        killerName: attacker.name,
        victimId: target.id,
        victimName: target.name
      });

      respawnPlayer(target);

      broadcastPlayers();

      return;
    }

    // --------------------------------------------------------
    // VIOLET CELL LOCK
    // --------------------------------------------------------

    if (target.lockHits >= LOCK_HITS) {

      lockPlayer(target);

    }
  }

  // ----------------------------------------------------------
  // LOCK PLAYER
  // ----------------------------------------------------------

  function lockPlayer(player) {

    if (player.isLocked) return;

    player.isLocked = true;

    player.lockHits = 0;

    player.x = 11.5 * TILE_SIZE;
    player.y = 11.5 * TILE_SIZE;

    player.health = MAX_HEALTH;
    player.armor = MAX_ARMOR;

    io.emit("playerLocked", {
      targetId: player.id,
      x: player.x,
      y: player.y,
      duration: LOCK_TIME
    });

    player.lockTimer = setTimeout(() => {

      unlockPlayer(player);

    }, LOCK_TIME);
  }

  // ----------------------------------------------------------
  // UNLOCK
  // ----------------------------------------------------------

  function unlockPlayer(player) {

    if (!players[player.id]) return;

    player.isLocked = false;
    player.lockHits = 0;

    const spawn = getSpawnPoint();

    player.x = spawn.x;
    player.y = spawn.y;

    player.health = MAX_HEALTH;
    player.armor = MAX_ARMOR;

    io.emit("playerUnlocked", {
      targetId: player.id,
      x: player.x,
      y: player.y
    });

    broadcastPlayers();
  }

  // ----------------------------------------------------------
  // MANUAL UNLOCK
  // ----------------------------------------------------------

  socket.on("requestUnlock", () => {

    const player = players[socket.id];

    if (!player) return;

    // Do not allow client to bypass the timer.
    // Unlock happens server-side only.
    socket.emit("unlockDenied", {
      message: "The cell lock expires automatically."
    });
  });

  // ----------------------------------------------------------
  // RESPAWN
  // ----------------------------------------------------------

  function respawnPlayer(player) {

    if (!players[player.id]) return;

    player.health = 0;

    io.emit("playerRespawning", {
      id: player.id
    });

    if (player.respawnTimer) {
      clearTimeout(player.respawnTimer);
    }

    player.respawnTimer = setTimeout(() => {

      if (!players[player.id]) return;

      const spawn = getSpawnPoint();

      player.x = spawn.x;
      player.y = spawn.y;

      player.health = MAX_HEALTH;
      player.armor = MAX_ARMOR;
      player.ammo = MAGAZINE_SIZE;
      player.lockHits = 0;
      player.isReloading = false;
      player.isLocked = false;

      io.emit("playerRespawned", publicPlayer(player));

      broadcastPlayers();

    }, 3000);
  }

  // ----------------------------------------------------------
  // CHAT
  // ----------------------------------------------------------

  socket.on("chatMessage", (message) => {

    const player = players[socket.id];

    if (!player) return;

    if (typeof message !== "string") return;

    const cleanMessage = message
      .replace(/[<>]/g, "")
      .trim()
      .substring(0, 150);

    if (!cleanMessage) return;

    io.emit("chatMessage", {
      name: player.name,
      msg: cleanMessage
    });
  });

  // ----------------------------------------------------------
  // DISCONNECT
  // ----------------------------------------------------------

  socket.on("disconnect", () => {

    const player = players[socket.id];

    if (player) {

      if (player.reloadTimer) {
        clearTimeout(player.reloadTimer);
      }

      if (player.lockTimer) {
        clearTimeout(player.lockTimer);
      }

      if (player.respawnTimer) {
        clearTimeout(player.respawnTimer);
      }
    }

    delete players[socket.id];

    io.emit("playerDisconnected", socket.id);

    broadcastPlayers();

    console.log("Player disconnected:", socket.id);
  });
});

// ------------------------------------------------------------
// START SERVER
// ------------------------------------------------------------

server.listen(PORT, "0.0.0.0", () => {

  console.log(
    `Arcadia Maze server running on port ${PORT}`
  );

});
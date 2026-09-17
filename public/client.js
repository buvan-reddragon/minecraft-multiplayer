// ============================================================
// ARCADIA MAZE CONQUEST
// MULTIPLAYER CLIENT
// ============================================================

const socket = io();

// ============================================================
// CANVAS
// ============================================================

const canvas = document.getElementById("game-canvas");
const ctx = canvas.getContext("2d");

function resizeCanvas() {

  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

window.addEventListener("resize", resizeCanvas);

resizeCanvas();

// ============================================================
// GAME CONSTANTS
// ============================================================

const TILE_SIZE = 64;

const MAP_COLS = 25;
const MAP_ROWS = 25;

const PLAYER_RADIUS = 18;

const MAX_HEALTH = 100;
const MAX_ARMOR = 25;

const MAGAZINE_SIZE = 30;

const PLAYER_SPEED = 3.5;
const SPRINT_SPEED = 5.2;

const LOCK_TIME = 30;

// ============================================================
// MAZE
// ============================================================

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

// ============================================================
// LOCAL PLAYER
// ============================================================

const localPlayer = {

  id: null,

  x: 96,
  y: 96,

  angle: 0,

  speed: PLAYER_SPEED,

  health: MAX_HEALTH,

  armor: MAX_ARMOR,

  ammo: MAGAZINE_SIZE,

  kills: 0,
  deaths: 0,

  lockHits: 0,

  isLocked: false,

  isReloading: false,

  isDead: false,

  isSprinting: false,

  animFrame: 0,

  isMoving: false,

  name: "Soldier"
};

// ============================================================
// REMOTE PLAYERS
// ============================================================

const remotePlayers = {};

// ============================================================
// BULLETS
// ============================================================

const bullets = [];

// ============================================================
// EFFECTS
// ============================================================

const particles = [];

const muzzleFlashes = [];

const damageTexts = [];

// ============================================================
// INPUT
// ============================================================

const keys = {};

const mouse = {
  x: window.innerWidth / 2,
  y: window.innerHeight / 2,
  down: false
};

// ============================================================
// UI
// ============================================================

const namePortal =
  document.getElementById("name-portal");

const usernameInput =
  document.getElementById("username-input");

const joinButton =
  document.getElementById("join-btn");

const chatInput =
  document.getElementById("chat-input");

const chatMessages =
  document.getElementById("chat-messages");

const healthBar =
  document.getElementById("health-bar");

const armorBar =
  document.getElementById("armor-bar");

const healthValue =
  document.getElementById("health-value");

const armorValue =
  document.getElementById("armor-value");

const ammoElement =
  document.getElementById("ammo");

const playerNameElement =
  document.getElementById("player-name");

const scoreboard =
  document.getElementById("scoreboard");

const scoreboardContent =
  document.getElementById("scoreboard-content");

const killFeed =
  document.getElementById("kill-feed");

const cellOverlay =
  document.getElementById("cell-overlay");

const cellTimer =
  document.getElementById("cell-timer");

// ============================================================
// MAP COLLISION
// ============================================================

function isWallTile(x, y) {

  const col =
    Math.floor(x / TILE_SIZE);

  const row =
    Math.floor(y / TILE_SIZE);

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

function canMoveTo(x, y) {

  if (isWallTile(
    x - PLAYER_RADIUS,
    y
  )) return false;

  if (isWallTile(
    x + PLAYER_RADIUS,
    y
  )) return false;

  if (isWallTile(
    x,
    y - PLAYER_RADIUS
  )) return false;

  if (isWallTile(
    x,
    y + PLAYER_RADIUS
  )) return false;

  return true;
}

// ============================================================
// JOIN
// ============================================================

joinButton.addEventListener("click", joinGame);

usernameInput.addEventListener("keydown", (e) => {

  if (e.code === "Enter") {
    joinGame();
  }
});

function joinGame() {

  let name =
    usernameInput.value.trim();

  if (!name) {
    name = "Soldier";
  }

  name =
    name
      .replace(/[<>]/g, "")
      .substring(0, 14);

  localPlayer.name = name;

  playerNameElement.innerText =
    name;

  namePortal.style.display =
    "none";

  socket.emit(
    "joinGame",
    name
  );
}

// ============================================================
// KEYBOARD
// ============================================================

window.addEventListener("keydown", (e) => {

  // Chat
  if (e.code === "Enter") {

    if (
      document.activeElement ===
      chatInput
    ) {

      const message =
        chatInput.value.trim();

      if (message) {

        socket.emit(
          "chatMessage",
          message
        );

        chatInput.value = "";
      }

      chatInput.blur();

    } else {

      chatInput.focus();
    }

    return;
  }

  // Scoreboard
  if (e.code === "Tab") {

    e.preventDefault();

    scoreboard.style.display =
      "block";

    updateScoreboard();

    return;
  }

  if (
    document.activeElement ===
    chatInput
  ) {
    return;
  }

  keys[e.code] = true;

  // Reload
  if (e.code === "KeyR") {
    reload();
  }

  // Sprint
  if (
    e.code === "ShiftLeft" ||
    e.code === "ShiftRight"
  ) {

    if (!localPlayer.isSprinting) {

      localPlayer.isSprinting = true;

      socket.emit(
        "sprintState",
        true
      );
    }
  }
});

window.addEventListener("keyup", (e) => {

  keys[e.code] = false;

  if (
    e.code === "ShiftLeft" ||
    e.code === "ShiftRight"
  ) {

    localPlayer.isSprinting = false;

    socket.emit(
      "sprintState",
      false
    );
  }

  if (e.code === "Tab") {

    scoreboard.style.display =
      "none";
  }
});

// ============================================================
// MOUSE
// ============================================================

window.addEventListener("mousemove", (e) => {

  mouse.x = e.clientX;
  mouse.y = e.clientY;
});

window.addEventListener("mousedown", (e) => {

  if (e.button !== 0) return;

  if (
    document.activeElement ===
    chatInput
  ) {
    return;
  }

  mouse.down = true;
});

window.addEventListener("mouseup", (e) => {

  if (e.button === 0) {
    mouse.down = false;
  }
});

// ============================================================
// SHOOTING
// ============================================================

let lastLocalShot = 0;

function shootBullet() {

  if (
    localPlayer.isLocked ||
    localPlayer.isDead ||
    localPlayer.isReloading
  ) {
    return;
  }

  if (localPlayer.ammo <= 0) {

    reload();

    return;
  }

  const now = Date.now();

  if (now - lastLocalShot < 120) {
    return;
  }

  lastLocalShot = now;

  const centerX =
    canvas.width / 2;

  const centerY =
    canvas.height / 2;

  const angle =
    Math.atan2(
      mouse.y - centerY,
      mouse.x - centerX
    );

  localPlayer.angle =
    angle;

  // Visual bullet prediction.
  const bullet = {

    id:
      `local-${Date.now()}-${Math.random()}`,

    ownerId:
      localPlayer.id,

    x:
      localPlayer.x +
      Math.cos(angle) * 25,

    y:
      localPlayer.y +
      Math.sin(angle) * 25,

    vx:
      Math.cos(angle) * 12,

    vy:
      Math.sin(angle) * 12,

    life: 100,

    local: true
  };

  bullets.push(bullet);

  createMuzzleFlash();

  socket.emit(
    "fireBullet",
    {
      angle
    }
  );
}

// ============================================================
// RELOAD
// ============================================================

function reload() {

  if (
    localPlayer.isReloading ||
    localPlayer.ammo >= MAGAZINE_SIZE ||
    localPlayer.isDead ||
    localPlayer.isLocked
  ) {
    return;
  }

  localPlayer.isReloading = true;

  socket.emit("reload");

  ammoElement.innerText =
    "RELOADING...";
}

// ============================================================
// SOCKET - INITIAL STATE
// ============================================================

socket.on("initialState", (data) => {

  if (!data) return;

  if (data.player) {

    applyPlayerData(
      localPlayer,
      data.player
    );
  }

  remotePlayersClear();

  if (Array.isArray(data.players)) {

    data.players.forEach((player) => {

      if (player.id !== socket.id) {

        remotePlayers[player.id] =
          createRemotePlayer(player);
      }
    });
  }

  updateHUD();
});

// ============================================================
// JOIN ACCEPTED
// ============================================================

socket.on("joinAccepted", (data) => {

  applyPlayerData(
    localPlayer,
    data
  );

  updateHUD();
});

// ============================================================
// CURRENT PLAYERS
// ============================================================

socket.on("playersState", (players) => {

  if (!Array.isArray(players)) {
    return;
  }

  players.forEach((player) => {

    if (player.id === socket.id) {

      applyPlayerData(
        localPlayer,
        player
      );

      return;
    }

    if (!remotePlayers[player.id]) {

      remotePlayers[player.id] =
        createRemotePlayer(player);

    } else {

      const target =
        remotePlayers[player.id];

      target.targetX =
        player.x;

      target.targetY =
        player.y;

      target.targetAngle =
        player.rotation;

      target.health =
        player.health;

      target.armor =
        player.armor;

      target.kills =
        player.kills;

      target.deaths =
        player.deaths;

      target.ammo =
        player.ammo;

      target.isReloading =
        player.isReloading;

      target.isLocked =
        player.isLocked;
    }
  });

  updateHUD();
  updateScoreboard();
});

// ============================================================
// PLAYER JOINED
// ============================================================

socket.on("playerJoined", (player) => {

  if (player.id === socket.id) {
    return;
  }

  remotePlayers[player.id] =
    createRemotePlayer(player);

  addSystemMessage(
    `${player.name} entered the battle.`
  );
});

// ============================================================
// PLAYER MOVEMENT
// ============================================================

socket.on("playerMoved", (data) => {

  if (!data) return;

  if (!remotePlayers[data.id]) {

    remotePlayers[data.id] =
      createRemotePlayer(data);
  }

  const player =
    remotePlayers[data.id];

  player.targetX =
    data.x;

  player.targetY =
    data.y;

  player.targetAngle =
    data.rotation;
});

// ============================================================
// PLAYER SPRINT
// ============================================================

socket.on("playerSprint", (data) => {

  if (!data) return;

  if (!remotePlayers[data.id]) {
    return;
  }

  remotePlayers[data.id].isSprinting =
    Boolean(data.sprinting);
});

// ============================================================
// PLAYER RELOADING
// ============================================================

socket.on("playerReloading", (data) => {

  if (!data) return;

  if (
    remotePlayers[data.id]
  ) {

    remotePlayers[data.id].isReloading =
      true;
  }
});

// ============================================================
// RELOAD COMPLETE
// ============================================================

socket.on("reloadComplete", (data) => {

  if (!data) return;

  if (data.id === socket.id) {

    localPlayer.ammo =
      data.ammo;

    localPlayer.isReloading =
      false;

    updateHUD();

  } else if (
    remotePlayers[data.id]
  ) {

    remotePlayers[data.id].ammo =
      data.ammo;

    remotePlayers[data.id].isReloading =
      false;
  }
});

// ============================================================
// AMMO
// ============================================================

socket.on("ammoUpdate", (data) => {

  if (!data) return;

  localPlayer.ammo =
    data.ammo;

  updateHUD();
});

// ============================================================
// EMPTY MAGAZINE
// ============================================================

socket.on("emptyMagazine", () => {

  localPlayer.ammo = 0;

  updateHUD();

  addSystemMessage(
    "⚠ Magazine empty — press R to reload."
  );
});

// ============================================================
// BULLET FIRED
// ============================================================

socket.on("bulletFired", (bulletData) => {

  if (!bulletData) return;

  // We already created our own visual bullet.
  if (
    bulletData.ownerId === socket.id
  ) {
    return;
  }

  bullets.push({

    ...bulletData,

    life: 100,

    local: false
  });

  createMuzzleFlashForPosition(
    bulletData.x,
    bulletData.y
  );
});

// ============================================================
// DAMAGE
// ============================================================

socket.on("playerDamaged", (data) => {

  if (!data) return;

  if (data.targetId === socket.id) {

    const oldHealth =
      localPlayer.health;

    localPlayer.health =
      data.health;

    localPlayer.armor =
      data.armor;

    localPlayer.lockHits =
      data.lockHits;

    if (
      localPlayer.health <
      oldHealth
    ) {

      createDamageEffect();

      addDamageText(
        canvas.width / 2,
        canvas.height / 2 - 40,
        `-${oldHealth - localPlayer.health}`
      );
    }

    updateHUD();

  } else if (
    remotePlayers[data.targetId]
  ) {

    const target =
      remotePlayers[data.targetId];

    target.health =
      data.health;

    target.armor =
      data.armor;

    target.lockHits =
      data.lockHits;

    addDamageText(
      target.screenX || 0,
      target.screenY || 0,
      `-${25}`
    );
  }
});

// ============================================================
// PLAYER KILLED
// ============================================================

socket.on("playerKilled", (data) => {

  if (!data) return;

  addKillFeed(
    data.killerName,
    data.victimName
  );

  createDeathExplosion(
    data.victimId
  );

  if (data.killerId === socket.id) {

    addSystemMessage(
      `🎯 You eliminated ${data.victimName}!`
    );

  } else if (
    data.victimId === socket.id
  ) {

    addSystemMessage(
      `☠ You were eliminated by ${data.killerName}.`
    );

    localPlayer.isDead = true;
  }
});

// ============================================================
// RESPAWNING
// ============================================================

socket.on("playerRespawning", (data) => {

  if (!data) return;

  if (data.id === socket.id) {

    localPlayer.isDead = true;
  }
});

// ============================================================
// RESPAWNED
// ============================================================

socket.on("playerRespawned", (data) => {

  if (!data) return;

  if (data.id === socket.id) {

    applyPlayerData(
      localPlayer,
      data
    );

    localPlayer.isDead = false;

    addSystemMessage(
      "🔄 You have respawned!"
    );

    updateHUD();

  } else {

    if (!remotePlayers[data.id]) {

      remotePlayers[data.id] =
        createRemotePlayer(data);

    } else {

      applyPlayerData(
        remotePlayers[data.id],
        data
      );
    }
  }
});

// ============================================================
// VIOLET CELL LOCK
// ============================================================

socket.on("playerLocked", (data) => {

  if (!data) return;

  if (data.targetId === socket.id) {

    localPlayer.isLocked =
      true;

    localPlayer.x =
      data.x;

    localPlayer.y =
      data.y;

    localPlayer.health =
      MAX_HEALTH;

    localPlayer.armor =
      MAX_ARMOR;

    showCellOverlay(
      data.duration || 30000
    );

    addSystemMessage(
      "🟣 You have been locked in the Violet Cell!"
    );

  } else if (
    remotePlayers[data.targetId]
  ) {

    const player =
      remotePlayers[data.targetId];

    player.isLocked =
      true;

    player.targetX =
      data.x;

    player.targetY =
      data.y;
  }
});

// ============================================================
// VIOLET CELL UNLOCK
// ============================================================

socket.on("playerUnlocked", (data) => {

  if (!data) return;

  if (data.targetId === socket.id) {

    localPlayer.isLocked =
      false;

    localPlayer.x =
      data.x;

    localPlayer.y =
      data.y;

    hideCellOverlay();

    addSystemMessage(
      "🟢 Violet Cell unlocked!"
    );

  } else if (
    remotePlayers[data.targetId]
  ) {

    const player =
      remotePlayers[data.targetId];

    player.isLocked =
      false;

    player.targetX =
      data.x;

    player.targetY =
      data.y;
  }
});

// ============================================================
// CHAT
// ============================================================

socket.on("chatMessage", (data) => {

  if (!data) return;

  appendChatMessage(
    data.name,
    data.msg
  );
});

function appendChatMessage(name, message) {

  const div =
    document.createElement("div");

  const nameSpan =
    document.createElement("b");

  nameSpan.style.color =
    "#f59e0b";

  nameSpan.textContent =
    `${name}: `;

  div.appendChild(nameSpan);

  div.appendChild(
    document.createTextNode(message)
  );

  chatMessages.appendChild(div);

  chatMessages.scrollTop =
    chatMessages.scrollHeight;

  while (
    chatMessages.children.length > 50
  ) {

    chatMessages.removeChild(
      chatMessages.firstChild
    );
  }
}

function addSystemMessage(message) {

  appendChatMessage(
    "SYSTEM",
    message
  );
}

// ============================================================
// DISCONNECT
// ============================================================

socket.on("playerDisconnected", (id) => {

  if (remotePlayers[id]) {

    addSystemMessage(
      `${remotePlayers[id].name} left the battle.`
    );
  }

  delete remotePlayers[id];

  updateScoreboard();
});

// ============================================================
// CREATE REMOTE PLAYER
// ============================================================

function createRemotePlayer(data) {

  return {

    id: data.id,

    x: data.x,
    y: data.y,

    targetX: data.x,
    targetY: data.y,

    angle:
      data.rotation || 0,

    targetAngle:
      data.rotation || 0,

    name:
      data.name || "Opponent",

    health:
      data.health ?? MAX_HEALTH,

    armor:
      data.armor ?? MAX_ARMOR,

    kills:
      data.kills || 0,

    deaths:
      data.deaths || 0,

    ammo:
      data.ammo ?? MAGAZINE_SIZE,

    isReloading:
      Boolean(data.isReloading),

    isLocked:
      Boolean(data.isLocked),

    isSprinting:
      Boolean(data.isSprinting),

    animFrame: 0,

    isMoving: false,

    screenX: 0,
    screenY: 0
  };
}

function remotePlayersClear() {

  Object.keys(remotePlayers)
    .forEach(
      id => delete remotePlayers[id]
    );
}

// ============================================================
// APPLY PLAYER DATA
// ============================================================

function applyPlayerData(
  target,
  data
) {

  if (!target || !data) {
    return;
  }

  if (data.x !== undefined)
    target.x = data.x;

  if (data.y !== undefined)
    target.y = data.y;

  if (data.rotation !== undefined)
    target.angle = data.rotation;

  if (data.name !== undefined)
    target.name = data.name;

  if (data.health !== undefined)
    target.health = data.health;

  if (data.armor !== undefined)
    target.armor = data.armor;

  if (data.kills !== undefined)
    target.kills = data.kills;

  if (data.deaths !== undefined)
    target.deaths = data.deaths;

  if (data.ammo !== undefined)
    target.ammo = data.ammo;

  if (data.isReloading !== undefined)
    target.isReloading =
      data.isReloading;

  if (data.isLocked !== undefined)
    target.isLocked =
      data.isLocked;

  if (data.id !== undefined)
    target.id = data.id;
}

// ============================================================
// HUD
// ============================================================

function updateHUD() {

  const health =
    Math.max(
      0,
      Math.min(
        MAX_HEALTH,
        localPlayer.health
      )
    );

  const armor =
    Math.max(
      0,
      Math.min(
        MAX_ARMOR,
        localPlayer.armor
      )
    );

  healthBar.style.width =
    `${health}%`;

  armorBar.style.width =
    `${(armor / MAX_ARMOR) * 100}%`;

  healthValue.innerText =
    Math.round(health);

  armorValue.innerText =
    Math.round(armor);

  playerNameElement.innerText =
    localPlayer.name;

  if (localPlayer.isReloading) {

    ammoElement.innerText =
      "RELOADING...";

  } else {

    ammoElement.innerText =
      `${localPlayer.ammo} / ${MAGAZINE_SIZE}`;
  }
}

// ============================================================
// SCOREBOARD
// ============================================================

function updateScoreboard() {

  const allPlayers = [
    {
      id: localPlayer.id,
      name: localPlayer.name,
      kills: localPlayer.kills,
      deaths: localPlayer.deaths
    },

    ...Object.values(remotePlayers)
  ];

  allPlayers.sort(
    (a, b) =>
      b.kills - a.kills
  );

  scoreboardContent.innerHTML =
    "";

  allPlayers.forEach((player) => {

    const row =
      document.createElement("div");

    row.className =
      "score-row";

    const name =
      document.createElement("span");

    name.textContent =
      player.name;

    const kills =
      document.createElement("span");

    kills.textContent =
      player.kills;

    const deaths =
      document.createElement("span");

    deaths.textContent =
      player.deaths;

    row.appendChild(name);
    row.appendChild(kills);
    row.appendChild(deaths);

    scoreboardContent.appendChild(row);
  });
}

// ============================================================
// KILL FEED
// ============================================================

function addKillFeed(
  killer,
  victim
) {

  const div =
    document.createElement("div");

  div.className =
    "kill-message";

  div.textContent =
    `☠ ${killer}  ➜  ${victim}`;

  killFeed.appendChild(div);

  setTimeout(() => {

    if (div.parentNode) {
      div.parentNode.removeChild(div);
    }

  }, 5000);

  while (
    killFeed.children.length > 5
  ) {

    killFeed.removeChild(
      killFeed.firstChild
    );
  }
}

// ============================================================
// CELL OVERLAY
// ============================================================

let cellCountdownInterval = null;

function showCellOverlay(duration) {

  cellOverlay.style.display =
    "flex";

  let remaining =
    Math.ceil(duration / 1000);

  cellTimer.innerText =
    remaining;

  if (cellCountdownInterval) {

    clearInterval(
      cellCountdownInterval
    );
  }

  cellCountdownInterval =
    setInterval(() => {

      remaining--;

      cellTimer.innerText =
        Math.max(
          0,
          remaining
        );

      if (remaining <= 0) {

        clearInterval(
          cellCountdownInterval
        );
      }

    }, 1000);
}

function hideCellOverlay() {

  cellOverlay.style.display =
    "none";

  if (cellCountdownInterval) {

    clearInterval(
      cellCountdownInterval
    );

    cellCountdownInterval = null;
  }
}

// ============================================================
// PARTICLES
// ============================================================

function createParticle(
  x,
  y,
  vx,
  vy,
  life = 30,
  size = 3
) {

  particles.push({

    x,
    y,

    vx,
    vy,

    life,

    maxLife: life,

    size
  });
}

function createMuzzleFlash() {

  for (let i = 0; i < 8; i++) {

    const angle =
      localPlayer.angle +
      (Math.random() - .5) *
      .8;

    createParticle(

      localPlayer.x +
      Math.cos(localPlayer.angle) *
      28,

      localPlayer.y +
      Math.sin(localPlayer.angle) *
      28,

      Math.cos(angle) *
      (Math.random() * 3 + 2),

      Math.sin(angle) *
      (Math.random() * 3 + 2),

      15,

      2
    );
  }

  muzzleFlashes.push({

    x: localPlayer.x +
      Math.cos(localPlayer.angle) *
      30,

    y: localPlayer.y +
      Math.sin(localPlayer.angle) *
      30,

    angle: localPlayer.angle,

    life: 6
  });
}

function createMuzzleFlashForPosition(
  x,
  y
) {

  muzzleFlashes.push({

    x,
    y,

    angle: 0,

    life: 5
  });
}

function createDamageEffect() {

  for (let i = 0; i < 15; i++) {

    createParticle(

      localPlayer.x,
      localPlayer.y,

      (Math.random() - .5) * 5,
      (Math.random() - .5) * 5,

      30,

      2
    );
  }
}

function createDeathExplosion(id) {

  let x = localPlayer.x;
  let y = localPlayer.y;

  if (
    id !== socket.id &&
    remotePlayers[id]
  ) {

    x =
      remotePlayers[id].x;

    y =
      remotePlayers[id].y;
  }

  for (let i = 0; i < 30; i++) {

    const angle =
      Math.random() *
      Math.PI *
      2;

    const speed =
      Math.random() * 5 + 1;

    createParticle(

      x,
      y,

      Math.cos(angle) * speed,
      Math.sin(angle) * speed,

      45,

      Math.random() * 4 + 2
    );
  }
}

function addDamageText(
  x,
  y,
  text
) {

  damageTexts.push({

    x,
    y,

    text,

    life: 45
  });
}

// ============================================================
// UPDATE PARTICLES
// ============================================================

function updateEffects() {

  for (
    let i = particles.length - 1;
    i >= 0;
    i--
  ) {

    const p =
      particles[i];

    p.x += p.vx;
    p.y += p.vy;

    p.vx *= .97;
    p.vy *= .97;

    p.life--;

    if (p.life <= 0) {

      particles.splice(i, 1);
    }
  }

  for (
    let i = muzzleFlashes.length - 1;
    i >= 0;
    i--
  ) {

    muzzleFlashes[i].life--;

    if (
      muzzleFlashes[i].life <= 0
    ) {

      muzzleFlashes.splice(i, 1);
    }
  }

  for (
    let i = damageTexts.length - 1;
    i >= 0;
    i--
  ) {

    damageTexts[i].y -= .5;

    damageTexts[i].life--;

    if (
      damageTexts[i].life <= 0
    ) {

      damageTexts.splice(i, 1);
    }
  }
}

// ============================================================
// UPDATE REMOTE PLAYERS
// ============================================================

function updateRemotePlayers() {

  Object.values(remotePlayers)
    .forEach((p) => {

      const dx =
        p.targetX - p.x;

      const dy =
        p.targetY - p.y;

      p.x += dx * .25;
      p.y += dy * .25;

      let angleDifference =
        p.targetAngle - p.angle;

      while (
        angleDifference > Math.PI
      ) {
        angleDifference -=
          Math.PI * 2;
      }

      while (
        angleDifference < -Math.PI
      ) {
        angleDifference +=
          Math.PI * 2;
      }

      p.angle +=
        angleDifference * .25;

      p.isMoving =
        Math.hypot(dx, dy) > .4;

      if (p.isMoving) {
        p.animFrame++;
      }
    });
}

// ============================================================
// BULLETS
// ============================================================

function updateBullets() {

  for (
    let i = bullets.length - 1;
    i >= 0;
    i--
  ) {

    const b =
      bullets[i];

    b.x += b.vx;
    b.y += b.vy;

    b.life--;

    if (
      isWallTile(
        b.x,
        b.y
      ) ||
      b.life <= 0
    ) {

      bullets.splice(i, 1);

      continue;
    }
  }
}

// ============================================================
// MOVEMENT
// ============================================================

function updateMovement() {

  if (
    localPlayer.isLocked ||
    localPlayer.isDead
  ) {

    localPlayer.isMoving =
      false;

    return;
  }

  let dx = 0;
  let dy = 0;

  if (keys["KeyW"]) dy--;
  if (keys["KeyS"]) dy++;
  if (keys["KeyA"]) dx--;
  if (keys["KeyD"]) dx++;

  if (
    dx !== 0 &&
    dy !== 0
  ) {

    dx *= .7071;
    dy *= .7071;
  }

  const sprinting =
    localPlayer.isSprinting;

  const speed =
    sprinting
      ? SPRINT_SPEED
      : PLAYER_SPEED;

  const nextX =
    localPlayer.x +
    dx * speed;

  const nextY =
    localPlayer.y +
    dy * speed;

  if (
    canMoveTo(
      nextX,
      localPlayer.y
    )
  ) {

    localPlayer.x =
      nextX;
  }

  if (
    canMoveTo(
      localPlayer.x,
      nextY
    )
  ) {

    localPlayer.y =
      nextY;
  }

  localPlayer.isMoving =
    dx !== 0 ||
    dy !== 0;

  if (localPlayer.isMoving) {

    localPlayer.animFrame++;
  }
}

// ============================================================
// AIM
// ============================================================

function updateAim() {

  const centerX =
    canvas.width / 2;

  const centerY =
    canvas.height / 2;

  localPlayer.angle =
    Math.atan2(
      mouse.y - centerY,
      mouse.x - centerX
    );
}

// ============================================================
// SEND MOVEMENT
// ============================================================

let movementCounter = 0;

function syncMovement() {

  movementCounter++;

  if (
    movementCounter % 2 !== 0
  ) {
    return;
  }

  socket.emit(
    "playerMovement",
    {
      x: localPlayer.x,
      y: localPlayer.y,
      rotation: localPlayer.angle
    }
  );
}

// ============================================================
// MAZE RENDER
// ============================================================

function drawMaze(
  camX,
  camY
) {

  const startCol =
    Math.max(
      0,
      Math.floor(
        (camX -
          canvas.width / 2) /
        TILE_SIZE
      )
    );

  const endCol =
    Math.min(
      MAP_COLS,
      Math.ceil(
        (camX +
          canvas.width / 2) /
        TILE_SIZE
      )
    );

  const startRow =
    Math.max(
      0,
      Math.floor(
        (camY -
          canvas.height / 2) /
        TILE_SIZE
      )
    );

  const endRow =
    Math.min(
      MAP_ROWS,
      Math.ceil(
        (camY +
          canvas.height / 2) /
        TILE_SIZE
      )
    );

  for (
    let r = startRow;
    r < endRow;
    r++
  ) {

    for (
      let c = startCol;
      c < endCol;
      c++
    ) {

      const tile =
        mazeMap[r][c];

      const screenX =
        c * TILE_SIZE -
        camX +
        canvas.width / 2;

      const screenY =
        r * TILE_SIZE -
        camY +
        canvas.height / 2;

      // ------------------------------------------------------
      // WALL
      // ------------------------------------------------------

      if (tile === 1) {

        ctx.fillStyle =
          "#1e293b";

        ctx.fillRect(
          screenX,
          screenY,
          TILE_SIZE,
          TILE_SIZE
        );

        ctx.strokeStyle =
          "#334155";

        ctx.lineWidth = 2;

        ctx.strokeRect(
          screenX,
          screenY,
          TILE_SIZE,
          TILE_SIZE
        );

        // Wall highlight
        ctx.strokeStyle =
          "rgba(148,163,184,.12)";

        ctx.strokeRect(
          screenX + 5,
          screenY + 5,
          TILE_SIZE - 10,
          TILE_SIZE - 10
        );

      // ------------------------------------------------------
      // VIOLET CELL
      // ------------------------------------------------------

      } else if (tile === 2) {

        ctx.fillStyle =
          "#3b176b";

        ctx.fillRect(
          screenX,
          screenY,
          TILE_SIZE,
          TILE_SIZE
        );

        ctx.fillStyle =
          "rgba(168,85,247,.18)";

        ctx.fillRect(
          screenX,
          screenY,
          TILE_SIZE,
          TILE_SIZE
        );

        ctx.strokeStyle =
          "#a855f7";

        ctx.lineWidth = 2;

        ctx.strokeRect(
          screenX,
          screenY,
          TILE_SIZE,
          TILE_SIZE
        );

      // ------------------------------------------------------
      // FLOOR
      // ------------------------------------------------------

      } else {

        ctx.fillStyle =
          "#090d16";

        ctx.fillRect(
          screenX,
          screenY,
          TILE_SIZE,
          TILE_SIZE
        );

        ctx.strokeStyle =
          "#111827";

        ctx.lineWidth = 1;

        ctx.strokeRect(
          screenX,
          screenY,
          TILE_SIZE,
          TILE_SIZE
        );
      }
    }
  }
}

// ============================================================
// DRAW BULLETS
// ============================================================

function drawBullets(
  camX,
  camY
) {

  bullets.forEach((b) => {

    const screenX =
      b.x -
      camX +
      canvas.width / 2;

    const screenY =
      b.y -
      camY +
      canvas.height / 2;

    ctx.save();

    ctx.shadowColor =
      "#fef08a";

    ctx.shadowBlur =
      12;

    ctx.fillStyle =
      "#facc15";

    ctx.beginPath();

    ctx.arc(
      screenX,
      screenY,
      4,
      0,
      Math.PI * 2
    );

    ctx.fill();

    ctx.restore();
  });
}

// ============================================================
// DRAW SOLDIER
// ============================================================

function drawSoldier(
  player,
  vestColor,
  helmetColor,
  camX,
  camY,
  isLocal = false
) {

  const screenX =
    player.x -
    camX +
    canvas.width / 2;

  const screenY =
    player.y -
    camY +
    canvas.height / 2;

  player.screenX =
    screenX;

  player.screenY =
    screenY;

  ctx.save();

  ctx.translate(
    screenX,
    screenY
  );

  ctx.rotate(
    player.angle || 0
  );

  // ----------------------------------------------------------
  // SHADOW
  // ----------------------------------------------------------

  ctx.fillStyle =
    "rgba(0,0,0,.45)";

  ctx.beginPath();

  ctx.ellipse(
    0,
    10,
    20,
    9,
    0,
    0,
    Math.PI * 2
  );

  ctx.fill();

  // ----------------------------------------------------------
  // LEGS
  // ----------------------------------------------------------

  const legOffset =
    player.isMoving
      ? Math.sin(
          player.animFrame * .25
        ) * 7
      : 0;

  ctx.fillStyle =
    "#1e293b";

  ctx.fillRect(
    -12 + legOffset,
    -5,
    8,
    18
  );

  ctx.fillRect(
    4 - legOffset,
    -5,
    8,
    18
  );

  // ----------------------------------------------------------
  // BODY
  // ----------------------------------------------------------

  ctx.fillStyle =
    vestColor;

  ctx.beginPath();

  ctx.arc(
    0,
    0,
    16,
    0,
    Math.PI * 2
  );

  ctx.fill();

  // ----------------------------------------------------------
  // ARMOR
  // ----------------------------------------------------------

  ctx.fillStyle =
    "#334155";

  ctx.fillRect(
    -6,
    -18,
    12,
    6
  );

  ctx.fillRect(
    -6,
    12,
    12,
    6
  );

  // ----------------------------------------------------------
  // HEAD / HELMET
  // ----------------------------------------------------------

  ctx.fillStyle =
    helmetColor;

  ctx.beginPath();

  ctx.arc(
    0,
    0,
    10,
    0,
    Math.PI * 2
  );

  ctx.fill();

  // Visor
  ctx.fillStyle =
    "#020617";

  ctx.fillRect(
    2,
    -5,
    6,
    10
  );

  // ----------------------------------------------------------
  // ARMS
  // ----------------------------------------------------------

  ctx.fillStyle =
    "#f59e0b";

  ctx.beginPath();

  ctx.arc(
    12,
    -8,
    4,
    0,
    Math.PI * 2
  );

  ctx.arc(
    12,
    8,
    4,
    0,
    Math.PI * 2
  );

  ctx.fill();

  // ----------------------------------------------------------
  // RIFLE
  // ----------------------------------------------------------

  ctx.fillStyle =
    "#0f172a";

  ctx.fillRect(
    8,
    -3,
    22,
    6
  );

  ctx.fillStyle =
    "#64748b";

  ctx.fillRect(
    29,
    -1,
    8,
    3
  );

  // ----------------------------------------------------------
  // RELOADING INDICATOR
  // ----------------------------------------------------------

  if (player.isReloading) {

    ctx.strokeStyle =
      "#facc15";

    ctx.lineWidth = 2;

    ctx.beginPath();

    ctx.arc(
      0,
      0,
      24,
      0,
      Math.PI * 2
    );

    ctx.stroke();
  }

  ctx.restore();

  // ----------------------------------------------------------
  // NAME
  // ----------------------------------------------------------

  ctx.fillStyle =
    "#ffffff";

  ctx.font =
    "bold 12px sans-serif";

  ctx.textAlign =
    "center";

  ctx.fillText(
    player.name || "Soldier",
    screenX,
    screenY - 35
  );

  // ----------------------------------------------------------
  // HEALTH BAR
  // ----------------------------------------------------------

  const health =
    Math.max(
      0,
      player.health || 0
    );

  const healthWidth =
    42 *
    (health / MAX_HEALTH);

  ctx.fillStyle =
    "rgba(0,0,0,.7)";

  ctx.fillRect(
    screenX - 21,
    screenY - 29,
    42,
    5
  );

  ctx.fillStyle =
    "#22c55e";

  ctx.fillRect(
    screenX - 21,
    screenY - 29,
    healthWidth,
    5
  );

  // ----------------------------------------------------------
  // LOCK INDICATOR
  // ----------------------------------------------------------

  if (player.isLocked) {

    ctx.fillStyle =
      "#c084fc";

    ctx.font =
      "bold 11px sans-serif";

    ctx.fillText(
      "LOCKED",
      screenX,
      screenY + 35
    );
  }

  // Local player marker
  if (isLocal) {

    ctx.strokeStyle =
      "rgba(56,189,248,.5)";

    ctx.lineWidth =
      2;

    ctx.beginPath();

    ctx.arc(
      screenX,
      screenY,
      25,
      0,
      Math.PI * 2
    );

    ctx.stroke();
  }
}

// ============================================================
// DRAW EFFECTS
// ============================================================

function drawEffects(
  camX,
  camY
) {

  particles.forEach((p) => {

    const x =
      p.x -
      camX +
      canvas.width / 2;

    const y =
      p.y -
      camY +
      canvas.height / 2;

    const alpha =
      p.life / p.maxLife;

    ctx.globalAlpha =
      alpha;

    ctx.fillStyle =
      "#facc15";

    ctx.beginPath();

    ctx.arc(
      x,
      y,
      p.size,
      0,
      Math.PI * 2
    );

    ctx.fill();
  });

  ctx.globalAlpha = 1;

  muzzleFlashes.forEach((m) => {

    const x =
      m.x -
      camX +
      canvas.width / 2;

    const y =
      m.y -
      camY +
      canvas.height / 2;

    ctx.save();

    ctx.translate(
      x,
      y
    );

    ctx.rotate(
      m.angle
    );

    ctx.fillStyle =
      "#fef08a";

    ctx.shadowColor =
      "#facc15";

    ctx.shadowBlur =
      15;

    ctx.beginPath();

    ctx.moveTo(0, 0);

    ctx.lineTo(
      22,
      -7
    );

    ctx.lineTo(
      14,
      0
    );

    ctx.lineTo(
      22,
      7
    );

    ctx.closePath();

    ctx.fill();

    ctx.restore();
  });

  damageTexts.forEach((d) => {

    ctx.globalAlpha =
      d.life / 45;

    ctx.fillStyle =
      "#ef4444";

    ctx.font =
      "bold 16px sans-serif";

    ctx.textAlign =
      "center";

    ctx.fillText(
      d.text,
      d.x,
      d.y
    );
  });

  ctx.globalAlpha = 1;
}

// ============================================================
// GAME UPDATE
// ============================================================

function update() {

  if (
    namePortal.style.display !==
    "none"
  ) {
    return;
  }

  updateMovement();

  updateAim();

  if (mouse.down) {
    shootBullet();
  }

  syncMovement();

  updateBullets();

  updateRemotePlayers();

  updateEffects();

  updateHUD();
}

// ============================================================
// RENDER
// ============================================================

function render() {

  ctx.clearRect(
    0,
    0,
    canvas.width,
    canvas.height
  );

  const camX =
    localPlayer.x;

  const camY =
    localPlayer.y;

  drawMaze(
    camX,
    camY
  );

  // Remote players
  Object.values(remotePlayers)
    .forEach((player) => {

      drawSoldier(
        player,
        "#ec4899",
        "#9d174d",
        camX,
        camY,
        false
      );
    });

  // Bullets
  drawBullets(
    camX,
    camY
  );

  // Local player
  drawSoldier(
    localPlayer,
    "#2563eb",
    "#1d4ed8",
    camX,
    camY,
    true
  );

  drawEffects(
    camX,
    camY
  );

  // ----------------------------------------------------------
  // CROSSHAIR
  // ----------------------------------------------------------

  if (
    namePortal.style.display ===
    "none"
  ) {

    drawCrosshair();
  }

  // ----------------------------------------------------------
  // DEATH SCREEN
  // ----------------------------------------------------------

  if (localPlayer.isDead) {

    ctx.fillStyle =
      "rgba(0,0,0,.45)";

    ctx.fillRect(
      0,
      0,
      canvas.width,
      canvas.height
    );

    ctx.fillStyle =
      "#ef4444";

    ctx.font =
      "bold 32px sans-serif";

    ctx.textAlign =
      "center";

    ctx.fillText(
      "YOU WERE ELIMINATED",
      canvas.width / 2,
      canvas.height / 2
    );

    ctx.fillStyle =
      "#f8fafc";

    ctx.font =
      "16px sans-serif";

    ctx.fillText(
      "Respawning...",
      canvas.width / 2,
      canvas.height / 2 + 35
    );
  }
}

// ============================================================
// CROSSHAIR
// ============================================================

function drawCrosshair() {

  const x =
    mouse.x;

  const y =
    mouse.y;

  ctx.save();

  ctx.strokeStyle =
    "#facc15";

  ctx.lineWidth = 2;

  ctx.beginPath();

  ctx.moveTo(
    x - 10,
    y
  );

  ctx.lineTo(
    x - 3,
    y
  );

  ctx.moveTo(
    x + 3,
    y
  );

  ctx.lineTo(
    x + 10,
    y
  );

  ctx.moveTo(
    x,
    y - 10
  );

  ctx.lineTo(
    x,
    y - 3
  );

  ctx.moveTo(
    x,
    y + 3
  );

  ctx.lineTo(
    x,
    y + 10
  );

  ctx.stroke();

  ctx.restore();
}

// ============================================================
// GAME LOOP
// ============================================================

function gameLoop() {

  update();

  render();

  requestAnimationFrame(
    gameLoop
  );
}

gameLoop();
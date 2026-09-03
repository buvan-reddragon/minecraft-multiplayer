// client.js
const socket = io();

// --- 1. Three.js Core Scene & Daytime Ambience Setup ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x7dd3fc); // Daytime bright blue sky
scene.fog = new THREE.FogExp2(0xbae6fd, 0.003);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

// Daytime Sun & Ambient Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.95);
scene.add(ambientLight);

const sunLight = new THREE.DirectionalLight(0xfffbe1, 1.8);
sunLight.position.set(150, 220, 100);
sunLight.castShadow = true;
scene.add(sunLight);

// --- 2. Custom Island Map & Edge Exploration ---
function getIslandRadius(angle) {
  const baseR = 140;
  return baseR + Math.sin(angle * 2) * 20 + Math.cos(angle * 3) * 15 - Math.sin(angle * 5) * 10;
}

function isInsideIsland(x, z) {
  const angle = Math.atan2(z, x);
  return Math.sqrt(x * x + z * z) <= getIslandRadius(angle);
}

// Ocean Surface
const sea = new THREE.Mesh(
  new THREE.PlaneGeometry(800, 800),
  new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.1, metalness: 0.8, transparent: true, opacity: 0.85 })
);
sea.rotation.x = -Math.PI / 2; sea.position.y = -0.5;
scene.add(sea);

// Custom Shaped Island
const islandGeo = new THREE.PlaneGeometry(350, 350, 128, 128);
islandGeo.rotateX(-Math.PI / 2);
const posAttr = islandGeo.attributes.position;

for (let i = 0; i < posAttr.count; i++) {
  const x = posAttr.getX(i);
  const z = posAttr.getZ(i);
  const angle = Math.atan2(z, x);
  const r = getIslandRadius(angle);
  const dist = Math.sqrt(x * x + z * z);
  const lakeDist = Math.sqrt(Math.pow(x - 30, 2) + Math.pow(z + 20, 2));

  if (lakeDist < 12) posAttr.setY(i, -0.8);
  else if (dist > r) posAttr.setY(i, -3.0);
  else if (dist > r - 12) posAttr.setY(i, ((r - dist) / 12 - 1) * 2.0);
  else posAttr.setY(i, 0);
}
islandGeo.computeVertexNormals();

const island = new THREE.Mesh(islandGeo, new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.8 }));
island.receiveShadow = true;
scene.add(island);

// Sand Shoreline Border
const sandRing = new THREE.Mesh(
  new THREE.RingGeometry(110, 160, 64).rotateX(-Math.PI / 2),
  new THREE.MeshBasicMaterial({ color: 0xfde047, side: THREE.DoubleSide })
);
sandRing.position.y = -0.1;
scene.add(sandRing);

// --- 3. Minecraft-Style Voxel Cherry Blossom Trees & Air Flow Petals ---
function createBlockyCherryTree() {
  const treeGroup = new THREE.Group();
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x582f0e, roughness: 0.9 });
  const leafMat = new THREE.MeshStandardMaterial({ color: 0xf472b6, roughness: 0.5 }); // Bright Pink

  // Voxel Trunk
  for (let y = 0; y < 6; y++) {
    const trunkBlock = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.2, 1.2), woodMat);
    trunkBlock.position.y = y * 1.2 + 0.6;
    treeGroup.add(trunkBlock);
  }

  // Voxel Canopy
  for (let x = -2; x <= 2; x++) {
    for (let y = 4; y <= 7; y++) {
      for (let z = -2; z <= 2; z++) {
        if (Math.abs(x) === 2 && Math.abs(z) === 2 && y > 5) continue;
        const leafBlock = new THREE.Mesh(new THREE.BoxGeometry(1.15, 1.15, 1.15), leafMat);
        leafBlock.position.set(x * 1.15, y * 1.15 + 0.6, z * 1.15);
        treeGroup.add(leafBlock);
      }
    }
  }
  return treeGroup;
}

for (let i = 0; i < 30; i++) {
  const tree = createBlockyCherryTree();
  const ang = Math.random() * Math.PI * 2;
  const r = 25 + Math.random() * (getIslandRadius(ang) - 40);
  tree.position.set(Math.cos(ang) * r, 0, Math.sin(ang) * r);
  scene.add(tree);
}

// Floating Cherry Petals in Air Flow
const cherryPetals = [];
const petalGeo = new THREE.PlaneGeometry(0.3, 0.3);
const petalMat = new THREE.MeshBasicMaterial({ color: 0xf472b6, side: THREE.DoubleSide, transparent: true, opacity: 0.85 });

for (let i = 0; i < 180; i++) {
  const petal = new THREE.Mesh(petalGeo, petalMat);
  const ang = Math.random() * Math.PI * 2;
  const r = Math.random() * 130;
  petal.position.set(Math.cos(ang) * r, Math.random() * 12 + 1, Math.sin(ang) * r);
  petal.userData = {
    speedY: Math.random() * 0.02 + 0.01,
    driftX: Math.random() * 0.03 + 0.01,
    rotSpeed: Math.random() * 0.05
  };
  scene.add(petal);
  cherryPetals.push(petal);
}

// Rocks & Butterflies
function createRock() {
  const rockGeo = new THREE.DodecahedronGeometry(Math.random() * 1.5 + 0.8, 1);
  const rockMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.9 });
  const rock = new THREE.Mesh(rockGeo, rockMat);
  rock.scale.set(1 + Math.random() * 0.5, 0.6 + Math.random() * 0.4, 1 + Math.random() * 0.5);
  return rock;
}

for (let i = 0; i < 40; i++) {
  const rock = createRock();
  const ang = Math.random() * Math.PI * 2;
  const rad = 20 + Math.random() * (getIslandRadius(ang) - 10);
  rock.position.set(Math.cos(ang) * rad, 0.5, Math.sin(ang) * rad);
  scene.add(rock);
}

const butterflies = [];
const butterflyColors = [0x38bdf8, 0xfacc15, 0xc084fc, 0xf43f5e];

function createButterfly() {
  const group = new THREE.Group();
  const col = butterflyColors[Math.floor(Math.random() * butterflyColors.length)];
  const wingMat = new THREE.MeshBasicMaterial({ color: col, side: THREE.DoubleSide });
  const wingGeo = new THREE.PlaneGeometry(0.35, 0.35);

  const leftWing = new THREE.Mesh(wingGeo, wingMat);
  leftWing.position.x = -0.18; group.add(leftWing);
  const rightWing = new THREE.Mesh(wingGeo, wingMat);
  rightWing.position.x = 0.18; group.add(rightWing);

  group.userData = {
    leftWing, rightWing,
    baseY: Math.random() * 4 + 1.2,
    ang: Math.random() * Math.PI * 2
  };
  return group;
}

for (let i = 0; i < 30; i++) {
  const b = createButterfly();
  const ang = Math.random() * Math.PI * 2;
  const r = Math.random() * 100;
  b.position.set(Math.cos(ang) * r, b.userData.baseY, Math.sin(ang) * r);
  scene.add(b);
  butterflies.push(b);
}

// Sky Portal Spawn Hub
const skyWormholeGroup = new THREE.Group();
skyWormholeGroup.position.set(0, 45, 0);

const wormholeCore = new THREE.Mesh(
  new THREE.SphereGeometry(4.5, 32, 32),
  new THREE.MeshBasicMaterial({ color: 0x38bdf8, wireframe: true })
);
skyWormholeGroup.add(wormholeCore);

for (let i = 1; i <= 4; i++) {
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(i * 2.8, 0.35, 16, 64),
    new THREE.MeshBasicMaterial({ color: i % 2 === 0 ? 0x06b6d4 : 0xf472b6, transparent: true, opacity: 0.8 })
  );
  ring.rotation.x = Math.PI / 2 + (i * 0.2);
  skyWormholeGroup.add(ring);
}
scene.add(skyWormholeGroup);

// Ground Spawn Hub
const groundPortal = new THREE.Mesh(
  new THREE.TorusGeometry(4.0, 0.3, 16, 64).rotateX(Math.PI / 2),
  new THREE.MeshBasicMaterial({ color: 0x06b6d4 })
);
groundPortal.position.y = 0.1;
scene.add(groundPortal);

// --- 4. Name Tag Sprite ---
function createNameTagSprite(text) {
  const canvas = document.createElement('canvas');
  canvas.width = 256; canvas.height = 64;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = 'rgba(15, 23, 42, 0.8)'; ctx.fillRect(0, 0, 256, 64);
  ctx.strokeStyle = '#38bdf8'; ctx.lineWidth = 4; ctx.strokeRect(0, 0, 256, 64);
  ctx.font = 'Bold 24px sans-serif'; ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center'; ctx.fillText(text, 128, 40);

  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(canvas), transparent: true }));
  sprite.scale.set(2, 0.5, 1);
  sprite.position.y = 2.9;
  return sprite;
}

// --- 5. Blue Knight Character Builder (With Gun & Walk Joint Pivots) ---
function createKnightMesh(nameTagText) {
  const group = new THREE.Group();
  
  // Blue Armor Materials matching image_7e0b08.png
  const armorMat = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, metalness: 0.75, roughness: 0.3 });
  const trimMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.9, roughness: 0.2 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.7 });

  // Torso
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.15, 0.55), armorMat);
  torso.position.y = 1.15; group.add(torso);
  const chestTrim = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.3, 0.57), trimMat);
  chestTrim.position.y = 1.35; group.add(chestTrim);

  // Helmet
  const helmet = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 0.6), armorMat);
  helmet.position.y = 2.0; group.add(helmet);
  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.15, 0.62), darkMat);
  visor.position.set(0, 2.0, 0.02); group.add(visor);
  const crest = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.45, 0.5), trimMat);
  crest.position.set(0, 2.4, -0.05); group.add(crest);

  // Limbs with Walk Pivots
  const armLegGeo = new THREE.BoxGeometry(0.38, 1.0, 0.38);
  armLegGeo.translate(0, -0.5, 0);

  const leftLegPivot = new THREE.Group(); leftLegPivot.position.set(-0.24, 0.9, 0);
  leftLegPivot.add(new THREE.Mesh(armLegGeo, armorMat)); group.add(leftLegPivot);

  const rightLegPivot = new THREE.Group(); rightLegPivot.position.set(0.24, 0.9, 0);
  rightLegPivot.add(new THREE.Mesh(armLegGeo, armorMat)); group.add(rightLegPivot);

  const leftArmPivot = new THREE.Group(); leftArmPivot.position.set(-0.65, 1.6, 0);
  leftArmPivot.add(new THREE.Mesh(armLegGeo, armorMat)); group.add(leftArmPivot);

  const rightArmPivot = new THREE.Group(); rightArmPivot.position.set(0.65, 1.6, 0);
  rightArmPivot.add(new THREE.Mesh(armLegGeo, armorMat));

  // Gun Weapon Attached to Right Arm
  const gunGroup = new THREE.Group();
  const gunBody = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.18, 0.75), darkMat);
  gunBody.position.set(0, -0.75, 0.4); gunGroup.add(gunBody);
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.5).rotateX(Math.PI / 2), trimMat);
  barrel.position.set(0, -0.7, 0.8); gunGroup.add(barrel);
  rightArmPivot.add(gunGroup);

  group.add(rightArmPivot);
  group.add(createNameTagSprite(nameTagText || 'Knight'));

  group.userData = {
    leftLegPivot, rightLegPivot, leftArmPivot, rightArmPivot,
    gunGroup, barrel, isMounted: false, animTime: 0
  };
  return group;
}

// --- 6. Horse Steed Mesh ---
function createHorseMesh() {
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.8 });

  const body = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.2, 2.6), bodyMat);
  body.position.y = 1.4; group.add(body);

  const neck = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.3, 0.7), bodyMat);
  neck.position.set(0, 2.2, -0.9); neck.rotation.x = -0.4; group.add(neck);

  const head = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.55, 1.0), bodyMat);
  head.position.set(0, 2.7, -1.3); group.add(head);

  const legGeo = new THREE.BoxGeometry(0.3, 1.2, 0.3);
  const legPositions = [[-0.4, 0.6, 0.9], [0.4, 0.6, 0.9], [-0.4, 0.6, -0.9], [0.4, 0.6, -0.9]];
  legPositions.forEach(p => {
    const leg = new THREE.Mesh(legGeo, bodyMat);
    leg.position.set(p[0], p[1], p[2]); group.add(leg);
  });

  return group;
}

let horseSteed = null;

// --- 7. Bullets & Shooting Mechanics ---
const activeBullets = [];

function fireBullet(originPos, targetDirection) {
  const bulletGeo = new THREE.SphereGeometry(0.18, 8, 8);
  const bulletMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
  const bullet = new THREE.Mesh(bulletGeo, bulletMat);
  bullet.position.copy(originPos);

  const velocity = targetDirection.clone().multiplyScalar(1.2);
  activeBullets.push({ mesh: bullet, vel: velocity, life: 60 });
  scene.add(bullet);
}

// --- 8. Henderman (Minecraft Enderman Style) NPCs & Boss ---
function createHendermanMesh() {
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.9 }); // Tall Dark Body
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0xa855f7 }); // Purple Glowing Eyes

  // Tall Skinny Torso & Head
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.4, 1.8, 0.3), bodyMat);
  body.position.y = 1.8; group.add(body);

  const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), bodyMat);
  head.position.y = 2.95; group.add(head);

  // Purple Eyes
  const eye1 = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.06, 0.05), eyeMat);
  eye1.position.set(-0.14, 2.95, 0.26); group.add(eye1);
  const eye2 = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.06, 0.05), eyeMat);
  eye2.position.set(0.14, 2.95, 0.26); group.add(eye2);

  // Long Limbs
  const legGeo = new THREE.BoxGeometry(0.15, 1.8, 0.15); legGeo.translate(0, -0.9, 0);
  const leftLegPivot = new THREE.Group(); leftLegPivot.position.set(-0.15, 1.8, 0);
  leftLegPivot.add(new THREE.Mesh(legGeo, bodyMat)); group.add(leftLegPivot);

  const rightLegPivot = new THREE.Group(); rightLegPivot.position.set(0.15, 1.8, 0);
  rightLegPivot.add(new THREE.Mesh(legGeo, bodyMat)); group.add(rightLegPivot);

  group.userData = { leftLegPivot, rightLegPivot, hp: 3, lastAttackTime: 0 };
  return group;
}

const hendermenNPCs = [];
function spawnHenderman() {
  const henderman = createHendermanMesh();
  const ang = Math.random() * Math.PI * 2;
  const r = 20 + Math.random() * (getIslandRadius(ang) - 35);
  henderman.position.set(Math.cos(ang) * r, 0, Math.sin(ang) * r);
  scene.add(henderman);
  hendermenNPCs.push({ mesh: henderman, speed: 0.05 });
}

for (let i = 0; i < 18; i++) spawnHenderman();

// Fatty Jelly Boss
let bossMesh = null;
let bossHP = 500;
let maxBossHP = 500;
let totalHendermenKills = 0;

function createFattyJellyBoss() {
  const group = new THREE.Group();
  const jellyMat = new THREE.MeshStandardMaterial({
    color: 0xec4899, roughness: 0.1, metalness: 0.2, transparent: true, opacity: 0.85
  });

  const body = new THREE.Mesh(new THREE.SphereGeometry(6, 32, 32), jellyMat);
  body.scale.set(1.2, 0.8, 1.2); body.position.y = 4.2; group.add(body);

  const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const pupilMat = new THREE.MeshBasicMaterial({ color: 0x000000 });

  for (let i = -1; i <= 1; i += 2) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.8, 16, 16), eyeMat);
    eye.position.set(i * 1.8, 5.2, 5.0); group.add(eye);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.4, 16, 16), pupilMat);
    pupil.position.set(i * 1.8, 5.2, 5.7); group.add(pupil);
  }

  group.position.set(0, 0, -30);
  return group;
}

function spawnBossEvent() {
  if (bossMesh) return;
  bossMesh = createFattyJellyBoss();
  scene.add(bossMesh);
  document.getElementById('boss-hud').style.display = 'flex';
}

// --- 9. Local Player, Free 360 Camera & Controls ---
let localPlayer = null;
let localUsername = "Knight";
let localHealth = 100;
let isJumping = false;
let verticalVelocity = 0;
let isAiming = false;
const remotePlayers = {};

let yaw = 0;
let pitch = 0.2;

document.addEventListener('click', () => {
  if (document.getElementById('name-portal').style.display === 'none' && document.activeElement !== chatInput) {
    renderer.domElement.requestPointerLock();
  }
});

document.addEventListener('mousemove', (e) => {
  if (document.pointerLockElement === renderer.domElement) {
    yaw -= e.movementX * 0.003;
    pitch += e.movementY * 0.003;
    pitch = Math.max(-Math.PI / 2 + 0.05, Math.min(Math.PI / 2 - 0.05, pitch));
  }
});

// Join Game
document.getElementById('join-btn').addEventListener('click', () => {
  const input = document.getElementById('username-input').value.trim();
  if (input !== "") localUsername = input;

  document.getElementById('name-portal').style.display = 'none';

  localPlayer = createKnightMesh(localUsername);
  localPlayer.position.set(0, 45, 0); // Sky Wormhole drop spawn
  scene.add(localPlayer);

  horseSteed = createHorseMesh();
  horseSteed.position.set(3, 0, 3);
  scene.add(horseSteed);

  socket.emit('joinGame', localUsername);
});

// Chat Integration on Enter Key
const chatInput = document.getElementById('chat-input');
const chatMessages = document.getElementById('chat-messages');

window.addEventListener('keydown', (e) => {
  // Enter key opens/sends Chat
  if (e.code === 'Enter') {
    if (document.activeElement === chatInput) {
      const msg = chatInput.value.trim();
      if (msg !== "") {
        appendChatMessage(`${localUsername}: ${msg}`);
        chatInput.value = "";
      }
      chatInput.blur();
      renderer.domElement.requestPointerLock();
    } else {
      document.exitPointerLock();
      chatInput.focus();
    }
    return;
  }

  if (document.activeElement === chatInput) return;

  keys[e.code] = true;

  // Jump Skill: Space
  if (e.code === 'Space' && !isJumping && localPlayer) {
    const minY = localPlayer.userData.isMounted ? 1.2 : 0;
    if (localPlayer.position.y <= minY + 0.1) {
      isJumping = true;
      verticalVelocity = 0.24;
    }
  }

  // Toggle Aim Camera: F
  if (e.code === 'KeyF' && localPlayer) {
    isAiming = !isAiming;
    document.getElementById('crosshair').style.display = isAiming ? 'block' : 'none';
  }

  // Shoot Gun: G
  if (e.code === 'KeyG' && localPlayer) {
    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    const startPos = localPlayer.position.clone().add(new THREE.Vector3(0, 1.4, 0));
    fireBullet(startPos, dir);
  }

  // Mount/Dismount Horse: H
  if (e.code === 'KeyH' && localPlayer && horseSteed) {
    if (!localPlayer.userData.isMounted) {
      if (localPlayer.position.distanceTo(horseSteed.position) < 5) {
        localPlayer.userData.isMounted = true;
        horseSteed.visible = false;
        localPlayer.position.y = 1.2;
      }
    } else {
      localPlayer.userData.isMounted = false;
      horseSteed.visible = true;
      horseSteed.position.copy(localPlayer.position);
      horseSteed.position.y = 0;
      localPlayer.position.y = 0;
    }
  }
});

window.addEventListener('keyup', (e) => (keys[e.code] = false));

function appendChatMessage(text) {
  const div = document.createElement('div');
  div.innerText = text;
  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Network Handlers
socket.on('currentPlayers', (players) => {
  Object.keys(players).forEach((id) => {
    if (id !== socket.id && !remotePlayers[id]) {
      const knight = createKnightMesh(players[id].name);
      knight.position.set(players[id].x, players[id].y, players[id].z);
      scene.add(knight);
      remotePlayers[id] = knight;
    }
  });
});

socket.on('newPlayer', (data) => {
  if (data.id !== socket.id && !remotePlayers[data.id]) {
    const knight = createKnightMesh(data.name);
    knight.position.set(data.x, data.y, data.z);
    scene.add(knight);
    remotePlayers[data.id] = knight;
  }
});

socket.on('playerMoved', (data) => {
  const knight = remotePlayers[data.id];
  if (knight) {
    knight.position.set(data.x, data.y, data.z);
    knight.rotation.y = data.rotation;
  }
});

socket.on('healthUpdate', (data) => {
  if (data.id === socket.id) {
    localHealth = data.health;
    updateHealthUI();
  }
});

socket.on('playerRespawned', (data) => {
  if (data.id === socket.id) {
    localHealth = 100;
    updateHealthUI();
    localPlayer.position.set(data.x, 45, data.z);
  }
});

socket.on('playerDisconnected', (id) => {
  if (remotePlayers[id]) {
    scene.remove(remotePlayers[id]);
    delete remotePlayers[id];
  }
});

function updateHealthUI() {
  const fill = document.getElementById('health-bar-fill');
  fill.style.width = `${(localHealth / 100) * 100}%`;
  document.getElementById('health-text').innerText = `HP: ${localHealth} / 100`;
}

// Minimap
const minimapCanvas = document.getElementById('minimap-canvas');
const mCtx = minimapCanvas.getContext('2d');

function updateMinimap() {
  mCtx.clearRect(0, 0, 150, 150);
  mCtx.fillStyle = '#0f172a'; mCtx.fillRect(0, 0, 150, 150);

  mCtx.fillStyle = '#22c55e';
  mCtx.beginPath(); mCtx.arc(75, 75, 60, 0, Math.PI * 2); mCtx.fill();

  if (!localPlayer) return;
  const scale = 0.4;

  // Hendermen (Purple Dots)
  mCtx.fillStyle = '#a855f7';
  hendermenNPCs.forEach((npc) => {
    const dx = 75 + (npc.mesh.position.x - localPlayer.position.x) * scale;
    const dy = 75 + (npc.mesh.position.z - localPlayer.position.z) * scale;
    if (dx >= 0 && dx <= 150 && dy >= 0 && dy <= 150) {
      mCtx.beginPath(); mCtx.arc(dx, dy, 3, 0, Math.PI * 2); mCtx.fill();
    }
  });

  // Local Player (Blue Dot)
  mCtx.fillStyle = '#38bdf8';
  mCtx.beginPath(); mCtx.arc(75, 75, 5, 0, Math.PI * 2); mCtx.fill();
}

// --- 10. Main Game Loop ---
const keys = {};
const now = () => performance.now();

function animate() {
  requestAnimationFrame(animate);

  // Environment Animations
  skyWormholeGroup.rotation.y += 0.03;

  // Cherry Blossom Air Flow Motion
  cherryPetals.forEach(p => {
    p.position.y -= p.userData.speedY;
    p.position.x += p.userData.driftX;
    p.rotation.z += p.userData.rotSpeed;
    if (p.position.y < 0) {
      p.position.y = 12;
      p.position.x = (Math.random() - 0.5) * 200;
    }
  });

  // Butterflies
  butterflies.forEach(b => {
    b.userData.ang += 0.03;
    b.position.y = b.userData.baseY + Math.sin(b.userData.ang * 2) * 0.4;
    const flap = Math.sin(b.userData.ang * 12) * 0.6;
    b.userData.leftWing.rotation.y = flap;
    b.userData.rightWing.rotation.y = -flap;
  });

  // Bullets
  for (let i = activeBullets.length - 1; i >= 0; i--) {
    const b = activeBullets[i];
    b.mesh.position.add(b.vel);
    b.life--;

    for (let j = hendermenNPCs.length - 1; j >= 0; j--) {
      const henderman = hendermenNPCs[j].mesh;
      if (b.mesh.position.distanceTo(henderman.position) < 1.8) {
        henderman.userData.hp -= 1;
        if (henderman.userData.hp <= 0) {
          scene.remove(henderman);
          hendermenNPCs.splice(j, 1);
          totalHendermenKills++;
          document.getElementById('kill-counter').innerText = `Hendermen Slain: ${totalHendermenKills} / 100`;
          if (totalHendermenKills >= 100) spawnBossEvent();
          setTimeout(spawnHenderman, 2000);
        }
        scene.remove(b.mesh);
        activeBullets.splice(i, 1);
        break;
      }
    }
  }

  // Hendermen AI
  hendermenNPCs.forEach((npc) => {
    const hm = npc.mesh;
    if (localPlayer) {
      const dist = hm.position.distanceTo(localPlayer.position);
      if (dist < 22) {
        hm.lookAt(localPlayer.position.x, hm.position.y, localPlayer.position.z);
        hm.translateZ(npc.speed);
        if (dist <= 2.2 && now() - hm.userData.lastAttackTime > 1200) {
          hm.userData.lastAttackTime = now();
          socket.emit('playerDamage', 5);
        }
      }
    }
  });

  // Local Player Movement & Walking Animation
  if (localPlayer) {
    let isMoving = false;
    const speed = localPlayer.userData.isMounted ? 0.26 : 0.14;

    if (document.activeElement !== chatInput) {
      if (keys['ArrowLeft']) yaw += 0.03;
      if (keys['ArrowRight']) yaw -= 0.03;
      if (keys['ArrowUp']) pitch = Math.min(Math.PI / 2 - 0.05, pitch + 0.025);
      if (keys['ArrowDown']) pitch = Math.max(-Math.PI / 2 + 0.05, pitch - 0.025);

      const prevPos = localPlayer.position.clone();

      if (keys['KeyW']) { localPlayer.translateZ(-speed); isMoving = true; }
      if (keys['KeyS']) { localPlayer.translateZ(speed); isMoving = true; }
      if (keys['KeyA']) { localPlayer.translateX(-speed); isMoving = true; }
      if (keys['KeyD']) { localPlayer.translateX(speed); isMoving = true; }

      if (!isInsideIsland(localPlayer.position.x, localPlayer.position.z)) {
        localPlayer.position.copy(prevPos);
      }
    }

    localPlayer.rotation.y = yaw;

    // Walking Limb Swing Animation Logic
    if (isMoving && !localPlayer.userData.isMounted) {
      localPlayer.userData.animTime += 0.18;
      const swing = Math.sin(localPlayer.userData.animTime) * 0.65;
      localPlayer.userData.leftLegPivot.rotation.x = swing;
      localPlayer.userData.rightLegPivot.rotation.x = -swing;
      localPlayer.userData.leftArmPivot.rotation.x = -swing;
    } else {
      localPlayer.userData.leftLegPivot.rotation.x = 0;
      localPlayer.userData.rightLegPivot.rotation.x = 0;
      localPlayer.userData.leftArmPivot.rotation.x = 0;
    }

    // Jump Gravity
    const minY = localPlayer.userData.isMounted ? 1.2 : 0;
    if (localPlayer.position.y > minY && !isJumping) {
      localPlayer.position.y = Math.max(minY, localPlayer.position.y - 0.45);
    }

    if (isJumping) {
      localPlayer.position.y += verticalVelocity;
      verticalVelocity -= 0.012;
      if (localPlayer.position.y <= minY) {
        localPlayer.position.y = minY;
        isJumping = false;
      }
    }

    socket.emit('playerMovement', {
      x: localPlayer.position.x,
      y: localPlayer.position.y,
      z: localPlayer.position.z,
      rotation: localPlayer.rotation.y
    });

    // Camera Target
    const camDist = isAiming ? 3.5 : 8;
    const camX = localPlayer.position.x + camDist * Math.sin(yaw) * Math.cos(pitch);
    const camY = localPlayer.position.y + camDist * Math.sin(pitch) + (isAiming ? 1.9 : 1.8);
    const camZ = localPlayer.position.z + camDist * Math.cos(yaw) * Math.cos(pitch);

    camera.position.set(camX, camY, camZ);
    camera.lookAt(localPlayer.position.x, localPlayer.position.y + 1.5, localPlayer.position.z);
  }

  updateMinimap();
  renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();
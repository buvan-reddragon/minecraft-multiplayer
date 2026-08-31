// client.js
const socket = io();

// --- 1. Three.js Core Scene & Camera Setup ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b0712);
scene.fog = new THREE.FogExp2(0x191024, 0.005);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

// Lighting
const ambientLight = new THREE.AmbientLight(0x7c3aed, 0.85);
scene.add(ambientLight);

const moonLight = new THREE.DirectionalLight(0xe0e7ff, 2.0);
moonLight.position.set(120, 180, -220);
moonLight.castShadow = true;
scene.add(moonLight);

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

const island = new THREE.Mesh(islandGeo, new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.85 }));
island.receiveShadow = true;
scene.add(island);

// Sand Shoreline Border
const sandRing = new THREE.Mesh(
  new THREE.RingGeometry(110, 160, 64).rotateX(-Math.PI / 2),
  new THREE.MeshBasicMaterial({ color: 0xeab308, side: THREE.DoubleSide })
);
sandRing.position.y = -0.1;
scene.add(sandRing);

// --- 3. Nature Polish: Rocks & Butterflies ---
// Boulder Props around shores & land
function createRock() {
  const rockGeo = new THREE.DodecahedronGeometry(Math.random() * 1.5 + 0.8, 1);
  const rockMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.9 });
  const rock = new THREE.Mesh(rockGeo, rockMat);
  rock.scale.set(1 + Math.random() * 0.5, 0.6 + Math.random() * 0.4, 1 + Math.random() * 0.5);
  return rock;
}

for (let i = 0; i < 45; i++) {
  const rock = createRock();
  const ang = Math.random() * Math.PI * 2;
  const rad = 20 + Math.random() * (getIslandRadius(ang) - 10);
  rock.position.set(Math.cos(ang) * rad, 0.5, Math.sin(ang) * rad);
  rock.rotation.set(Math.random(), Math.random(), Math.random());
  scene.add(rock);
}

// Butterflies
const butterflies = [];
const butterflyColors = [0xf43f5e, 0x3b82f6, 0xeab308, 0xa855f7];

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
    speed: Math.random() * 0.04 + 0.02,
    ang: Math.random() * Math.PI * 2
  };
  return group;
}

for (let i = 0; i < 35; i++) {
  const b = createButterfly();
  const ang = Math.random() * Math.PI * 2;
  const r = Math.random() * 100;
  b.position.set(Math.cos(ang) * r, b.userData.baseY, Math.sin(ang) * r);
  scene.add(b);
  butterflies.push(b);
}

// --- 4. Celestial Moon & Sky Wormhole Portal ---
function createMoonTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 512;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#d1d5db'; ctx.fillRect(0, 0, 512, 512);

  for (let i = 0; i < 90; i++) {
    const x = Math.random() * 512, y = Math.random() * 512, r = Math.random() * 35 + 5;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(75, 85, 99, 0.35)'; ctx.fill();
    ctx.strokeStyle = 'rgba(55, 65, 81, 0.5)'; ctx.lineWidth = 2; ctx.stroke();
  }
  return new THREE.CanvasTexture(canvas);
}

const moonMesh = new THREE.Mesh(
  new THREE.SphereGeometry(22, 32, 32),
  new THREE.MeshStandardMaterial({ map: createMoonTexture(), roughness: 0.9 })
);
moonMesh.position.set(140, 130, -220);
scene.add(moonMesh);

// Sky Wormhole Group
const skyWormholeGroup = new THREE.Group();
skyWormholeGroup.position.set(0, 45, 0);

const wormholeCore = new THREE.Mesh(
  new THREE.SphereGeometry(4.5, 32, 32),
  new THREE.MeshBasicMaterial({ color: 0xa855f7, wireframe: true })
);
skyWormholeGroup.add(wormholeCore);

for (let i = 1; i <= 4; i++) {
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(i * 2.8, 0.35, 16, 64),
    new THREE.MeshBasicMaterial({ color: i % 2 === 0 ? 0x06b6d4 : 0xec4899, transparent: true, opacity: 0.8 })
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

// --- 5. Name Tag Sprite ---
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

// --- 6. Blue Knight Character Builder (With Gun) ---
function createKnightMesh(nameTagText) {
  const group = new THREE.Group();
  
  // Blue Armor Materials matching image_7e0b08.png
  const armorMat = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, metalness: 0.75, roughness: 0.3 });
  const trimMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.9, roughness: 0.2 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.7 });

  // Torso & Plated Chest
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.15, 0.55), armorMat);
  torso.position.y = 1.15; group.add(torso);
  const chestTrim = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.3, 0.57), trimMat);
  chestTrim.position.y = 1.35; group.add(chestTrim);

  // Helmet with Crest Wings
  const helmet = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 0.6), armorMat);
  helmet.position.y = 2.0; group.add(helmet);
  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.15, 0.62), darkMat);
  visor.position.set(0, 2.0, 0.02); group.add(visor);
  
  const crest = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.45, 0.5), trimMat);
  crest.position.set(0, 2.4, -0.05); group.add(crest);

  // Limbs with Shoulders
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
    gunGroup, barrel, isMounted: false
  };
  return group;
}

// --- 7. Horse Steed Mesh ---
function createHorseMesh() {
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.8 });
  const maneMat = new THREE.MeshStandardMaterial({ color: 0x1c1917, roughness: 0.9 });

  const body = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.2, 2.6), bodyMat);
  body.position.y = 1.4; group.add(body);

  const neck = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.3, 0.7), bodyMat);
  neck.position.set(0, 2.2, -0.9); neck.rotation.x = -0.4; group.add(neck);

  const head = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.55, 1.0), bodyMat);
  head.position.set(0, 2.7, -1.3); group.add(head);

  // Legs
  const legGeo = new THREE.BoxGeometry(0.3, 1.2, 0.3);
  const legPositions = [[-0.4, 0.6, 0.9], [0.4, 0.6, 0.9], [-0.4, 0.6, -0.9], [0.4, 0.6, -0.9]];
  legPositions.forEach(p => {
    const leg = new THREE.Mesh(legGeo, bodyMat);
    leg.position.set(p[0], p[1], p[2]); group.add(leg);
  });

  return group;
}

let horseSteed = null;

// --- 8. Bullets & Shooting Mechanics ---
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

// --- 9. Alien NPCs & Boss ---
function createAlienMesh() {
  const alienGroup = new THREE.Group();
  const skinMat = new THREE.MeshStandardMaterial({ color: 0x10b981, roughness: 0.5 });
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });

  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.18, 1.1, 8), skinMat);
  body.position.y = 1.0; alienGroup.add(body);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.45, 16, 16), skinMat);
  head.position.y = 1.85; alienGroup.add(head);

  const eye1 = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), eyeMat);
  eye1.position.set(-0.15, 1.95, 0.35); alienGroup.add(eye1);
  const eye2 = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), eyeMat);
  eye2.position.set(0.15, 1.95, 0.35); alienGroup.add(eye2);

  const legGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.9); legGeo.translate(0, -0.45, 0);
  const leftLegPivot = new THREE.Group(); leftLegPivot.position.set(-0.15, 0.9, 0);
  leftLegPivot.add(new THREE.Mesh(legGeo, skinMat)); alienGroup.add(leftLegPivot);
  const rightLegPivot = new THREE.Group(); rightLegPivot.position.set(0.15, 0.9, 0);
  rightLegPivot.add(new THREE.Mesh(legGeo, skinMat)); alienGroup.add(rightLegPivot);

  alienGroup.userData = { leftLegPivot, rightLegPivot, timer: 0, hp: 3, lastAttackTime: 0 };
  return alienGroup;
}

const alienNPCs = [];
function spawnAlien() {
  const alien = createAlienMesh();
  const ang = Math.random() * Math.PI * 2;
  const r = 20 + Math.random() * (getIslandRadius(ang) - 35);
  alien.position.set(Math.cos(ang) * r, 0, Math.sin(ang) * r);
  scene.add(alien);
  alienNPCs.push({ mesh: alien, speed: 0.045 });
}

for (let i = 0; i < 18; i++) spawnAlien();

// Fatty Jelly Boss
let bossMesh = null;
let bossHP = 500;
let maxBossHP = 500;
let totalAlienKills = 0;

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
  group.userData = { timer: 0, lastAttackTime: 0 };
  return group;
}

function spawnBossEvent() {
  if (bossMesh) return;
  bossMesh = createFattyJellyBoss();
  scene.add(bossMesh);
  document.getElementById('boss-hud').style.display = 'flex';
}

// --- 10. Local Player, Free 360 Camera & Controls ---
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
  if (document.getElementById('name-portal').style.display === 'none') {
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

// Key Listeners
const keys = {};
window.addEventListener('keydown', (e) => {
  keys[e.code] = true;
  if (document.activeElement === document.getElementById('chat-input')) return;

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
    
    // Barrel Origin
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

// --- 11. Network Handlers ---
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

// --- 12. Minimap Rendering System ---
const minimapCanvas = document.getElementById('minimap-canvas');
const mCtx = minimapCanvas.getContext('2d');

function updateMinimap() {
  mCtx.clearRect(0, 0, 150, 150);
  mCtx.fillStyle = '#0f172a'; mCtx.fillRect(0, 0, 150, 150);

  // Draw Island Map outline
  mCtx.fillStyle = '#15803d';
  mCtx.beginPath();
  mCtx.arc(75, 75, 60, 0, Math.PI * 2);
  mCtx.fill();

  if (!localPlayer) return;

  // Scale factor from world to minimap
  const scale = 0.4;

  // Draw Aliens (Red Dots)
  mCtx.fillStyle = '#ef4444';
  alienNPCs.forEach((npc) => {
    const dx = 75 + (npc.mesh.position.x - localPlayer.position.x) * scale;
    const dy = 75 + (npc.mesh.position.z - localPlayer.position.z) * scale;
    if (dx >= 0 && dx <= 150 && dy >= 0 && dy <= 150) {
      mCtx.beginPath(); mCtx.arc(dx, dy, 3, 0, Math.PI * 2); mCtx.fill();
    }
  });

  // Draw Boss (Purple Big Dot)
  if (bossMesh) {
    mCtx.fillStyle = '#ec4899';
    const bx = 75 + (bossMesh.position.x - localPlayer.position.x) * scale;
    const by = 75 + (bossMesh.position.z - localPlayer.position.z) * scale;
    mCtx.beginPath(); mCtx.arc(bx, by, 7, 0, Math.PI * 2); mCtx.fill();
  }

  // Draw Local Player (Blue Dot)
  mCtx.fillStyle = '#38bdf8';
  mCtx.beginPath(); mCtx.arc(75, 75, 5, 0, Math.PI * 2); mCtx.fill();
}

// --- 13. Main Game Loop ---
let walkTimer = 0;
const now = () => performance.now();

function animate() {
  requestAnimationFrame(animate);

  // Environment Rotations
  skyWormholeGroup.rotation.y += 0.03;
  wormholeCore.rotation.z += 0.02;
  moonMesh.rotation.y += 0.0015;

  // Butterfly Flutter AI
  butterflies.forEach(b => {
    b.userData.ang += 0.03;
    b.position.y = b.userData.baseY + Math.sin(b.userData.ang * 2) * 0.4;
    b.position.x += Math.cos(b.userData.ang) * 0.03;
    b.position.z += Math.sin(b.userData.ang) * 0.03;

    const flap = Math.sin(b.userData.ang * 12) * 0.6;
    b.userData.leftWing.rotation.y = flap;
    b.userData.rightWing.rotation.y = -flap;
  });

  // Active Bullet Motion & Hit Detection
  for (let i = activeBullets.length - 1; i >= 0; i--) {
    const b = activeBullets[i];
    b.mesh.position.add(b.vel);
    b.life--;

    // Collision with Aliens
    for (let j = alienNPCs.length - 1; j >= 0; j--) {
      const alien = alienNPCs[j].mesh;
      if (b.mesh.position.distanceTo(alien.position) < 1.8) {
        alien.userData.hp -= 1;
        alien.children[0].material.color.setHex(0xef4444);
        setTimeout(() => alien.children[0].material.color.setHex(0x10b981), 150);

        if (alien.userData.hp <= 0) {
          scene.remove(alien);
          alienNPCs.splice(j, 1);
          totalAlienKills++;
          document.getElementById('kill-counter').innerText = `Aliens Slain: ${totalAlienKills} / 100`;
          if (totalAlienKills >= 100) spawnBossEvent();
          setTimeout(spawnAlien, 2000);
        }

        scene.remove(b.mesh);
        activeBullets.splice(i, 1);
        break;
      }
    }

    // Hit Boss
    if (bossMesh && b.mesh.position.distanceTo(bossMesh.position) < 5) {
      bossHP = Math.max(0, bossHP - 12);
      document.getElementById('boss-hp-fill').style.width = `${(bossHP / maxBossHP) * 100}%`;
      scene.remove(b.mesh);
      activeBullets.splice(i, 1);
    } else if (b.life <= 0) {
      scene.remove(b.mesh);
      activeBullets.splice(i, 1);
    }
  }

  // Alien NPCs AI Pursuit
  alienNPCs.forEach((npc) => {
    const alien = npc.mesh;
    if (localPlayer) {
      const dist = alien.position.distanceTo(localPlayer.position);
      if (dist < 22) {
        alien.lookAt(localPlayer.position.x, alien.position.y, localPlayer.position.z);
        alien.translateZ(npc.speed);
        if (dist <= 2.2 && now() - alien.userData.lastAttackTime > 1200) {
          alien.userData.lastAttackTime = now();
          socket.emit('playerDamage', 5);
        }
      }
    }
  });

  // Local Player Movement & Physics
  if (localPlayer) {
    let isMoving = false;
    const speed = localPlayer.userData.isMounted ? 0.26 : 0.14;

    if (document.activeElement !== document.getElementById('chat-input')) {
      if (keys['ArrowLeft']) yaw += 0.03;
      if (keys['ArrowRight']) yaw -= 0.03;
      if (keys['ArrowUp']) pitch = Math.min(Math.PI / 2 - 0.05, pitch + 0.025);
      if (keys['ArrowDown']) pitch = Math.max(-Math.PI / 2 + 0.05, pitch - 0.025);

      const prevPos = localPlayer.position.clone();

      if (keys['KeyW']) { localPlayer.translateZ(-speed); isMoving = true; }
      if (keys['KeyS']) { localPlayer.translateZ(speed); isMoving = true; }
      if (keys['KeyA']) { localPlayer.translateX(-speed); isMoving = true; }
      if (keys['KeyD']) { localPlayer.translateX(speed); isMoving = true; }

      // Full edge exploration check
      if (!isInsideIsland(localPlayer.position.x, localPlayer.position.z)) {
        localPlayer.position.copy(prevPos);
      }
    }

    localPlayer.rotation.y = yaw;

    // Sky Drop Gravity & Jump Skill
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

    // Broadcast network position
    socket.emit('playerMovement', {
      x: localPlayer.position.x,
      y: localPlayer.position.y,
      z: localPlayer.position.z,
      rotation: localPlayer.rotation.y
    });

    // Dynamic Camera (Aiming vs Free Orbit)
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
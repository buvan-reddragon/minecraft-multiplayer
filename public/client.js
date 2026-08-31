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

// --- 2. Custom Island Map & Ocean ---
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

// Custom Shaped Land
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

// --- 3. Rotating Moon & Sky Stars ---
function createMoonTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 512;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#d1d5db'; ctx.fillRect(0, 0, 512, 512);

  // Procedural Craters
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

// Sky Starfield
const starGeo = new THREE.BufferGeometry();
const starPos = new Float32Array(800 * 3);
for (let i = 0; i < 800 * 3; i += 3) {
  starPos[i] = (Math.random() - 0.5) * 600;
  starPos[i + 1] = Math.random() * 250 + 20;
  starPos[i + 2] = (Math.random() - 0.5) * 600;
}
starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.95, transparent: true, opacity: 0.85 })));

// --- 4. Spinning Sky Wormhole Portal ---
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

// Ground Spawn Hub Ring
const groundPortal = new THREE.Mesh(
  new THREE.TorusGeometry(4.0, 0.3, 16, 64).rotateX(Math.PI / 2),
  new THREE.MeshBasicMaterial({ color: 0x06b6d4 })
);
groundPortal.position.y = 0.1;
scene.add(groundPortal);

// --- 5. Cherry Blossom Forest & Wind Petals ---
function createCherryTree() {
  const group = new THREE.Group();
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.35, 0.6, 4.5, 7),
    new THREE.MeshStandardMaterial({ color: 0x2b180d, roughness: 0.9 })
  );
  trunk.position.y = 2.25; trunk.castShadow = true;
  group.add(trunk);

  const pinkMats = [
    new THREE.MeshStandardMaterial({ color: 0xffa6c9, roughness: 0.8 }),
    new THREE.MeshStandardMaterial({ color: 0xff69b4, roughness: 0.8 }),
    new THREE.MeshStandardMaterial({ color: 0xffb7c5, roughness: 0.8 })
  ];

  for (let i = 0; i < 5; i++) {
    const crown = new THREE.Mesh(new THREE.DodecahedronGeometry(1.6, 1), pinkMats[i % 3]);
    const ang = (i / 5) * Math.PI * 2;
    crown.position.set(Math.cos(ang) * 0.9, 3.8 + Math.random(), Math.sin(ang) * 0.9);
    crown.castShadow = true;
    group.add(crown);
  }
  return group;
}

for (let i = 0; i < 70; i++) {
  const tree = createCherryTree();
  const ang = Math.random() * Math.PI * 2;
  const rad = 15 + Math.random() * (getIslandRadius(ang) - 25);
  tree.position.set(Math.cos(ang) * rad, 0, Math.sin(ang) * rad);
  scene.add(tree);
}

// Petals
const petalCount = 400;
const petalGeo = new THREE.BufferGeometry();
const petalPos = new Float32Array(petalCount * 3);
const petalVel = [];
for (let i = 0; i < petalCount; i++) {
  petalPos[i * 3] = (Math.random() - 0.5) * 250;
  petalPos[i * 3 + 1] = Math.random() * 25 + 1;
  petalPos[i * 3 + 2] = (Math.random() - 0.5) * 250;
  petalVel.push({ x: Math.random() * 0.05 + 0.03, y: -(Math.random() * 0.03 + 0.015), z: Math.random() * 0.02 - 0.01 });
}
petalGeo.setAttribute('position', new THREE.BufferAttribute(petalPos, 3));
const petalParticles = new THREE.Points(petalGeo, new THREE.PointsMaterial({ color: 0xffb7c5, size: 0.28, transparent: true, opacity: 0.85 }));
scene.add(petalParticles);

// --- 6. Name Tag Sprite ---
function createNameTagSprite(text) {
  const canvas = document.createElement('canvas');
  canvas.width = 256; canvas.height = 64;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = 'rgba(15, 23, 42, 0.8)'; ctx.fillRect(0, 0, 256, 64);
  ctx.strokeStyle = '#f59e0b'; ctx.lineWidth = 4; ctx.strokeRect(0, 0, 256, 64);
  ctx.font = 'Bold 24px sans-serif'; ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center'; ctx.fillText(text, 128, 40);

  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(canvas), transparent: true }));
  sprite.scale.set(2, 0.5, 1);
  sprite.position.y = 2.7;
  return sprite;
}

// --- 7. Character Mesh Builder ---
function createKnightMesh(nameTagText) {
  const group = new THREE.Group();
  const armorMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8, roughness: 0.25 });
  const goldMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b });
  const clothMat = new THREE.MeshStandardMaterial({ color: 0x7c3aed });

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.1, 0.5), armorMat);
  torso.position.y = 1.15; group.add(torso);
  const tabard = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.12, 0.52), clothMat);
  tabard.position.y = 1.15; group.add(tabard);

  const helmet = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.55, 0.55), armorMat);
  helmet.position.y = 1.95; group.add(helmet);

  const armLegGeo = new THREE.BoxGeometry(0.4, 1.0, 0.4);
  armLegGeo.translate(0, -0.5, 0);

  const leftLegPivot = new THREE.Group(); leftLegPivot.position.set(-0.24, 0.9, 0);
  leftLegPivot.add(new THREE.Mesh(armLegGeo, armorMat)); group.add(leftLegPivot);

  const rightLegPivot = new THREE.Group(); rightLegPivot.position.set(0.24, 0.9, 0);
  rightLegPivot.add(new THREE.Mesh(armLegGeo, armorMat)); group.add(rightLegPivot);

  const leftArmPivot = new THREE.Group(); leftArmPivot.position.set(-0.65, 1.6, 0);
  leftArmPivot.add(new THREE.Mesh(armLegGeo, armorMat)); group.add(leftArmPivot);

  const rightArmPivot = new THREE.Group(); rightArmPivot.position.set(0.65, 1.6, 0);
  rightArmPivot.add(new THREE.Mesh(armLegGeo, armorMat));

  // Sword & Bow
  const swordGroup = new THREE.Group();
  const hilt = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.06, 0.08), goldMat);
  hilt.position.set(0, -0.8, 0.25); swordGroup.add(hilt);
  const blade = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.2, 0.03), new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.95 }));
  blade.position.set(0, -1.35, 0.25); swordGroup.add(blade);
  rightArmPivot.add(swordGroup);

  const bowGroup = new THREE.Group();
  const bowCurve = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.03, 8, 24, Math.PI), new THREE.MeshBasicMaterial({ color: 0x78350f }));
  bowCurve.rotation.z = -Math.PI / 2; bowCurve.position.set(0, -0.8, 0.3); bowGroup.add(bowCurve);
  bowGroup.visible = false;
  rightArmPivot.add(bowGroup);

  group.add(rightArmPivot);
  group.add(createNameTagSprite(nameTagText || 'Knight'));

  group.userData = {
    leftLegPivot, rightLegPivot, leftArmPivot, rightArmPivot,
    swordGroup, bowGroup, currentWeapon: 'sword',
    isAttacking: false, attackTimer: 0
  };
  return group;
}

// --- 8. Alien Mesh (Without Name Tag) ---
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

  // Note: NO Name Tag Sprite added as requested!
  alienGroup.userData = { leftLegPivot, rightLegPivot, timer: 0, hp: 3, lastAttackTime: 0 };
  return alienGroup;
}

// Auto-Spawning Aliens Array
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

// --- 9. Fatty Jelly Boss Mesh & Mechanics ---
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
  body.scale.set(1.2, 0.8, 1.2);
  body.position.y = 4.2; group.add(body);

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

  const chatMessages = document.getElementById('chat-messages');
  const msgEl = document.createElement('div');
  msgEl.innerHTML = `<strong style="color: #ec4899;">⚠️ WARNING: 100 Aliens Slain! Fatty Jelly Boss Has Spawned!</strong>`;
  chatMessages.appendChild(msgEl);
}

// --- 10. Local Player & Free 360° Camera ---
let localPlayer = null;
let localUsername = "Knight";
let localHealth = 100;
let isJumping = false;
let verticalVelocity = 0;
const remotePlayers = {};

// Full 360 Camera Controls (Unrestricted Sky Pitch)
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
    // Allow looking straight up (full 360 view)
    pitch = Math.max(-Math.PI / 2 + 0.05, Math.min(Math.PI / 2 - 0.05, pitch));
  }
});

// Join Game
document.getElementById('join-btn').addEventListener('click', () => {
  const input = document.getElementById('username-input').value.trim();
  if (input !== "") localUsername = input;

  document.getElementById('name-portal').style.display = 'none';

  localPlayer = createKnightMesh(localUsername);
  localPlayer.position.set(0, 45, 0); // Spawn falling from Sky Wormhole
  scene.add(localPlayer);

  socket.emit('joinGame', localUsername);
});

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
    localPlayer.position.set(data.x, 45, data.z); // Dropped from Sky Wormhole
  } else if (remotePlayers[data.id]) {
    remotePlayers[data.id].position.set(data.x, 45, data.z);
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
  fill.style.backgroundColor = localHealth > 50 ? '#22c55e' : (localHealth > 25 ? '#f59e0b' : '#ef4444');
}

// --- 12. Controls & Combat vs Aliens ---
const keys = {};
window.addEventListener('keydown', (e) => {
  keys[e.code] = true;
  if (document.activeElement === document.getElementById('chat-input')) return;

  // Swap Weapon: E
  if (e.code === 'KeyE' && localPlayer) {
    if (localPlayer.userData.currentWeapon === 'sword') {
      localPlayer.userData.currentWeapon = 'bow';
      localPlayer.userData.swordGroup.visible = false;
      localPlayer.userData.bowGroup.visible = true;
      document.getElementById('weapon-indicator').innerText = 'Weapon: BOW (Press E to Swap)';
      document.getElementById('crosshair').style.display = 'block';
    } else {
      localPlayer.userData.currentWeapon = 'sword';
      localPlayer.userData.swordGroup.visible = true;
      localPlayer.userData.bowGroup.visible = false;
      document.getElementById('weapon-indicator').innerText = 'Weapon: SWORD (Press E to Swap)';
      document.getElementById('crosshair').style.display = 'none';
    }
  }

  // Jump: Space
  if (e.code === 'Space' && !isJumping && localPlayer && localPlayer.position.y <= 0.1) {
    isJumping = true;
    verticalVelocity = 0.22;
  }

  // Attack / Fight Skill: F
  if (e.code === 'KeyF' && localPlayer) {
    localPlayer.userData.isAttacking = true;
    localPlayer.userData.attackTimer = 0;
    performAttackOnAliens();
  }
});

window.addEventListener('keyup', (e) => (keys[e.code] = false));

// Attack Logic targeting Aliens and Boss
function performAttackOnAliens() {
  if (!localPlayer) return;
  const range = localPlayer.userData.currentWeapon === 'sword' ? 3.8 : 22;

  // Attack Alien NPCs
  for (let i = alienNPCs.length - 1; i >= 0; i--) {
    const alien = alienNPCs[i].mesh;
    if (localPlayer.position.distanceTo(alien.position) <= range) {
      alien.userData.hp -= 1;
      // Flash Alien Red on hit
      alien.children[0].material.color.setHex(0xef4444);
      setTimeout(() => alien.children[0].material.color.setHex(0x10b981), 150);

      if (alien.userData.hp <= 0) {
        scene.remove(alien);
        alienNPCs.splice(i, 1);
        totalAlienKills++;
        document.getElementById('kill-counter').innerText = `Aliens Slain: ${totalAlienKills} / 100`;

        // Check Boss Spawn Requirement
        if (totalAlienKills >= 100) spawnBossEvent();

        // Respawn new Alien
        setTimeout(spawnAlien, 2000);
      }
    }
  }

  // Attack Fatty Jelly Boss
  if (bossMesh && localPlayer.position.distanceTo(bossMesh.position) <= range + 4) {
    bossHP = Math.max(0, bossHP - 15);
    document.getElementById('boss-hp-fill').style.width = `${(bossHP / maxBossHP) * 100}%`;
    if (bossHP <= 0) {
      scene.remove(bossMesh);
      bossMesh = null;
      document.getElementById('boss-hud').style.display = 'none';
      alert("🎉 CONGRATULATIONS! You defeated the Fatty Jelly Boss!");
    }
  }
}

// Chat Minimise
const chatContainer = document.getElementById('chat-container');
const chatToggleBtn = document.getElementById('chat-toggle-btn');
chatToggleBtn.addEventListener('click', () => {
  chatContainer.classList.toggle('chat-minimized');
  chatToggleBtn.innerText = chatContainer.classList.contains('chat-minimized') ? '+' : '_';
});

// Chat Engine
const chatInput = document.getElementById('chat-input');
const chatMessages = document.getElementById('chat-messages');
window.addEventListener('keydown', (e) => {
  if (e.code === 'Enter') {
    if (document.activeElement === chatInput) {
      const msg = chatInput.value.trim();
      if (msg) socket.emit('chatMessage', { text: msg });
      chatInput.value = ''; chatInput.blur();
    } else {
      chatInput.focus();
    }
  }
});

socket.on('receiveMessage', (data) => {
  const msgEl = document.createElement('div');
  msgEl.innerHTML = `<strong style="color: #f59e0b;">${data.sender}:</strong> ${data.text}`;
  chatMessages.appendChild(msgEl);
  chatMessages.scrollTop = chatMessages.scrollHeight;
});

// --- 13. Main Game Loop ---
let walkTimer = 0;
const now = () => performance.now();

function animate() {
  requestAnimationFrame(animate);

  // Rotate Celestial Bodies & Wormhole
  skyWormholeGroup.rotation.y += 0.03;
  wormholeCore.rotation.z += 0.02;
  groundPortal.rotation.z += 0.02;
  moonMesh.rotation.y += 0.0015;

  // Alien NPCs AI: Seek & Attack Player
  alienNPCs.forEach((npc) => {
    const alien = npc.mesh;
    if (localPlayer) {
      const dist = alien.position.distanceTo(localPlayer.position);
      if (dist < 22) {
        // Turn towards local player & pursue
        alien.lookAt(localPlayer.position.x, alien.position.y, localPlayer.position.z);
        alien.translateZ(npc.speed);

        // Attack local player if close (-5 HP)
        if (dist <= 2.2 && now() - alien.userData.lastAttackTime > 1200) {
          alien.userData.lastAttackTime = now();
          socket.emit('playerDamage', 5);
        }
      } else {
        alien.translateZ(npc.speed * 0.5);
        if (Math.random() < 0.01) alien.rotation.y += (Math.random() - 0.5) * 1.5;
      }
    }

    // Alien Leg Animation
    alien.userData.timer += 0.12;
    const swing = Math.sin(alien.userData.timer) * 0.4;
    alien.userData.leftLegPivot.rotation.x = swing;
    alien.userData.rightLegPivot.rotation.x = -swing;
  });

  // Fatty Jelly Boss AI & Wobble Animation
  if (bossMesh && localPlayer) {
    bossMesh.userData.timer += 0.05;
    const wobble = Math.sin(bossMesh.userData.timer) * 0.15;
    bossMesh.children[0].scale.set(1.2 + wobble, 0.8 - wobble, 1.2 + wobble);

    const bossDist = bossMesh.position.distanceTo(localPlayer.position);
    if (bossDist > 4) {
      bossMesh.lookAt(localPlayer.position.x, 0, localPlayer.position.z);
      bossMesh.translateZ(0.06);
    }
    // Boss Stomp Attack (-15 HP)
    if (bossDist <= 6 && now() - bossMesh.userData.lastAttackTime > 1500) {
      bossMesh.userData.lastAttackTime = now();
      socket.emit('playerDamage', 15);
    }
  }

  // Local Player Sky Fall & Land Physics
  if (localPlayer) {
    let isMoving = false;
    const moveSpeed = 0.14;

    // Arrow Key Free 360 Orbit Camera Control
    if (document.activeElement !== chatInput) {
      if (keys['ArrowLeft']) yaw += 0.03;
      if (keys['ArrowRight']) yaw -= 0.03;
      if (keys['ArrowUp']) pitch = Math.min(Math.PI / 2 - 0.05, pitch + 0.025);
      if (keys['ArrowDown']) pitch = Math.max(-Math.PI / 2 + 0.05, pitch - 0.025);
    }

    localPlayer.rotation.y = yaw;

    // WASD Movement
    if (document.activeElement !== chatInput) {
      const prevPos = localPlayer.position.clone();

      if (keys['KeyW']) { localPlayer.translateZ(-moveSpeed); isMoving = true; }
      if (keys['KeyS']) { localPlayer.translateZ(moveSpeed); isMoving = true; }
      if (keys['KeyA']) { localPlayer.translateX(-moveSpeed); isMoving = true; }
      if (keys['KeyD']) { localPlayer.translateX(moveSpeed); isMoving = true; }

      if (!isInsideIsland(localPlayer.position.x, localPlayer.position.z)) {
        localPlayer.position.copy(prevPos);
      }
    }

    // Sky Wormhole Fall / Gravity Landing Physics
    if (localPlayer.position.y > 0) {
      localPlayer.position.y = Math.max(0, localPlayer.position.y - 0.45);
    }

    // Jump Physics
    if (isJumping) {
      localPlayer.position.y += verticalVelocity;
      verticalVelocity -= 0.012;
      if (localPlayer.position.y <= 0) {
        localPlayer.position.y = 0;
        isJumping = false;
      }
    }

    // Fight Slash Animation
    if (localPlayer.userData.isAttacking) {
      localPlayer.userData.attackTimer += 0.25;
      const swing = Math.sin(localPlayer.userData.attackTimer) * 1.8;
      localPlayer.userData.rightArmPivot.rotation.x = -Math.PI / 2 + swing;
      localPlayer.userData.rightArmPivot.rotation.y = swing * 0.5;

      if (localPlayer.userData.attackTimer >= Math.PI) {
        localPlayer.userData.isAttacking = false;
        localPlayer.userData.rightArmPivot.rotation.x = 0;
        localPlayer.userData.rightArmPivot.rotation.y = 0;
      }
    } else if (isMoving) {
      walkTimer += 0.18;
      const swing = Math.sin(walkTimer) * 0.65;
      localPlayer.userData.leftLegPivot.rotation.x = swing;
      localPlayer.userData.rightLegPivot.rotation.x = -swing;
    } else {
      localPlayer.userData.leftLegPivot.rotation.x = 0;
      localPlayer.userData.rightLegPivot.rotation.x = 0;
    }

    // Broadcast Position
    socket.emit('playerMovement', {
      x: localPlayer.position.x,
      y: localPlayer.position.y,
      z: localPlayer.position.z,
      rotation: localPlayer.rotation.y
    });

    // Camera 360 Orbiting View
    const camDist = 8;
    const camX = localPlayer.position.x + camDist * Math.sin(yaw) * Math.cos(pitch);
    const camY = localPlayer.position.y + camDist * Math.sin(pitch) + 1.8;
    const camZ = localPlayer.position.z + camDist * Math.cos(yaw) * Math.cos(pitch);

    camera.position.set(camX, camY, camZ);
    camera.lookAt(localPlayer.position.x, localPlayer.position.y + 1.5, localPlayer.position.z);
  }

  // Floating Petals Animation
  const posArr = petalParticles.geometry.attributes.position.array;
  for (let i = 0; i < petalCount; i++) {
    const v = petalVel[i];
    posArr[i * 3] += v.x; posArr[i * 3 + 1] += v.y; posArr[i * 3 + 2] += v.z;
    if (posArr[i * 3 + 1] <= 0) {
      posArr[i * 3 + 1] = 25;
      posArr[i * 3] = (localPlayer ? localPlayer.position.x : 0) + (Math.random() - 0.5) * 150;
      posArr[i * 3 + 2] = (localPlayer ? localPlayer.position.z : 0) + (Math.random() - 0.5) * 150;
    }
  }
  petalParticles.geometry.attributes.position.needsUpdate = true;

  renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();
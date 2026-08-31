// client.js
const socket = io();

// --- 1. Basic Three.js Setup ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x130a24);
scene.fog = new THREE.FogExp2(0x231433, 0.0075);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

// Lighting
const ambientLight = new THREE.AmbientLight(0x6b4c7a, 0.85);
scene.add(ambientLight);

const sunLight = new THREE.DirectionalLight(0xff9933, 2.2);
sunLight.position.set(140, 50, -260);
sunLight.castShadow = true;
scene.add(sunLight);

// Grass Field
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(500, 500),
  new THREE.MeshStandardMaterial({ color: 0x1e3e18, roughness: 0.9 })
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// --- 2. Stars & Ringed Orbital Planet ---
const starGeo = new THREE.BufferGeometry();
const starCount = 800;
const starPos = new Float32Array(starCount * 3);
for (let i = 0; i < starCount * 3; i += 3) {
  starPos[i] = (Math.random() - 0.5) * 600;
  starPos[i + 1] = Math.random() * 200 + 30;
  starPos[i + 2] = (Math.random() - 0.5) * 600;
}
starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.8, transparent: true, opacity: 0.85 })));

// Orbital Planet with Ring
const planetGroup = new THREE.Group();
const planetMesh = new THREE.Mesh(
  new THREE.SphereGeometry(25, 32, 32),
  new THREE.MeshStandardMaterial({ color: 0xc2783c, roughness: 0.7 })
);
planetGroup.add(planetMesh);

const ringMesh = new THREE.Mesh(
  new THREE.RingGeometry(32, 45, 64),
  new THREE.MeshBasicMaterial({ color: 0xe0a96d, side: THREE.DoubleSide, transparent: true, opacity: 0.7 })
);
ringMesh.rotation.x = Math.PI / 3;
planetGroup.add(ringMesh);
planetGroup.position.set(-180, 110, -260);
scene.add(planetGroup);

// --- 3. Cherry Blossom Forest & Wind Petals ---
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

for (let i = 0; i < 80; i++) {
  const tree = createCherryTree();
  const rad = 15 + Math.random() * 180;
  const ang = Math.random() * Math.PI * 2;
  tree.position.set(Math.cos(ang) * rad, 0, Math.sin(ang) * rad);
  scene.add(tree);
}

// Wind-driven Floating Petals
const petalCount = 450;
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

// --- 4. Spawn Portal Hub (Center World) ---
const portalGroup = new THREE.Group();
const portalRing = new THREE.Mesh(
  new THREE.TorusGeometry(3.5, 0.25, 16, 100),
  new THREE.MeshBasicMaterial({ color: 0x06b6d4 })
);
portalRing.rotation.x = Math.PI / 2;
portalRing.position.y = 0.1;
portalGroup.add(portalRing);

const portalPillar = new THREE.Mesh(
  new THREE.CylinderGeometry(3.2, 3.2, 0.1, 32),
  new THREE.MeshBasicMaterial({ color: 0x0891b2, transparent: true, opacity: 0.4 })
);
portalPillar.position.y = 0.05;
portalGroup.add(portalPillar);
scene.add(portalGroup);

// --- 5. Village House Setup ---
function createHouse() {
  const houseGroup = new THREE.Group();
  const walls = new THREE.Mesh(
    new THREE.BoxGeometry(6, 4, 6),
    new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.8 })
  );
  walls.position.y = 2; walls.castShadow = true; walls.receiveShadow = true;
  houseGroup.add(walls);

  const roof = new THREE.Mesh(
    new THREE.ConeGeometry(5.2, 2.5, 4),
    new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.6 })
  );
  roof.position.y = 5.25; roof.rotation.y = Math.PI / 4; roof.castShadow = true;
  houseGroup.add(roof);

  const door = new THREE.Mesh(
    new THREE.BoxGeometry(1.2, 2.2, 0.1),
    new THREE.MeshStandardMaterial({ color: 0x27272a })
  );
  door.position.set(0, 1.1, 3.01);
  houseGroup.add(door);
  return houseGroup;
}

const housePositions = [
  { x: -25, z: -25 }, { x: 25, z: -30 }, { x: -35, z: 20 },
  { x: 30, z: 25 }, { x: -50, z: -10 }, { x: 45, z: -10 }
];
housePositions.forEach((pos) => {
  const house = createHouse();
  house.position.set(pos.x, 0, pos.z);
  scene.add(house);
});

// --- 6. Comets Setup ---
const comets = [];
function spawnComet() {
  const comet = new THREE.Mesh(
    new THREE.SphereGeometry(0.6, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0x60a5fa })
  );
  comet.position.set((Math.random() - 0.5) * 400, 80 + Math.random() * 40, -200 - Math.random() * 100);
  comet.userData = { vel: new THREE.Vector3(1.8 + Math.random(), -0.6, 0.8), life: 120 };
  scene.add(comet);
  comets.push(comet);
}

// --- 7. Name Tag Sprite ---
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

// --- 8. Character Mesh Builder (Attack Animation Setup) ---
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

  // --- Sword ---
  const swordGroup = new THREE.Group();
  const hilt = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.06, 0.08), goldMat);
  hilt.position.set(0, -0.8, 0.25); swordGroup.add(hilt);
  const blade = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.2, 0.03), new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.95 }));
  blade.position.set(0, -1.35, 0.25); swordGroup.add(blade);
  rightArmPivot.add(swordGroup);

  // --- Bow ---
  const bowGroup = new THREE.Group();
  const bowCurve = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.03, 8, 24, Math.PI), new THREE.MeshBasicMaterial({ color: 0x78350f }));
  bowCurve.rotation.z = -Math.PI / 2; bowCurve.position.set(0, -0.8, 0.3); bowGroup.add(bowCurve);
  bowGroup.visible = false;
  rightArmPivot.add(bowGroup);

  group.add(rightArmPivot);
  group.add(createNameTagSprite(nameTagText || 'Knight'));

  group.userData = {
    leftLegPivot, rightLegPivot, leftArmPivot, rightArmPivot,
    swordGroup, bowGroup, currentWeapon: 'sword', walkTimer: 0,
    isAttacking: false, attackTimer: 0
  };
  return group;
}

// --- 9. Alien NPCs ---
function createAlienMesh() {
  const alienGroup = new THREE.Group();
  const skinMat = new THREE.MeshStandardMaterial({ color: 0x10b981 });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.18, 1.1, 8), skinMat);
  body.position.y = 1.0; alienGroup.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.42, 16, 16), skinMat);
  head.position.y = 1.8; alienGroup.add(head);

  const legGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.9); legGeo.translate(0, -0.45, 0);
  const leftLegPivot = new THREE.Group(); leftLegPivot.position.set(-0.15, 0.9, 0);
  leftLegPivot.add(new THREE.Mesh(legGeo, skinMat)); alienGroup.add(leftLegPivot);
  const rightLegPivot = new THREE.Group(); rightLegPivot.position.set(0.15, 0.9, 0);
  rightLegPivot.add(new THREE.Mesh(legGeo, skinMat)); alienGroup.add(rightLegPivot);

  alienGroup.add(createNameTagSprite('Alien NPC'));
  alienGroup.userData = { leftLegPivot, rightLegPivot, timer: 0 };
  return alienGroup;
}

const alienNPCs = [];
for (let i = 0; i < 10; i++) {
  const alien = createAlienMesh();
  alien.position.set((Math.random() - 0.5) * 120, 0, (Math.random() - 0.5) * 120);
  scene.add(alien);
  alienNPCs.push({ mesh: alien, speed: 0.03 });
}

// --- 10. Local State & Screen Orbit Controls ---
let localPlayer = null;
let localUsername = "Knight";
let localHealth = 5;
let isJumping = false;
let verticalVelocity = 0;
const remotePlayers = {};

// Camera Rotation Tracking
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
    pitch = Math.max(0.05, Math.min(Math.PI / 3, pitch));
  }
});

// Join Game Action
document.getElementById('join-btn').addEventListener('click', () => {
  const input = document.getElementById('username-input').value.trim();
  if (input !== "") localUsername = input;

  document.getElementById('name-portal').style.display = 'none';

  localPlayer = createKnightMesh(localUsername);
  localPlayer.position.set(0, 0, 0);
  scene.add(localPlayer);

  socket.emit('joinGame', localUsername);
});

// --- 11. Network Multiplayer Handlers ---
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
    document.getElementById('health-bar-fill').style.width = `${(localHealth / 5) * 100}%`;
    document.getElementById('health-text').innerText = `HP: ${localHealth} / 5`;
  }
});

socket.on('playerRespawned', (data) => {
  if (data.id === socket.id) {
    localHealth = 5;
    document.getElementById('health-bar-fill').style.width = `100%`;
    document.getElementById('health-text').innerText = `HP: 5 / 5`;
    localPlayer.position.set(data.x, 0, data.z);
  } else if (remotePlayers[data.id]) {
    remotePlayers[data.id].position.set(data.x, 0, data.z);
  }
});

socket.on('playerDisconnected', (id) => {
  if (remotePlayers[id]) {
    scene.remove(remotePlayers[id]);
    delete remotePlayers[id];
  }
});

// --- 12. Controls, Weapon Swap, Fight Skill ---
const keys = {};
window.addEventListener('keydown', (e) => {
  keys[e.code] = true;

  if (document.activeElement === document.getElementById('chat-input')) return;

  // Equip Weapon: E Key
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

  // Jump: Space Key
  if (e.code === 'Space' && !isJumping && localPlayer) {
    isJumping = true;
    verticalVelocity = 0.22;
  }

  // Fight Attack: F Key
  if (e.code === 'KeyF' && localPlayer) {
    triggerAttackAnimation();
    performAttack();
  }
});

window.addEventListener('keyup', (e) => (keys[e.code] = false));

function triggerAttackAnimation() {
  if (localPlayer) {
    localPlayer.userData.isAttacking = true;
    localPlayer.userData.attackTimer = 0;
  }
}

function performAttack() {
  const attackRange = localPlayer.userData.currentWeapon === 'sword' ? 2.5 : 18;
  Object.keys(remotePlayers).forEach((targetId) => {
    const target = remotePlayers[targetId];
    if (localPlayer.position.distanceTo(target.position) <= attackRange) {
      socket.emit('playerHit', targetId);
    }
  });
}

// Chat Minimise Toggle Logic
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

// --- 13. Main Loop ---
let walkTimer = 0;

function animate() {
  requestAnimationFrame(animate);

  portalRing.rotation.z += 0.02;
  planetGroup.rotation.y += 0.002;

  // Sky Comets
  if (Math.random() < 0.02) spawnComet();
  for (let i = comets.length - 1; i >= 0; i--) {
    const c = comets[i];
    c.position.add(c.userData.vel);
    c.userData.life--;
    if (c.userData.life <= 0) { scene.remove(c); comets.splice(i, 1); }
  }

  // Alien NPCs Movement
  alienNPCs.forEach((npc) => {
    npc.mesh.translateZ(-npc.speed);
    npc.mesh.userData.timer += 0.1;
    const swing = Math.sin(npc.mesh.userData.timer) * 0.4;
    npc.mesh.userData.leftLegPivot.rotation.x = swing;
    npc.mesh.userData.rightLegPivot.rotation.x = -swing;
    if (Math.random() < 0.01) npc.mesh.rotation.y += (Math.random() - 0.5) * 1.5;
  });

  // Local Player & Screen Control
  if (localPlayer) {
    let isMoving = false;
    const moveSpeed = 0.14;

    // Arrow Keys Rotate Camera View
    if (document.activeElement !== chatInput) {
      if (keys['ArrowLeft']) yaw += 0.03;
      if (keys['ArrowRight']) yaw -= 0.03;
      if (keys['ArrowUp']) pitch = Math.min(Math.PI / 3, pitch + 0.02);
      if (keys['ArrowDown']) pitch = Math.max(0.05, pitch - 0.02);
    }

    localPlayer.rotation.y = yaw;

    // WASD Movement Keys
    if (document.activeElement !== chatInput) {
      if (keys['KeyW']) { localPlayer.translateZ(-moveSpeed); isMoving = true; }
      if (keys['KeyS']) { localPlayer.translateZ(moveSpeed); isMoving = true; }
      if (keys['KeyA']) { localPlayer.translateX(-moveSpeed); isMoving = true; }
      if (keys['KeyD']) { localPlayer.translateX(moveSpeed); isMoving = true; }
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

    // Walking Animation vs Fight Animation
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

    // Camera Orbit View
    const camDist = 8;
    const camX = localPlayer.position.x + camDist * Math.sin(yaw) * Math.cos(pitch);
    const camY = localPlayer.position.y + camDist * Math.sin(pitch) + 1.8;
    const camZ = localPlayer.position.z + camDist * Math.cos(yaw) * Math.cos(pitch);

    camera.position.set(camX, camY, camZ);
    camera.lookAt(localPlayer.position.x, localPlayer.position.y + 1.5, localPlayer.position.z);
  }

  // Blowing Cherry Petals Movement
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
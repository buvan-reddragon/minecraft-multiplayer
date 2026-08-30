const socket = io();

// 1. Scene & Renderer Setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x60a5fa);
scene.fog = new THREE.FogExp2(0x60a5fa, 0.003);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.getElementById('canvas-container').appendChild(renderer.domElement);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
scene.add(ambientLight);
const sunLight = new THREE.DirectionalLight(0xfff5e6, 1.2);
sunLight.position.set(120, 180, 80);
scene.add(sunLight);

// Mobile Device Check
const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
if (isMobile) {
  document.querySelectorAll('.mobile-btn').forEach(b => b.style.display = 'flex');
  document.getElementById('joystick-zone').style.display = 'block';
  document.getElementById('chat-container').style.bottom = '140px';
}

// 2. Realistic Sky with Moving Cloud Physics
const cloudGroup = new THREE.Group();
scene.add(cloudGroup);
const cloudGeo = new THREE.DodecahedronGeometry(6, 1);
const cloudMat = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 });

for (let i = 0; i < 35; i++) {
  const cloud = new THREE.Group();
  const clusters = Math.floor(Math.random() * 4) + 3;
  for (let j = 0; j < clusters; j++) {
    const m = new THREE.Mesh(cloudGeo, cloudMat);
    m.position.set(j * 4, Math.random() * 2, Math.random() * 4);
    cloud.add(m);
  }
  cloud.position.set((Math.random() - 0.5) * 800, 70 + Math.random() * 40, (Math.random() - 0.5) * 800);
  cloudGroup.add(cloud);
}

// 3. Smiling Texture & Player Mesh
function createFaceTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 128; canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#c68b59'; ctx.fillRect(0, 0, 128, 128);
  // Eyes
  ctx.fillStyle = '#000000';
  ctx.fillRect(30, 40, 16, 16);
  ctx.fillRect(82, 40, 16, 16);
  // Smile
  ctx.beginPath();
  ctx.arc(64, 75, 28, 0, Math.PI, false);
  ctx.lineWidth = 6; ctx.strokeStyle = '#600000'; ctx.stroke();
  return new THREE.CanvasTexture(canvas);
}

function createNameTagCanvas(text) {
  const canvas = document.createElement('canvas');
  canvas.width = 256; canvas.height = 64;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.font = 'Bold 28px Arial'; ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center'; ctx.fillText(text, 128, 42);
  const texture = new THREE.CanvasTexture(canvas);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture }));
  sprite.scale.set(3, 0.75, 1); sprite.position.y = 2.4;
  return sprite;
}

const faceTexture = createFaceTexture();

function createSteveMesh(name) {
  const steve = new THREE.Group();

  // Body
  const bodyGeo = new THREE.BoxGeometry(0.8, 1.0, 0.4);
  const bodyMat = new THREE.MeshLambertMaterial({ color: 0x008080 });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.y = 1.0; steve.add(body);

  // Smiling Head
  const headMaterials = [
    new THREE.MeshLambertMaterial({ color: 0xc68b59 }),
    new THREE.MeshLambertMaterial({ color: 0xc68b59 }),
    new THREE.MeshLambertMaterial({ color: 0xc68b59 }),
    new THREE.MeshLambertMaterial({ color: 0xc68b59 }),
    new THREE.MeshLambertMaterial({ color: 0xc68b59 }),
    new THREE.MeshLambertMaterial({ map: faceTexture })
  ];
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), headMaterials);
  head.position.y = 1.75; steve.add(head);

  // Arms (for Wave Emote)
  const armGeo = new THREE.BoxGeometry(0.3, 0.9, 0.3); armGeo.translate(0, -0.4, 0);
  const armMat = new THREE.MeshLambertMaterial({ color: 0x008080 });

  const rightArmPivot = new THREE.Group(); rightArmPivot.position.set(0.55, 1.45, 0);
  const rightArm = new THREE.Mesh(armGeo, armMat); rightArmPivot.add(rightArm);
  steve.add(rightArmPivot);

  // Legs
  const legGeo = new THREE.BoxGeometry(0.35, 1.0, 0.35); legGeo.translate(0, -0.5, 0);
  const legMat = new THREE.MeshLambertMaterial({ color: 0x000080 });

  const leftLegPivot = new THREE.Group(); leftLegPivot.position.set(-0.2, 1.0, 0);
  leftLegPivot.add(new THREE.Mesh(legGeo, legMat)); steve.add(leftLegPivot);

  const rightLegPivot = new THREE.Group(); rightLegPivot.position.set(0.2, 1.0, 0);
  rightLegPivot.add(new THREE.Mesh(legGeo, legMat)); steve.add(rightLegPivot);

  steve.add(createNameTagCanvas(name || 'Player'));
  steve.userData = { leftLegPivot, rightLegPivot, rightArmPivot, head, walkTimer: 0, currentEmote: null, emoteTimer: 0 };
  return steve;
}

// 4. Emotes System
function triggerEmote(emoteName) {
  socket.emit('playEmote', emoteName);
}

socket.on('playerEmote', (data) => {
  const steve = (data.id === socket.id) ? null : remotePlayers[data.id];
  if (steve) {
    steve.userData.currentEmote = data.emote;
    steve.userData.emoteTimer = 120; // Emote duration
  }
});

// 5. User Portal & Connection Setup
let localPlayerName = "Player";
document.getElementById('join-btn').addEventListener('click', () => {
  const input = document.getElementById('username-input').value.trim();
  if (input !== "") localPlayerName = input;
  document.getElementById('player-display-name').innerText = localPlayerName;
  document.getElementById('name-portal').style.display = 'none';
  socket.emit('joinGame', localPlayerName);
});

const remotePlayers = {};

socket.on('currentPlayers', (players) => {
  Object.keys(players).forEach((id) => {
    if (id !== socket.id && !remotePlayers[id]) {
      const steve = createSteveMesh(players[id].name);
      steve.position.set(players[id].x, players[id].y, players[id].z);
      scene.add(steve);
      remotePlayers[id] = steve;
    }
  });
});

socket.on('newPlayer', (data) => {
  if (data.id !== socket.id && !remotePlayers[data.id]) {
    const steve = createSteveMesh(data.name);
    steve.position.set(data.x, data.y, data.z);
    scene.add(steve);
    remotePlayers[data.id] = steve;
  }
});

socket.on('playerMoved', (data) => {
  const steve = remotePlayers[data.id];
  if (steve) {
    if (data.inCar && data.carId !== null && cars[data.carId]) {
      steve.visible = false;
      cars[data.carId].mesh.position.set(data.x, data.y, data.z);
      cars[data.carId].mesh.rotation.y = data.rotationY;
    } else {
      steve.visible = true;
      steve.position.set(data.x, data.y - 1.6, data.z);
      steve.rotation.y = data.rotationY;

      if (data.isMoving) {
        steve.userData.walkTimer += 0.25;
        steve.userData.leftLegPivot.rotation.x = Math.sin(steve.userData.walkTimer) * 0.6;
        steve.userData.rightLegPivot.rotation.x = -Math.sin(steve.userData.walkTimer) * 0.6;
      } else {
        steve.userData.leftLegPivot.rotation.x = 0;
        steve.userData.rightLegPivot.rotation.x = 0;
      }
    }
  }
});

socket.on('playerDisconnected', (id) => {
  if (remotePlayers[id]) {
    scene.remove(remotePlayers[id]);
    delete remotePlayers[id];
  }
});

// Chat Engine
const chatInput = document.getElementById('chat-input');
const chatSend = document.getElementById('chat-send');
const chatMessages = document.getElementById('chat-messages');

function sendChatMessage() {
  const msg = chatInput.value.trim();
  if (msg !== '') {
    socket.emit('chatMessage', msg);
    chatInput.value = '';
  }
}
chatSend.addEventListener('click', (e) => { e.preventDefault(); sendChatMessage(); });
chatInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); sendChatMessage(); } });

socket.on('chatMessage', (data) => {
  const div = document.createElement('div');
  div.className = 'chat-msg';
  div.innerHTML = `<strong>${data.name}:</strong> ${data.text}`;
  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;
});

// 6. City Environment with Windows, Colorful Shops & Roads
const CITY_SIZE = 6;
const BLOCK_SIZE = 32;
const cityGroup = new THREE.Group();
scene.add(cityGroup);

const roadGeo = new THREE.PlaneGeometry(BLOCK_SIZE, BLOCK_SIZE); roadGeo.rotateX(-Math.PI / 2);
const roadMat = new THREE.MeshLambertMaterial({ color: 0x222222 });
const shopColors = [0xe63946, 0x2a9d8f, 0xe9c46a, 0xf4a261, 0x9c27b0];

for (let x = -CITY_SIZE; x <= CITY_SIZE; x++) {
  for (let z = -CITY_SIZE; z <= CITY_SIZE; z++) {
    const posX = x * BLOCK_SIZE;
    const posZ = z * BLOCK_SIZE;

    if (x % 2 === 0 || z % 2 === 0) {
      const road = new THREE.Mesh(roadGeo, roadMat);
      road.position.set(posX, 0, posZ);
      cityGroup.add(road);
    } else {
      const bHeight = Math.floor(Math.random() * 25) + 20;
      const buildingGroup = new THREE.Group();

      // Main Building Body
      const bMat = new THREE.MeshLambertMaterial({ color: 0x555566 });
      const bMesh = new THREE.Mesh(new THREE.BoxGeometry(BLOCK_SIZE - 6, bHeight, BLOCK_SIZE - 6), bMat);
      bMesh.position.set(0, bHeight / 2, 0); buildingGroup.add(bMesh);

      // Colorful Shop Front at Ground Level
      const shopMat = new THREE.MeshLambertMaterial({ color: shopColors[Math.floor(Math.random() * shopColors.length)] });
      const shopMesh = new THREE.Mesh(new THREE.BoxGeometry(BLOCK_SIZE - 5.8, 4, BLOCK_SIZE - 5.8), shopMat);
      shopMesh.position.set(0, 2, 0); buildingGroup.add(shopMesh);

      // Glowing Windows
      const winMat = new THREE.MeshBasicMaterial({ color: 0xffea00 });
      const winGeo = new THREE.PlaneGeometry(1.2, 1.8);
      for (let wy = 6; wy < bHeight - 2; wy += 4) {
        for (let wx = -8; wx <= 8; wx += 4) {
          const win = new THREE.Mesh(winGeo, winMat);
          win.position.set(wx, wy, (BLOCK_SIZE - 5.9) / 2);
          buildingGroup.add(win);
        }
      }
      buildingGroup.position.set(posX, 0, posZ);
      cityGroup.add(buildingGroup);
    }
  }
}

const groundGeo = new THREE.PlaneGeometry(2000, 2000); groundGeo.rotateX(-Math.PI / 2);
const groundMat = new THREE.MeshLambertMaterial({ color: 0x1e3a1e });
const ground = new THREE.Mesh(groundGeo, groundMat); ground.position.y = -0.1; scene.add(ground);

// 7. Vehicles (Cars, Buses, Heavy Trucks) & NPC Traffic
const cars = [];
function createVehicle(id, type, x, z, color) {
  const veh = new THREE.Group();
  let bodyGeo, cabinGeo;

  if (type === 'bus') {
    bodyGeo = new THREE.BoxGeometry(3.0, 2.8, 9.0);
    cabinGeo = new THREE.BoxGeometry(2.8, 0.5, 2.0);
  } else if (type === 'truck') {
    bodyGeo = new THREE.BoxGeometry(3.2, 3.2, 8.0);
    cabinGeo = new THREE.BoxGeometry(3.0, 2.0, 2.5);
  } else {
    bodyGeo = new THREE.BoxGeometry(2.2, 0.8, 4.2);
    cabinGeo = new THREE.BoxGeometry(2.0, 0.9, 2.0);
  }

  const mat = new THREE.MeshLambertMaterial({ color: color });
  const body = new THREE.Mesh(bodyGeo, mat); body.position.y = bodyGeo.parameters.height / 2;
  veh.add(body);

  veh.position.set(x, 0, z); scene.add(veh);
  cars.push({ id, mesh: veh, speed: 0, rotation: 0, type });
}

createVehicle(0, 'car', 0, 10, 0xcc2222);
createVehicle(1, 'bus', 25, -20, 0x3366cc);
createVehicle(2, 'truck', -25, 30, 0x22aa33);

// 8. Dynamic NPCs (Workers, Officers, Jokers, Animals)
const npcs = [];
const npcTypes = [
  { name: 'Worker', color: 0xff9800 },
  { name: 'Officer', color: 0x1a237e },
  { name: 'Joker', color: 0x9c27b0 }
];

for (let i = 0; i < 20; i++) {
  const t = npcTypes[i % npcTypes.length];
  const npc = createSteveMesh(t.name);
  npc.children[0].material = new THREE.MeshLambertMaterial({ color: t.color });
  const rx = (Math.random() - 0.5) * 200;
  const rz = (Math.random() - 0.5) * 200;
  npc.position.set(rx, 0, rz);
  scene.add(npc);
  npcs.push({ mesh: npc, dir: Math.random() * Math.PI * 2, speed: 0.04 });
}

// Animals (Dogs/Cats on Ground, Birds Overhead)
const birds = [];
const birdGeo = new THREE.ConeGeometry(0.3, 0.8, 4); birdGeo.rotateX(Math.PI / 2);
const birdMat = new THREE.MeshBasicMaterial({ color: 0x111111 });

for (let i = 0; i < 12; i++) {
  const bird = new THREE.Mesh(birdGeo, birdMat);
  bird.position.set((Math.random() - 0.5) * 300, 25 + Math.random() * 15, (Math.random() - 0.5) * 300);
  scene.add(bird);
  birds.push(bird);
}

// 9. Controls & Driver-Passenger Mechanics
let hp = 100, isDead = false;
let currentCar = null, isDriver = false;
let moveForward = false, moveBackward = false, moveLeft = false, moveRight = false;
let joystickVector = { x: 0, y: 0 };
let yaw = 0, pitch = 0;
let playerVelocityY = 0;
const gravity = -0.018;
let isGrounded = true;

camera.position.set(0, 1.6, 0);

// Driver-Passenger Socket Response
socket.on('carEntryResult', (res) => {
  if (res.success) {
    cars.forEach(car => {
      if (car.id === res.carId) {
        currentCar = car;
        isDriver = res.isDriver;
      }
    });
  }
});

function toggleCarState() {
  if (currentCar) {
    socket.emit('leaveCar', currentCar.id);
    camera.position.copy(currentCar.mesh.position).add(new THREE.Vector3(2, 1.6, 0));
    currentCar = null;
    isDriver = false;
  } else {
    cars.forEach(car => {
      if (camera.position.distanceTo(car.mesh.position) < 4.5) {
        socket.emit('requestCarEntry', car.id);
      }
    });
  }
}

// Mobile Joystick & Look Controls
const joystickZone = document.getElementById('joystick-zone');
const joystickKnob = document.getElementById('joystick-knob');
let joystickActive = false; const maxRadius = 30;

joystickZone.addEventListener('touchstart', (e) => { joystickActive = true; updateJoystick(e.touches[0]); });
joystickZone.addEventListener('touchmove', (e) => { if (joystickActive) updateJoystick(e.touches[0]); });
joystickZone.addEventListener('touchend', () => {
  joystickActive = false; joystickKnob.style.transform = `translate(0px, 0px)`; joystickVector = { x: 0, y: 0 };
});

function updateJoystick(touch) {
  const rect = joystickZone.getBoundingClientRect();
  const dx = touch.clientX - (rect.left + rect.width / 2);
  const dy = touch.clientY - (rect.top + rect.height / 2);
  const dist = Math.hypot(dx, dy);
  const clampDist = Math.min(dist, maxRadius);
  const angle = Math.atan2(dy, dx);
  const knobX = Math.cos(angle) * clampDist;
  const knobY = Math.sin(angle) * clampDist;
  joystickKnob.style.transform = `translate(${knobX}px, ${knobY}px)`;
  joystickVector = { x: knobX / maxRadius, y: knobY / maxRadius };
}

let touchStartX = 0, touchStartY = 0;
document.addEventListener('touchstart', (e) => {
  if (e.touches.length > 0 && e.touches[0].clientX > window.innerWidth / 2) {
    touchStartX = e.touches[0].clientX; touchStartY = e.touches[0].clientY;
  }
});
document.addEventListener('touchmove', (e) => {
  if (isMobile && !currentCar && e.touches.length > 0 && e.touches[0].clientX > window.innerWidth / 2) {
    const deltaX = e.touches[0].clientX - touchStartX;
    const deltaY = e.touches[0].clientY - touchStartY;
    touchStartX = e.touches[0].clientX; touchStartY = e.touches[0].clientY;
    yaw -= deltaX * 0.008; pitch -= deltaY * 0.008;
    pitch = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, pitch));
    camera.rotation.order = "YXZ"; camera.rotation.y = yaw; camera.rotation.x = pitch;
  }
});

document.body.addEventListener('click', (e) => {
  if (!isMobile && !isDead && e.target.tagName !== 'INPUT' && e.target.tagName !== 'BUTTON') {
    document.body.requestPointerLock();
  }
});
document.addEventListener('mousemove', (e) => {
  if (document.pointerLockElement === document.body && !currentCar) {
    yaw -= e.movementX * 0.004; pitch -= e.movementY * 0.004;
    pitch = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, pitch));
    camera.rotation.order = "YXZ"; camera.rotation.y = yaw; camera.rotation.x = pitch;
  }
});

document.addEventListener('keydown', (e) => {
  if (isDead) return;
  if (e.code === 'KeyW') moveForward = true;
  if (e.code === 'KeyS') moveBackward = true;
  if (e.code === 'KeyA') moveLeft = true;
  if (e.code === 'KeyD') moveRight = true;
  if (e.code === 'Space' && isGrounded && !currentCar) { playerVelocityY = 0.25; isGrounded = false; }
  if (e.code === 'KeyE') toggleCarState();
});

document.addEventListener('keyup', (e) => {
  if (e.code === 'KeyW') moveForward = false;
  if (e.code === 'KeyS') moveBackward = false;
  if (e.code === 'KeyA') moveLeft = false;
  if (e.code === 'KeyD') moveRight = false;
});

document.getElementById('btn-jump').addEventListener('touchstart', () => {
  if (isGrounded && !currentCar) { playerVelocityY = 0.25; isGrounded = false; }
});
document.getElementById('btn-action').addEventListener('touchstart', toggleCarState);
document.getElementById('btn-shoot').addEventListener('touchstart', shootGun);

// Firing FX
const bullets = [];
const bulletGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.8); bulletGeo.rotateX(Math.PI / 2);
const bulletMat = new THREE.MeshBasicMaterial({ color: 0xffcc00 });

document.addEventListener('mousedown', (e) => {
  if (e.button === 0 && document.pointerLockElement === document.body) shootGun();
});

function shootGun() {
  if (isDead || currentCar) return;
  const bullet = new THREE.Mesh(bulletGeo, bulletMat);
  bullet.position.copy(camera.position).add(new THREE.Vector3(0, -0.2, 0));
  const dir = new THREE.Vector3(); camera.getWorldDirection(dir);
  bullet.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, -1), dir);
  bullet.userData = { velocity: dir.multiplyScalar(2.0), life: 40 };
  scene.add(bullet); bullets.push(bullet);

  socket.emit('playerShot', {
    origin: { x: camera.position.x, y: camera.position.y, z: camera.position.z },
    direction: { x: dir.x, y: dir.y, z: dir.z }
  });
}

// 10. Main Render Physics Loop
let isLocalMoving = false;

function updateGame() {
  if (isDead) return;

  // Cloud Movement Physics
  cloudGroup.children.forEach(c => {
    c.position.x += 0.05;
    if (c.position.x > 400) c.position.x = -400;
  });

  // NPC Movement & Animations
  npcs.forEach(npc => {
    npc.mesh.translateZ(npc.speed);
    if (Math.random() < 0.01) npc.dir += (Math.random() - 0.5);
    npc.mesh.rotation.y = npc.dir;
    npc.mesh.userData.walkTimer += 0.2;
    npc.mesh.userData.leftLegPivot.rotation.x = Math.sin(npc.mesh.userData.walkTimer) * 0.4;
    npc.mesh.userData.rightLegPivot.rotation.x = -Math.sin(npc.mesh.userData.walkTimer) * 0.4;
  });

  // Flying Birds Logic
  birds.forEach(b => {
    b.translateZ(0.25);
    b.rotation.y += (Math.random() - 0.5) * 0.02;
  });

  // Car Mechanics with First-Player Priority Physics
  if (currentCar) {
    if (isDriver) {
      const driveFwd = moveForward || joystickVector.y < -0.2;
      const driveBwd = moveBackward || joystickVector.y > 0.2;
      const driveLft = moveLeft || joystickVector.x < -0.2;
      const driveRgt = moveRight || joystickVector.x > 0.2;

      if (driveFwd) currentCar.speed = Math.min(currentCar.speed + 0.035, 0.95);
      else if (driveBwd) currentCar.speed = Math.max(currentCar.speed - 0.035, -0.45);
      else currentCar.speed *= 0.94; // Realistic Coasting Friction Physics

      if (driveLft) currentCar.rotation += 0.045;
      if (driveRgt) currentCar.rotation -= 0.045;

      currentCar.mesh.rotation.y = currentCar.rotation;
      currentCar.mesh.translateZ(-currentCar.speed);
    }

    // Camera follow for both Driver & Passenger
    const relativeCameraOffset = new THREE.Vector3(0, 3.5, 7);
    const cameraOffset = relativeCameraOffset.applyMatrix4(currentCar.mesh.matrixWorld);
    camera.position.copy(cameraOffset);
    camera.lookAt(currentCar.mesh.position);

    socket.emit('playerMovement', {
      x: currentCar.mesh.position.x,
      y: currentCar.mesh.position.y,
      z: currentCar.mesh.position.z,
      rotationY: currentCar.rotation,
      inCar: true,
      carId: currentCar.id,
      isMoving: true
    });
  } else {
    const moveX = (moveRight ? 1 : 0) - (moveLeft ? 1 : 0) + joystickVector.x;
    const moveZ = (moveBackward ? 1 : 0) - (moveForward ? 1 : 0) + joystickVector.y;

    if (Math.abs(moveX) > 0.1 || Math.abs(moveZ) > 0.1) {
      isLocalMoving = true;
      const dir = new THREE.Vector3(moveX, 0, moveZ).normalize();
      dir.applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
      camera.position.addScaledVector(dir, 0.28);
    } else {
      isLocalMoving = false;
    }

    playerVelocityY += gravity;
    camera.position.y += playerVelocityY;
    if (camera.position.y <= 1.6) {
      camera.position.y = 1.6; playerVelocityY = 0; isGrounded = true;
    }

    socket.emit('playerMovement', {
      x: camera.position.x,
      y: camera.position.y,
      z: camera.position.z,
      rotationY: yaw,
      inCar: false,
      carId: null,
      isMoving: isLocalMoving
    });
  }

  // Update Bullets
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    b.position.add(b.userData.velocity);
    b.userData.life--;
    if (b.userData.life <= 0) {
      scene.remove(b); bullets.splice(i, 1);
    }
  }
}

function animate() {
  requestAnimationFrame(animate);
  updateGame();
  renderer.render(scene, camera);
}
animate();
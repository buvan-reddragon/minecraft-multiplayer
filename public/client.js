const socket = io();

// 1. Scene Setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.getElementById('canvas-container').appendChild(renderer.domElement);

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);
const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
dirLight.position.set(20, 50, 20);
scene.add(dirLight);

// 2. Procedural Voxel Terrain Generation
const boxGeo = new THREE.BoxGeometry(1, 1, 1);
const grassMat = new THREE.MeshLambertMaterial({ color: 0x55aa55 });
const dirtMat = new THREE.MeshLambertMaterial({ color: 0x8b5a2b });

// Function to calculate terrain height at coordinates (x, z)
function getTerrainHeight(x, z) {
  const height = Math.floor(Math.sin(x * 0.2) * 2 + Math.cos(z * 0.2) * 2);
  return Math.max(0, height);
}

// Build terrain blocks
for (let x = -20; x <= 20; x++) {
  for (let z = -20; z <= 20; z++) {
    const height = getTerrainHeight(x, z);
    for (let y = 0; y <= height; y++) {
      const mat = (y === height) ? grassMat : dirtMat;
      const block = new THREE.Mesh(boxGeo, mat);
      block.position.set(x, y, z);
      scene.add(block);
    }
  }
}

// 3. Multi-Part Avatar Mesh Generator (Steve Style)
function createHumanoidAvatar() {
  const group = new THREE.Group();
  
  // Materials
  const skinMat = new THREE.MeshLambertMaterial({ color: 0xcb9b7e }); // Face/Skin
  const shirtMat = new THREE.MeshLambertMaterial({ color: 0x00a8a8 }); // Cyan Shirt
  const pantsMat = new THREE.MeshLambertMaterial({ color: 0x000080 }); // Blue Jeans

  // Head
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), skinMat);
  head.position.y = 1.45;
  group.add(head);

  // Body / Torso
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.75, 0.25), shirtMat);
  body.position.y = 0.825;
  group.add(body);

  // Left & Right Arms
  const armGeo = new THREE.BoxGeometry(0.2, 0.75, 0.2);
  const leftArm = new THREE.Mesh(armGeo, shirtMat);
  leftArm.position.set(-0.35, 0.825, 0);
  const rightArm = new THREE.Mesh(armGeo, shirtMat);
  rightArm.position.set(0.35, 0.825, 0);
  group.add(leftArm, rightArm);

  // Left & Right Legs
  const legGeo = new THREE.BoxGeometry(0.22, 0.75, 0.22);
  const leftLeg = new THREE.Mesh(legGeo, pantsMat);
  leftLeg.position.set(-0.13, 0.375, 0);
  const rightLeg = new THREE.Mesh(legGeo, pantsMat);
  rightLeg.position.set(0.13, 0.375, 0);
  group.add(leftLeg, rightLeg);

  return group;
}

const otherPlayers = {};

// 4. Controls & Physics Variables
camera.position.set(0, 5, 0);
let moveForward = false, moveBackward = false, moveLeft = false, moveRight = false;
let yaw = 0, pitch = 0;

// Physics parameters
let playerVelocityY = 0;
const gravity = -0.015;
const jumpStrength = 0.22;
let isGrounded = false;
const playerEyeHeight = 1.6;

document.addEventListener('click', () => {
  if (document.activeElement.id !== 'chat-input') {
    document.body.requestPointerLock();
  }
});

document.addEventListener('mousemove', (e) => {
  if (document.pointerLockElement === document.body) {
    yaw -= e.movementX * 0.002;
    pitch -= e.movementY * 0.002;
    pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, pitch));
    
    camera.rotation.order = "YXZ";
    camera.rotation.y = yaw;
    camera.rotation.x = pitch;
  }
});

document.addEventListener('keydown', (e) => {
  if (document.activeElement.id === 'chat-input') return;
  if (e.code === 'KeyW') moveForward = true;
  if (e.code === 'KeyS') moveBackward = true;
  if (e.code === 'KeyA') moveLeft = true;
  if (e.code === 'KeyD') moveRight = true;

  // Jump control
  if (e.code === 'Space' && isGrounded) {
    playerVelocityY = jumpStrength;
    isGrounded = false;
  }
});

document.addEventListener('keyup', (e) => {
  if (e.code === 'KeyW') moveForward = false;
  if (e.code === 'KeyS') moveBackward = false;
  if (e.code === 'KeyA') moveLeft = false;
  if (e.code === 'KeyD') moveRight = false;
});

function updatePhysicsAndMovement() {
  // Horizontal Movement
  const dir = new THREE.Vector3();
  if (moveForward) dir.z -= 1;
  if (moveBackward) dir.z += 1;
  if (moveLeft) dir.x -= 1;
  if (moveRight) dir.x += 1;
  dir.normalize();
  dir.applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);

  if (moveForward || moveBackward || moveLeft || moveRight) {
    camera.position.addScaledVector(dir, 0.1);
  }

  // Gravity & Elevation Check
  playerVelocityY += gravity;
  camera.position.y += playerVelocityY;

  // Find terrain ground under player
  const currentBlockX = Math.round(camera.position.x);
  const currentBlockZ = Math.round(camera.position.z);
  const currentGroundY = getTerrainHeight(currentBlockX, currentBlockZ) + 0.5 + playerEyeHeight;

  if (camera.position.y <= currentGroundY) {
    camera.position.y = currentGroundY;
    playerVelocityY = 0;
    isGrounded = true;
  }

  // Sync position to server
  if (moveForward || moveBackward || moveLeft || moveRight || !isGrounded) {
    socket.emit('playerMovement', {
      x: camera.position.x,
      y: camera.position.y,
      z: camera.position.z
    });
  }
}

// 5. Multiplayer Events
socket.on('currentPlayers', (players) => {
  Object.keys(otherPlayers).forEach(id => {
    scene.remove(otherPlayers[id]);
    delete otherPlayers[id];
  });

  Object.keys(players).forEach((id) => {
    if (id !== socket.id) {
      const avatar = createHumanoidAvatar();
      avatar.position.set(players[id].x, players[id].y - playerEyeHeight, players[id].z);
      scene.add(avatar);
      otherPlayers[id] = avatar;
    }
  });
});

socket.on('newPlayer', (data) => {
  const avatar = createHumanoidAvatar();
  avatar.position.set(data.player.x, data.player.y - playerEyeHeight, data.player.z);
  scene.add(avatar);
  otherPlayers[data.id] = avatar;
});

socket.on('playerMoved', (data) => {
  if (otherPlayers[data.id]) {
    otherPlayers[data.id].position.set(data.position.x, data.position.y - playerEyeHeight, data.position.z);
  }
});

socket.on('playerDisconnected', (id) => {
  if (otherPlayers[id]) {
    scene.remove(otherPlayers[id]);
    delete otherPlayers[id];
  }
});

// UI Room Switch
document.getElementById('room-select').addEventListener('change', (e) => {
  socket.emit('switchRoom', e.target.value);
  document.getElementById('chat-messages').innerHTML = '';
});

// Chat Logic
const chatInput = document.getElementById('chat-input');
const sendBtn = document.getElementById('chat-send');
const chatMessages = document.getElementById('chat-messages');

function sendChatMessage() {
  const text = chatInput.value.trim();
  if (text) {
    socket.emit('roomChat', text);
    chatInput.value = '';
  }
}

sendBtn.addEventListener('click', sendChatMessage);
chatInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') sendChatMessage();
});

socket.on('chatMessage', (data) => {
  const msgEl = document.createElement('div');
  msgEl.innerText = `[${data.id}]: ${data.text}`;
  chatMessages.appendChild(msgEl);
  chatMessages.scrollTop = chatMessages.scrollHeight;
});

// 6. Game Loop
function animate() {
  requestAnimationFrame(animate);
  updatePhysicsAndMovement();
  renderer.render(scene, camera);
}
animate();
const socket = io();

// 1. World & Camera Setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB); // Sky daylight
scene.fog = new THREE.FogExp2(0x87CEEB, 0.005);

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
const sunLight = new THREE.DirectionalLight(0xffffff, 1.2);
sunLight.position.set(100, 150, 50);
scene.add(sunLight);

// Mobile Device Check
const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
if (isMobile) {
  document.querySelectorAll('.mobile-btn').forEach(b => b.style.display = 'flex');
  document.getElementById('joystick-zone').style.display = 'block';
  document.getElementById('chat-container').style.bottom = '140px'; // Reposition above mobile joystick
}

// 2. Multiplayer Steve Avatars
const remotePlayers = {};

function createSteveMesh(id) {
  const steve = new THREE.Group();

  // Shirt Body
  const bodyGeo = new THREE.BoxGeometry(0.8, 1.0, 0.4);
  const bodyMat = new THREE.MeshLambertMaterial({ color: 0x008080 });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.y = 1.0;
  steve.add(body);

  // Head
  const headGeo = new THREE.BoxGeometry(0.5, 0.5, 0.5);
  const headMat = new THREE.MeshLambertMaterial({ color: 0xc68b59 });
  const head = new THREE.Mesh(headGeo, headMat);
  head.position.y = 1.75;
  steve.add(head);

  // Legs
  const legGeo = new THREE.BoxGeometry(0.35, 1.0, 0.35);
  const legMat = new THREE.MeshLambertMaterial({ color: 0x000080 });
  const leftLeg = new THREE.Mesh(legGeo, legMat);
  leftLeg.position.set(-0.2, 0.5, 0);
  const rightLeg = new THREE.Mesh(legGeo, legMat);
  rightLeg.position.set(0.2, 0.5, 0);
  steve.add(leftLeg);
  steve.add(rightLeg);

  return steve;
}

// Socket Receivers for Global Multiplayer Sync
socket.on('currentPlayers', (players) => {
  Object.keys(players).forEach((id) => {
    if (id !== socket.id && !remotePlayers[id]) {
      const steve = createSteveMesh(id);
      steve.position.set(players[id].x, players[id].y, players[id].z);
      scene.add(steve);
      remotePlayers[id] = steve;
    }
  });
});

socket.on('newPlayer', (data) => {
  if (data.id !== socket.id && !remotePlayers[data.id]) {
    const steve = createSteveMesh(data.id);
    steve.position.set(data.x, data.y, data.z);
    scene.add(steve);
    remotePlayers[data.id] = steve;
  }
});

socket.on('playerMoved', (data) => {
  if (remotePlayers[data.id]) {
    remotePlayers[data.id].position.set(data.x, data.y - 1.6, data.z);
  }
});

socket.on('playerDisconnected', (id) => {
  if (remotePlayers[id]) {
    scene.remove(remotePlayers[id]);
    delete remotePlayers[id];
  }
});

// 3. Guaranteed Chat System
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

chatSend.addEventListener('click', (e) => {
  e.preventDefault();
  sendChatMessage();
});

chatInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    sendChatMessage();
  }
});

socket.on('chatMessage', (data) => {
  const senderName = data.id === socket.id ? "You" : `Player ${data.id.substring(0, 4)}`;
  const div = document.createElement('div');
  div.className = 'chat-msg';
  div.innerHTML = `<strong>${senderName}:</strong> ${data.text}`;
  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;
});

// 4. City & Pickup Truck Design
const CITY_SIZE = 8;
const BLOCK_SIZE = 28;
const cityGroup = new THREE.Group();
scene.add(cityGroup);

const roadGeo = new THREE.PlaneGeometry(BLOCK_SIZE, BLOCK_SIZE);
roadGeo.rotateX(-Math.PI / 2);
const roadMat = new THREE.MeshLambertMaterial({ color: 0x333333 });
const buildingMat = new THREE.MeshLambertMaterial({ color: 0x999999 });

for (let x = -CITY_SIZE; x <= CITY_SIZE; x++) {
  for (let z = -CITY_SIZE; z <= CITY_SIZE; z++) {
    const posX = x * BLOCK_SIZE;
    const posZ = z * BLOCK_SIZE;

    if (x % 2 === 0 || z % 2 === 0) {
      const road = new THREE.Mesh(roadGeo, roadMat);
      road.position.set(posX, 0, posZ);
      cityGroup.add(road);
    } else {
      const bHeight = Math.floor(Math.random() * 30) + 15;
      const buildingGeo = new THREE.BoxGeometry(BLOCK_SIZE - 4, bHeight, BLOCK_SIZE - 4);
      const building = new THREE.Mesh(buildingGeo, buildingMat);
      building.position.set(posX, bHeight / 2, posZ);
      cityGroup.add(building);
    }
  }
}

const groundGeo = new THREE.PlaneGeometry(2000, 2000);
groundGeo.rotateX(-Math.PI / 2);
const groundMat = new THREE.MeshLambertMaterial({ color: 0x2e8b57 });
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.position.y = -0.1;
scene.add(ground);

const cars = [];
function createDetailedCar(x, z) {
  const car = new THREE.Group();
  const bodyGeo = new THREE.BoxGeometry(2.2, 0.8, 4.2);
  const bodyMat = new THREE.MeshLambertMaterial({ color: 0xcc2222 });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.y = 0.6;
  car.add(body);

  const cabinGeo = new THREE.BoxGeometry(2.0, 0.9, 2.0);
  const cabinMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
  const cabin = new THREE.Mesh(cabinGeo, cabinMat);
  cabin.position.set(0, 1.45, -0.3);
  car.add(cabin);

  const wheelGeo = new THREE.CylinderGeometry(0.45, 0.45, 0.4, 16);
  wheelGeo.rotateZ(Math.PI / 2);
  const wheelMat = new THREE.MeshLambertMaterial({ color: 0x151515 });
  const positions = [[-1.15, 0.45, 1.3], [1.15, 0.45, 1.3], [-1.15, 0.45, -1.3], [1.15, 0.45, -1.3]];
  positions.forEach(p => {
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.position.set(...p);
    car.add(w);
  });

  car.position.set(x, 0, z);
  scene.add(car);
  cars.push({ mesh: car, speed: 0, rotation: 0 });
}
createDetailedCar(0, 10);
createDetailedCar(25, -20);

// 5. Physics & Movement Controls
let hp = 100, isDead = false, currentCar = null;
let moveForward = false, moveBackward = false, moveLeft = false, moveRight = false;
let joystickVector = { x: 0, y: 0 };
let yaw = 0, pitch = 0;
let playerVelocityY = 0;
const gravity = -0.015;
let isGrounded = true;

camera.position.set(0, 1.6, 0);

// Joystick Logic
const joystickZone = document.getElementById('joystick-zone');
const joystickKnob = document.getElementById('joystick-knob');
let joystickActive = false;
const maxRadius = 30;

joystickZone.addEventListener('touchstart', (e) => { joystickActive = true; updateJoystick(e.touches[0]); });
joystickZone.addEventListener('touchmove', (e) => { if (joystickActive) updateJoystick(e.touches[0]); });
joystickZone.addEventListener('touchend', () => {
  joystickActive = false;
  joystickKnob.style.transform = `translate(0px, 0px)`;
  joystickVector = { x: 0, y: 0 };
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

// Touch Screen Camera Swipe
let touchStartX = 0, touchStartY = 0;
document.addEventListener('touchstart', (e) => {
  if (e.touches.length > 0 && e.touches[0].clientX > window.innerWidth / 2) {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  }
});
document.addEventListener('touchmove', (e) => {
  if (isMobile && !currentCar && e.touches.length > 0 && e.touches[0].clientX > window.innerWidth / 2) {
    const deltaX = e.touches[0].clientX - touchStartX;
    const deltaY = e.touches[0].clientY - touchStartY;
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;

    yaw -= deltaX * 0.005;
    pitch -= deltaY * 0.005;
    pitch = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, pitch));
    camera.rotation.order = "YXZ";
    camera.rotation.y = yaw; camera.rotation.x = pitch;
  }
});

// PC Mouse pointer lock
document.body.addEventListener('click', (e) => {
  if (!isMobile && !isDead && e.target.tagName !== 'INPUT' && e.target.tagName !== 'BUTTON') {
    document.body.requestPointerLock();
  }
});
document.addEventListener('mousemove', (e) => {
  if (document.pointerLockElement === document.body && !currentCar) {
    yaw -= e.movementX * 0.0025;
    pitch -= e.movementY * 0.0025;
    pitch = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, pitch));
    camera.rotation.order = "YXZ";
    camera.rotation.y = yaw; camera.rotation.x = pitch;
  }
});

document.addEventListener('keydown', (e) => {
  if (isDead) return;
  if (e.code === 'KeyW') moveForward = true;
  if (e.code === 'KeyS') moveBackward = true;
  if (e.code === 'KeyA') moveLeft = true;
  if (e.code === 'KeyD') moveRight = true;
  if (e.code === 'Space' && isGrounded && !currentCar) { playerVelocityY = 0.22; isGrounded = false; }
  if (e.code === 'KeyE') toggleCarState();
});

document.addEventListener('keyup', (e) => {
  if (e.code === 'KeyW') moveForward = false;
  if (e.code === 'KeyS') moveBackward = false;
  if (e.code === 'KeyA') moveLeft = false;
  if (e.code === 'KeyD') moveRight = false;
});

document.getElementById('btn-jump').addEventListener('touchstart', () => {
  if (isGrounded && !currentCar) { playerVelocityY = 0.22; isGrounded = false; }
});
document.getElementById('btn-action').addEventListener('touchstart', toggleCarState);
document.getElementById('btn-shoot').addEventListener('touchstart', shootGun);

// 6. Firing Gun Logic
const bullets = [];
const bulletGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.8);
bulletGeo.rotateX(Math.PI / 2);
const bulletMat = new THREE.MeshBasicMaterial({ color: 0xffcc00 });

document.addEventListener('mousedown', (e) => {
  if (e.button === 0 && document.pointerLockElement === document.body) shootGun();
});

function shootGun() {
  if (isDead || currentCar) return;

  const bullet = new THREE.Mesh(bulletGeo, bulletMat);
  bullet.position.copy(camera.position).add(new THREE.Vector3(0, -0.2, 0));

  const dir = new THREE.Vector3();
  camera.getWorldDirection(dir);
  bullet.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, -1), dir);
  bullet.userData = { velocity: dir.multiplyScalar(1.6), life: 40 };
  
  scene.add(bullet);
  bullets.push(bullet);

  // Muzzle flash particle effect
  const flashGeo = new THREE.SphereGeometry(0.25, 8, 8);
  const flashMat = new THREE.MeshBasicMaterial({ color: 0xffff00 });
  const flash = new THREE.Mesh(flashGeo, flashMat);
  flash.position.copy(camera.position).add(dir.clone().multiplyScalar(0.8));
  scene.add(flash);
  setTimeout(() => scene.remove(flash), 40);

  socket.emit('playerShot', {
    origin: { x: camera.position.x, y: camera.position.y, z: camera.position.z },
    direction: { x: dir.x, y: dir.y, z: dir.z }
  });
}

function toggleCarState() {
  if (currentCar) {
    camera.position.copy(currentCar.mesh.position).add(new THREE.Vector3(2, 1.6, 0));
    currentCar = null;
  } else {
    cars.forEach(car => {
      if (camera.position.distanceTo(car.mesh.position) < 4) currentCar = car;
    });
  }
}

// 7. Render & Update Loop
function updateGame() {
  if (isDead) return;

  if (currentCar) {
    const driveFwd = moveForward || joystickVector.y < -0.2;
    const driveBwd = moveBackward || joystickVector.y > 0.2;
    const driveLft = moveLeft || joystickVector.x < -0.2;
    const driveRgt = moveRight || joystickVector.x > 0.2;

    if (driveFwd) currentCar.speed = Math.min(currentCar.speed + 0.02, 0.6);
    else if (driveBwd) currentCar.speed = Math.max(currentCar.speed - 0.02, -0.3);
    else currentCar.speed *= 0.95;

    if (driveLft) currentCar.rotation += 0.03;
    if (driveRgt) currentCar.rotation -= 0.03;

    currentCar.mesh.rotation.y = currentCar.rotation;
    currentCar.mesh.translateZ(-currentCar.speed);

    const relativeCameraOffset = new THREE.Vector3(0, 3.5, 7);
    const cameraOffset = relativeCameraOffset.applyMatrix4(currentCar.mesh.matrixWorld);
    camera.position.copy(cameraOffset);
    camera.lookAt(currentCar.mesh.position);
  } else {
    const moveX = (moveRight ? 1 : 0) - (moveLeft ? 1 : 0) + joystickVector.x;
    const moveZ = (moveBackward ? 1 : 0) - (moveForward ? 1 : 0) + joystickVector.y;

    if (Math.abs(moveX) > 0.1 || Math.abs(moveZ) > 0.1) {
      const dir = new THREE.Vector3(moveX, 0, moveZ).normalize();
      dir.applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
      camera.position.addScaledVector(dir, 0.15);
    }

    playerVelocityY += gravity;
    camera.position.y += playerVelocityY;
    if (camera.position.y <= 1.6) {
      camera.position.y = 1.6; playerVelocityY = 0; isGrounded = true;
    }
  }

  // Update Fired Bullets
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    b.position.add(b.userData.velocity);
    b.userData.life--;
    if (b.userData.life <= 0) {
      scene.remove(b); bullets.splice(i, 1);
    }
  }

  // Send movement update to server
  socket.emit('playerMovement', { x: camera.position.x, y: camera.position.y, z: camera.position.z });
}

function animate() {
  requestAnimationFrame(animate);
  updateGame();
  renderer.render(scene, camera);
}
animate();
const socket = io();

// 1. Scene & Bright Daylight Setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB); // Bright Daylight Sky Blue
scene.fog = new THREE.FogExp2(0x87CEEB, 0.005);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.getElementById('canvas-container').appendChild(renderer.domElement);

// Bright Sun & Ambient Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
scene.add(ambientLight);
const sunLight = new THREE.DirectionalLight(0xffffff, 1.2);
sunLight.position.set(100, 150, 50);
scene.add(sunLight);

// Mobile Touch Detection
const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
if (isMobile) {
  document.querySelectorAll('.mobile-btn').forEach(b => b.style.display = 'flex');
  document.getElementById('joystick-zone').style.display = 'block';
  document.getElementById('chat-container').style.bottom = '160px'; // Shift chat up for joystick
}

// 2. Room Joining & Chat Engine
let currentRoomName = "";
function joinRoom(roomName) {
  currentRoomName = roomName;
  socket.emit('joinRoom', roomName);
  document.getElementById('room-overlay').style.display = 'none';
  document.getElementById('current-room').innerText = roomName;
}

const chatInput = document.getElementById('chat-input');
const chatSend = document.getElementById('chat-send');
const chatMessages = document.getElementById('chat-messages');

function sendChatMessage() {
  const msg = chatInput.value.trim();
  if (msg && currentRoomName) {
    socket.emit('chatMessage', { room: currentRoomName, message: msg });
    chatInput.value = '';
  }
}

chatSend.addEventListener('click', sendChatMessage);
chatInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') sendChatMessage();
});

socket.on('message', (data) => {
  const div = document.createElement('div');
  div.innerText = data;
  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;
});

// 3. City & Car Generation
const CITY_SIZE = 10;
const BLOCK_SIZE = 30;
const cityGroup = new THREE.Group();
scene.add(cityGroup);

const roadGeo = new THREE.PlaneGeometry(BLOCK_SIZE, BLOCK_SIZE);
roadGeo.rotateX(-Math.PI / 2);
const roadMat = new THREE.MeshLambertMaterial({ color: 0x444444 });
const buildingMat = new THREE.MeshLambertMaterial({ color: 0xcccccc });

for (let x = -CITY_SIZE; x <= CITY_SIZE; x++) {
  for (let z = -CITY_SIZE; z <= CITY_SIZE; z++) {
    const posX = x * BLOCK_SIZE;
    const posZ = z * BLOCK_SIZE;

    if (x % 2 === 0 || z % 2 === 0) {
      const road = new THREE.Mesh(roadGeo, roadMat);
      road.position.set(posX, 0, posZ);
      cityGroup.add(road);
    } else {
      const bHeight = Math.floor(Math.random() * 35) + 15;
      const buildingGeo = new THREE.BoxGeometry(BLOCK_SIZE - 4, bHeight, BLOCK_SIZE - 4);
      const building = new THREE.Mesh(buildingGeo, buildingMat);
      building.position.set(posX, bHeight / 2, posZ);
      cityGroup.add(building);
    }
  }
}

const groundGeo = new THREE.PlaneGeometry(2000, 2000);
groundGeo.rotateX(-Math.PI / 2);
const groundMat = new THREE.MeshLambertMaterial({ color: 0x228B22 }); // Grass green outskirts
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.position.y = -0.1;
scene.add(ground);

// Drivable Cars
const cars = [];
function createCar(x, z) {
  const carGroup = new THREE.Group();
  const bodyGeo = new THREE.BoxGeometry(2.2, 1.2, 4.5);
  const bodyMat = new THREE.MeshLambertMaterial({ color: 0xff0000 });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.y = 0.8;
  carGroup.add(body);

  carGroup.position.set(x, 0, z);
  scene.add(carGroup);
  cars.push({ mesh: carGroup, speed: 0, rotation: 0 });
}
createCar(0, 15);
createCar(30, -15);

// 4. Player State & Mobile Analog Touch Controls
let hp = 100, isDead = false, currentCar = null;
let moveForward = false, moveBackward = false, moveLeft = false, moveRight = false;
let joystickVector = { x: 0, y: 0 };
let yaw = 0, pitch = 0;
let playerVelocityY = 0;
const gravity = -0.015;
let isGrounded = true;

camera.position.set(0, 1.6, 0);

// Virtual Moving Joystick Logic
const joystickZone = document.getElementById('joystick-zone');
const joystickKnob = document.getElementById('joystick-knob');
let joystickActive = false;
const maxRadius = 35;

joystickZone.addEventListener('touchstart', (e) => { joystickActive = true; updateJoystick(e.touches[0]); });
joystickZone.addEventListener('touchmove', (e) => { if (joystickActive) updateJoystick(e.touches[0]); });
joystickZone.addEventListener('touchend', () => {
  joystickActive = false;
  joystickKnob.style.transform = `translate(0px, 0px)`;
  joystickVector = { x: 0, y: 0 };
});

function updateJoystick(touch) {
  const rect = joystickZone.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  let dx = touch.clientX - centerX;
  let dy = touch.clientY - centerY;
  const dist = Math.hypot(dx, dy);

  if (dist > maxRadius) {
    dx = (dx / dist) * maxRadius;
    dy = (dy / dist) * maxRadius;
  }

  joystickKnob.style.transform = `translate(${dx}px, ${dy}px)`;
  joystickVector = { x: dx / maxRadius, y: dy / maxRadius };
}

// Mouse / Swipe Camera Controls
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

// Mobile Swipe Camera Look
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

// Keyboard
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

// 5. Shooting Mechanics
const bullets = [];
const bulletGeo = new THREE.SphereGeometry(0.15, 8, 8);
const bulletMat = new THREE.MeshBasicMaterial({ color: 0xffff00 });

document.addEventListener('mousedown', (e) => {
  if (e.button === 0 && document.pointerLockElement === document.body) shootGun();
});

function shootGun() {
  if (isDead || currentCar) return;
  const bullet = new THREE.Mesh(bulletGeo, bulletMat);
  bullet.position.copy(camera.position);

  const dir = new THREE.Vector3();
  camera.getWorldDirection(dir);
  bullet.userData = { velocity: dir.multiplyScalar(1.5), life: 60 };
  
  scene.add(bullet);
  bullets.push(bullet);
}

function takeDamage(amount) {
  if (isDead) return;
  hp -= amount;
  if (hp <= 0) {
    hp = 0; isDead = true;
    if (document.exitPointerLock) document.exitPointerLock();
    document.getElementById('respawn-screen').style.display = 'flex';
  }
  document.getElementById('hp-text').innerText = hp;
  document.getElementById('health-bar').style.width = hp + '%';
}

document.getElementById('respawn-btn').addEventListener('click', () => {
  hp = 100; isDead = false;
  document.getElementById('hp-text').innerText = hp;
  document.getElementById('health-bar').style.width = '100%';
  document.getElementById('respawn-screen').style.display = 'none';
  camera.position.set(0, 1.6, 0);
});

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

// 6. Game Physics Loop
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

    const relativeCameraOffset = new THREE.Vector3(0, 4, 8);
    const cameraOffset = relativeCameraOffset.applyMatrix4(currentCar.mesh.matrixWorld);
    camera.position.copy(cameraOffset);
    camera.lookAt(currentCar.mesh.position);
  } else {
    // Analog + Keyboard Movement calculation
    const moveX = (moveRight ? 1 : 0) - (moveLeft ? 1 : 0) + joystickVector.x;
    const moveZ = (moveBackward ? 1 : 0) - (moveForward ? 1 : 0) + joystickVector.y;

    if (Math.abs(moveX) > 0.1 || Math.abs(moveZ) > 0.1) {
      const dir = new THREE.Vector3(moveX, 0, moveZ).normalize();
      dir.applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
      camera.position.addScaledVector(dir, 0.15);
    }

    // Gravity
    playerVelocityY += gravity;
    camera.position.y += playerVelocityY;
    if (camera.position.y <= 1.6) {
      camera.position.y = 1.6; playerVelocityY = 0; isGrounded = true;
    }
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

  if (currentRoomName) {
    socket.emit('playerMovement', { x: camera.position.x, y: camera.position.y, z: camera.position.z });
  }
}

function animate() {
  requestAnimationFrame(animate);
  updateGame();
  renderer.render(scene, camera);
}
animate();
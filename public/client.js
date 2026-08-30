const socket = io();

// 1. Scene & Render Setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111122); // City night mode vibe
scene.fog = new THREE.FogExp2(0x111122, 0.015);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.getElementById('canvas-container').appendChild(renderer.domElement);

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
scene.add(ambientLight);
const dirLight = new THREE.DirectionalLight(0xffddee, 0.6);
dirLight.position.set(100, 100, 50);
scene.add(dirLight);

// Detect Mobile
const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
if (isMobile) {
  document.querySelectorAll('.mobile-btn').forEach(b => b.style.display = 'flex');
}

// 2. Procedural Endless City Generation
const CITY_SIZE = 12; // Grid scale
const BLOCK_SIZE = 30;
const cityGroup = new THREE.Group();
scene.add(cityGroup);

// Road Geometry
const roadGeo = new THREE.PlaneGeometry(BLOCK_SIZE, BLOCK_SIZE);
roadGeo.rotateX(-Math.PI / 2);
const roadMat = new THREE.MeshLambertMaterial({ color: 0x222225 });
const buildingMat = new THREE.MeshLambertMaterial({ color: 0x3a3a45 });
const windowMat = new THREE.MeshBasicMaterial({ color: 0xffffaa });

// Generate City Blocks & Roads
for (let x = -CITY_SIZE; x <= CITY_SIZE; x++) {
  for (let z = -CITY_SIZE; z <= CITY_SIZE; z++) {
    const posX = x * BLOCK_SIZE;
    const posZ = z * BLOCK_SIZE;

    if (x % 2 === 0 || z % 2 === 0) {
      // Road segment
      const road = new THREE.Mesh(roadGeo, roadMat);
      road.position.set(posX, 0, posZ);
      cityGroup.add(road);
    } else {
      // Skyscraper Block
      const bHeight = Math.floor(Math.random() * 40) + 15;
      const buildingGeo = new THREE.BoxGeometry(BLOCK_SIZE - 4, bHeight, BLOCK_SIZE - 4);
      const building = new THREE.Mesh(buildingGeo, buildingMat);
      building.position.set(posX, bHeight / 2, posZ);
      cityGroup.add(building);
    }
  }
}

// Ground Plane Base
const groundGeo = new THREE.PlaneGeometry(2000, 2000);
groundGeo.rotateX(-Math.PI / 2);
const groundMat = new THREE.MeshLambertMaterial({ color: 0x151515 });
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.position.y = -0.1;
scene.add(ground);

// 3. Spawning Drivable Cars
const cars = [];
function createCar(x, z) {
  const carGroup = new THREE.Group();
  
  // Body
  const bodyGeo = new THREE.BoxGeometry(2.2, 1.2, 4.5);
  const bodyMat = new THREE.MeshLambertMaterial({ color: 0xcc2222 });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.y = 0.8;
  carGroup.add(body);

  // Cabin
  const cabinGeo = new THREE.BoxGeometry(1.8, 0.9, 2.2);
  const cabinMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
  const cabin = new THREE.Mesh(cabinGeo, cabinMat);
  cabin.position.set(0, 1.7, -0.2);
  carGroup.add(cabin);

  // Wheels
  const wheelGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.4, 16);
  wheelGeo.rotateZ(Math.PI / 2);
  const wheelMat = new THREE.MeshBasicMaterial({ color: 0x000000 });

  const positions = [[-1.2, 0.4, 1.5], [1.2, 0.4, 1.5], [-1.2, 0.4, -1.5], [1.2, 0.4, -1.5]];
  positions.forEach(p => {
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.position.set(...p);
    carGroup.add(w);
  });

  carGroup.position.set(x, 0, z);
  scene.add(carGroup);
  cars.push({ mesh: carGroup, speed: 0, rotation: 0 });
}

// Spawn cars at key road intersections
createCar(0, 15);
createCar(30, -15);
createCar(-30, 45);

// 4. Player, State & Physics
let hp = 100;
let isDead = false;
let currentCar = null;

let moveForward = false, moveBackward = false, moveLeft = false, moveRight = false;
let yaw = 0, pitch = 0;
let playerVelocityY = 0;
const gravity = -0.015;
let isGrounded = true;

camera.position.set(0, 1.6, 0);

// Pointer lock for desktop controls
document.body.addEventListener('click', () => {
  if (!isMobile && !isDead) document.body.requestPointerLock();
});

document.addEventListener('mousemove', (e) => {
  if (document.pointerLockElement === document.body && !currentCar) {
    yaw -= e.movementX * 0.0025;
    pitch -= e.movementY * 0.0025;
    pitch = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, pitch));
    camera.rotation.order = "YXZ";
    camera.rotation.y = yaw;
    camera.rotation.x = pitch;
  }
});

// Touch look swipe support for mobile
let touchStartX = 0, touchStartY = 0;
document.addEventListener('touchstart', (e) => {
  if (e.touches.length > 0) {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  }
});

document.addEventListener('touchmove', (e) => {
  if (isMobile && !currentCar && e.touches.length > 0) {
    const deltaX = e.touches[0].clientX - touchStartX;
    const deltaY = e.touches[0].clientY - touchStartY;
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;

    yaw -= deltaX * 0.005;
    pitch -= deltaY * 0.005;
    pitch = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, pitch));
    camera.rotation.order = "YXZ";
    camera.rotation.y = yaw;
    camera.rotation.x = pitch;
  }
});

// Keyboard controls
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

// Mobile Action Buttons
document.getElementById('btn-jump').addEventListener('touchstart', () => {
  if (isGrounded && !currentCar) { playerVelocityY = 0.22; isGrounded = false; }
});
document.getElementById('btn-action').addEventListener('touchstart', toggleCarState);
document.getElementById('btn-shoot').addEventListener('touchstart', shootGun);

// 5. Shooting & Combat Mechanics
const bullets = [];
const bulletGeo = new THREE.SphereGeometry(0.15, 8, 8);
const bulletMat = new THREE.MeshBasicMaterial({ color: 0xffff00 });

document.addEventListener('mousedown', (e) => {
  if (e.button === 0 && document.pointerLockElement === document.body) {
    shootGun();
  }
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

  // Send shot event to multiplayer server
  socket.emit('playerShot', {
    origin: { x: camera.position.x, y: camera.position.y, z: camera.position.z },
    direction: { x: dir.x, y: dir.y, z: dir.z }
  });
}

function takeDamage(amount) {
  if (isDead) return;
  hp -= amount;
  if (hp <= 0) {
    hp = 0;
    isDead = true;
    if (document.exitPointerLock) document.exitPointerLock();
    document.getElementById('respawn-screen').style.display = 'flex';
  }
  document.getElementById('hp-text').innerText = hp;
  document.getElementById('health-bar').style.width = hp + '%';
}

document.getElementById('respawn-btn').addEventListener('click', () => {
  hp = 100;
  isDead = false;
  document.getElementById('hp-text').innerText = hp;
  document.getElementById('health-bar').style.width = '100%';
  document.getElementById('respawn-screen').style.display = 'none';
  camera.position.set(0, 1.6, 0);
});

// 6. Driving System
function toggleCarState() {
  if (currentCar) {
    // Exit Car
    camera.position.copy(currentCar.mesh.position).add(new THREE.Vector3(2, 1.6, 0));
    currentCar = null;
    document.getElementById('vehicle-prompt').style.display = 'none';
  } else {
    // Check nearest car
    cars.forEach(car => {
      const dist = camera.position.distanceTo(car.mesh.position);
      if (dist < 4) {
        currentCar = car;
      }
    });
  }
}

// 7. Physics & Movement Engine Loop
function updateGame() {
  if (isDead) return;

  if (currentCar) {
    // Vehicle Physics & Driving Mode
    if (moveForward) currentCar.speed = Math.min(currentCar.speed + 0.02, 0.6);
    else if (moveBackward) currentCar.speed = Math.max(currentCar.speed - 0.02, -0.3);
    else currentCar.speed *= 0.95; // Friction

    if (moveLeft) currentCar.rotation += 0.03;
    if (moveRight) currentCar.rotation -= 0.03;

    currentCar.mesh.rotation.y = currentCar.rotation;
    currentCar.mesh.translateZ(-currentCar.speed);

    // Lock camera into third-person car perspective
    const relativeCameraOffset = new THREE.Vector3(0, 4, 8);
    const cameraOffset = relativeCameraOffset.applyMatrix4(currentCar.mesh.matrixWorld);
    camera.position.x = cameraOffset.x;
    camera.position.y = cameraOffset.y;
    camera.position.z = cameraOffset.z;
    camera.lookAt(currentCar.mesh.position);
  } else {
    // On-Foot Movement & Elevation Physics
    const dir = new THREE.Vector3();
    if (moveForward) dir.z -= 1;
    if (moveBackward) dir.z += 1;
    if (moveLeft) dir.x -= 1;
    if (moveRight) dir.x += 1;
    dir.normalize();
    dir.applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);

    if (moveForward || moveBackward || moveLeft || moveRight) {
      camera.position.addScaledVector(dir, 0.15);
    }

    // Ground & Gravity Detection
    playerVelocityY += gravity;
    camera.position.y += playerVelocityY;

    if (camera.position.y <= 1.6) {
      camera.position.y = 1.6;
      playerVelocityY = 0;
      isGrounded = true;
    }

    // Check distance for vehicle entry prompt
    let nearCar = false;
    cars.forEach(car => {
      if (camera.position.distanceTo(car.mesh.position) < 4) nearCar = true;
    });
    document.getElementById('vehicle-prompt').style.display = nearCar ? 'block' : 'none';
  }

  // Update Bullets
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    b.position.add(b.userData.velocity);
    b.userData.life--;
    if (b.userData.life <= 0) {
      scene.remove(b);
      bullets.splice(i, 1);
    }
  }

  // Network sync to backend
  socket.emit('playerMovement', {
    x: camera.position.x,
    y: camera.position.y,
    z: camera.position.z
  });
}

// 8. Multiplayer Event Listeners
socket.on('bulletFired', (data) => {
  // Check if foreign bullet hits local player (Hitbox distance < 1.5)
  const playerPos = camera.position;
  const bulletPos = new THREE.Vector3(data.origin.x, data.origin.y, data.origin.z);
  if (playerPos.distanceTo(bulletPos) < 2.0) {
    takeDamage(25); // Take 25 damage per hit
  }
});

// Render Loop
function animate() {
  requestAnimationFrame(animate);
  updateGame();
  renderer.render(scene, camera);
}
animate();
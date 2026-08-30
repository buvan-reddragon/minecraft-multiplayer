// client.js - Arcadia of knight

// --- 0. Socket & Chat Setup ---
const socket = io();
const chatInput = document.getElementById('chat-input');
const chatMessages = document.getElementById('chat-messages');

window.addEventListener('keydown', (e) => {
  if (e.code === 'Enter') {
    if (document.activeElement === chatInput) {
      const msg = chatInput.value.trim();
      if (msg) {
        socket.emit('chatMessage', { text: msg });
      }
      chatInput.value = '';
      chatInput.blur();
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

// --- 1. Scene & Sky Setup ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x130a24);
scene.fog = new THREE.FogExp2(0x231433, 0.0075);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
document.body.appendChild(renderer.domElement);

// --- 2. Evening Sun & Stars ---
const ambientLight = new THREE.AmbientLight(0x6b4c7a, 0.85);
scene.add(ambientLight);

const sunGeo = new THREE.SphereGeometry(16, 32, 32);
const sunMat = new THREE.MeshBasicMaterial({ color: 0xff7b25 });
const sunMesh = new THREE.Mesh(sunGeo, sunMat);
sunMesh.position.set(140, 45, -260);
scene.add(sunMesh);

const sunLight = new THREE.DirectionalLight(0xff9933, 2.2);
sunLight.position.set(140, 50, -260);
sunLight.castShadow = true;
sunLight.shadow.mapSize.width = 2048;
sunLight.shadow.mapSize.height = 2048;
scene.add(sunLight);

// Night Sky Stars
const starGeo = new THREE.BufferGeometry();
const starCount = 600;
const starPos = new Float32Array(starCount * 3);
for (let i = 0; i < starCount * 3; i += 3) {
  starPos[i] = (Math.random() - 0.5) * 600;
  starPos[i + 1] = Math.random() * 200 + 30;
  starPos[i + 2] = (Math.random() - 0.5) * 600;
}
starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.8, transparent: true, opacity: 0.8 });
scene.add(new THREE.Points(starGeo, starMat));

// --- 3. Giant Planet View (Jupiter Style) ---
function createJupiter() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0.0, '#3b1c0d');
  grad.addColorStop(0.2, '#b87747');
  grad.addColorStop(0.4, '#edd8b4');
  grad.addColorStop(0.6, '#964823');
  grad.addColorStop(0.8, '#c28d5d');
  grad.addColorStop(1.0, '#edd8b4');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 256);

  ctx.fillStyle = '#8a2b14';
  ctx.beginPath();
  ctx.ellipse(320, 150, 40, 22, 0, 0, Math.PI * 2);
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  const jupGeo = new THREE.SphereGeometry(60, 64, 64);
  const jupMat = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.8 });
  const jupiter = new THREE.Mesh(jupGeo, jupMat);
  jupiter.position.set(-180, 105, -280);
  jupiter.rotation.z = -0.3;
  scene.add(jupiter);
}
createJupiter();

// --- 4. Grass Floor ---
const groundGeo = new THREE.PlaneGeometry(500, 500);
const groundMat = new THREE.MeshStandardMaterial({ color: 0x1e3e18, roughness: 0.9 });
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// --- 5. Cherry Blossom Trees & Petals ---
function createCherryTree() {
  const group = new THREE.Group();
  const trunkGeo = new THREE.CylinderGeometry(0.35, 0.6, 4.5, 7);
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x2b180d, roughness: 0.9 });
  const trunk = new THREE.Mesh(trunkGeo, trunkMat);
  trunk.position.y = 2.25;
  trunk.castShadow = true;
  group.add(trunk);

  const pinkMats = [
    new THREE.MeshStandardMaterial({ color: 0xffa6c9, roughness: 0.8 }),
    new THREE.MeshStandardMaterial({ color: 0xff69b4, roughness: 0.8 }),
    new THREE.MeshStandardMaterial({ color: 0xffb7c5, roughness: 0.8 })
  ];

  for (let i = 0; i < 5; i++) {
    const crown = new THREE.Mesh(new THREE.DodecahedronGeometry(1.5, 1), pinkMats[i % 3]);
    const ang = (i / 5) * Math.PI * 2;
    crown.position.set(Math.cos(ang) * 0.8, 3.8 + Math.random(), Math.sin(ang) * 0.8);
    crown.castShadow = true;
    group.add(crown);
  }
  return group;
}

for (let i = 0; i < 85; i++) {
  const tree = createCherryTree();
  const rad = 15 + Math.random() * 180;
  const ang = Math.random() * Math.PI * 2;
  tree.position.set(Math.cos(ang) * rad, 0, Math.sin(ang) * rad);
  scene.add(tree);
}

// Falling Petals
const petalCount = 400;
const petalGeo = new THREE.BufferGeometry();
const petalPos = new Float32Array(petalCount * 3);
const petalVel = [];

for (let i = 0; i < petalCount; i++) {
  petalPos[i * 3] = (Math.random() - 0.5) * 250;
  petalPos[i * 3 + 1] = Math.random() * 25 + 1;
  petalPos[i * 3 + 2] = (Math.random() - 0.5) * 250;
  petalVel.push({ x: Math.random() * 0.04 + 0.02, y: -(Math.random() * 0.03 + 0.015), z: Math.random() * 0.02 - 0.01 });
}
petalGeo.setAttribute('position', new THREE.BufferAttribute(petalPos, 3));
const petalParticles = new THREE.Points(petalGeo, new THREE.PointsMaterial({ color: 0xffb7c5, size: 0.25, transparent: true, opacity: 0.85 }));
scene.add(petalParticles);

// --- 6. Name Tag Canvas Generator ---
function createNameTagCanvas(text) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
  ctx.fillRect(0, 0, 256, 64);
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 4;
  ctx.strokeRect(0, 0, 256, 64);
  ctx.font = 'Bold 24px sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.fillText(text, 128, 40);

  const texture = new THREE.CanvasTexture(canvas);
  const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true });
  const sprite = new THREE.Sprite(spriteMat);
  sprite.scale.set(2, 0.5, 1);
  sprite.position.y = 2.7;
  return sprite;
}

// --- 7. Roblox Knight Character Builder ---
function createKnightMesh(nameTagText) {
  const group = new THREE.Group();
  const armorMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.85, roughness: 0.25 });
  const goldMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.9, roughness: 0.2 });
  const clothMat = new THREE.MeshStandardMaterial({ color: 0x7c3aed, roughness: 0.7 });

  // Torso & Tabard
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.1, 0.5), armorMat);
  torso.position.y = 1.15;
  torso.castShadow = true;
  group.add(torso);

  const tabard = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.12, 0.52), clothMat);
  tabard.position.y = 1.15;
  group.add(tabard);

  // Helmet
  const helmet = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.55, 0.55), armorMat);
  helmet.position.y = 1.95;
  helmet.castShadow = true;
  group.add(helmet);

  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.12, 0.57), new THREE.MeshStandardMaterial({ color: 0x0f172a }));
  visor.position.set(0, 1.95, 0.01);
  group.add(visor);

  // Limbs
  const armLegGeo = new THREE.BoxGeometry(0.4, 1.0, 0.4);
  armLegGeo.translate(0, -0.5, 0);

  const leftLegPivot = new THREE.Group();
  leftLegPivot.position.set(-0.24, 0.9, 0);
  leftLegPivot.add(new THREE.Mesh(armLegGeo, armorMat));
  group.add(leftLegPivot);

  const rightLegPivot = new THREE.Group();
  rightLegPivot.position.set(0.24, 0.9, 0);
  rightLegPivot.add(new THREE.Mesh(armLegGeo, armorMat));
  group.add(rightLegPivot);

  const leftArmPivot = new THREE.Group();
  leftArmPivot.position.set(-0.65, 1.6, 0);
  leftArmPivot.add(new THREE.Mesh(armLegGeo, armorMat));
  group.add(leftArmPivot);

  const rightArmPivot = new THREE.Group();
  rightArmPivot.position.set(0.65, 1.6, 0);
  rightArmPivot.add(new THREE.Mesh(armLegGeo, armorMat));

  // Longsword
  const hilt = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.06, 0.08), goldMat);
  hilt.position.set(0, -0.8, 0.25);
  rightArmPivot.add(hilt);
  const blade = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.2, 0.03), new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.95 }));
  blade.position.set(0, -1.35, 0.25);
  rightArmPivot.add(blade);

  group.add(rightArmPivot);

  group.add(createNameTagCanvas(nameTagText || 'Knight'));

  group.userData = { leftLegPivot, rightLegPivot, leftArmPivot, rightArmPivot };
  return group;
}

const player = createKnightMesh('You (Knight)');
scene.add(player);

// --- 8. Sound Engine ---
let audioCtx = null;
function playMedievalSoundtrack() {
  if (audioCtx) return;
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  const notes = [220.00, 246.94, 261.63, 293.66, 329.63, 392.00];

  function playNote() {
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(notes[Math.floor(Math.random() * notes.length)], audioCtx.currentTime);

    gain.gain.setValueAtTime(0.001, audioCtx.currentTime);
    gain.gain.linearRampToValueAtTime(0.07, audioCtx.currentTime + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 1.2);

    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 1.25);

    setTimeout(playNote, [400, 600, 800, 1200][Math.floor(Math.random() * 4)]);
  }
  playNote();
}
window.addEventListener('keydown', playMedievalSoundtrack, { once: true });

// --- 9. Gameplay Animation Loop ---
const keys = {};
window.addEventListener('keydown', (e) => (keys[e.code] = true));
window.addEventListener('keyup', (e) => (keys[e.code] = false));

let moveTimer = 0;
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);

  let isMoving = false;
  const moveSpeed = 0.12;

  if (document.activeElement !== chatInput) {
    if (keys['KeyW'] || keys['ArrowUp']) { player.translateZ(-moveSpeed); isMoving = true; }
    if (keys['KeyS'] || keys['ArrowDown']) { player.translateZ(moveSpeed); isMoving = true; }
    if (keys['KeyA'] || keys['ArrowLeft']) { player.rotation.y += 0.04; }
    if (keys['KeyD'] || keys['ArrowRight']) { player.rotation.y -= 0.04; }
  }

  if (isMoving) {
    moveTimer += 0.18;
    const swing = Math.sin(moveTimer) * 0.65;
    player.userData.leftLegPivot.rotation.x = swing;
    player.userData.rightLegPivot.rotation.x = -swing;
    player.userData.leftArmPivot.rotation.x = -swing * 0.8;
    player.userData.rightArmPivot.rotation.x = swing * 0.8;

    // Broadcast position to multiplayer server
    socket.emit('playerMovement', {
      x: player.position.x,
      y: player.position.y,
      z: player.position.z,
      rotation: player.rotation.y
    });
  } else {
    player.userData.leftLegPivot.rotation.x = 0;
    player.userData.rightLegPivot.rotation.x = 0;
    player.userData.leftArmPivot.rotation.x = 0;
    player.userData.rightArmPivot.rotation.x = 0;
  }

  // Camera Follow
  const camOffset = new THREE.Vector3(0, 4.5, 9).applyMatrix4(player.matrixWorld);
  camera.position.lerp(camOffset, 0.1);
  camera.lookAt(player.position.clone().add(new THREE.Vector3(0, 1.8, 0)));

  // Petal movement
  const posArr = petalParticles.geometry.attributes.position.array;
  for (let i = 0; i < petalCount; i++) {
    const v = petalVel[i];
    posArr[i * 3] += v.x;
    posArr[i * 3 + 1] += v.y;
    posArr[i * 3 + 2] += v.z;
    if (posArr[i * 3 + 1] <= 0) {
      posArr[i * 3 + 1] = 25;
      posArr[i * 3] = player.position.x + (Math.random() - 0.5) * 150;
      posArr[i * 3 + 2] = player.position.z + (Math.random() - 0.5) * 150;
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
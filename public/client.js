// client.js - Arcadia of knight (Magical Evening Forest & Roblox Medieval Knight)

// --- 1. Scene Setup & Evening Atmosphere ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a0f2e); // Deep purple evening sky
scene.fog = new THREE.FogExp2(0x2d1736, 0.008); // Mystic evening fog

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
document.body.appendChild(renderer.domElement);

// --- 2. Golden Evening Sun & Ambient Lighting ---
const ambientLight = new THREE.AmbientLight(0x6b4c7a, 0.9); // Gentle twilight ambient
scene.add(ambientLight);

// Sun Mesh visible in sky
const sunGeo = new THREE.SphereGeometry(18, 32, 32);
const sunMat = new THREE.MeshBasicMaterial({ color: 0xff8c31 });
const sunMesh = new THREE.Mesh(sunGeo, sunMat);
sunMesh.position.set(120, 45, -250);
scene.add(sunMesh);

// Evening Sun Directional Light
const sunLight = new THREE.DirectionalLight(0xffa243, 2.2);
sunLight.position.set(120, 50, -250);
sunLight.castShadow = true;
sunLight.shadow.mapSize.width = 2048;
sunLight.shadow.mapSize.height = 2048;
sunLight.shadow.camera.near = 0.5;
sunLight.shadow.camera.far = 400;
sunLight.shadow.camera.left = -100;
sunLight.shadow.camera.right = 100;
sunLight.shadow.camera.top = 100;
sunLight.shadow.camera.bottom = -100;
scene.add(sunLight);

// Hemisphere Light (sky warmth + grass reflection)
const hemiLight = new THREE.HemisphereLight(0xffaa55, 0x1c3a1e, 0.6);
scene.add(hemiLight);

// --- 3. Giant Jupiter Planet in Sky ---
function createJupiterPlanet() {
  const planetGroup = new THREE.Group();

  // Create canvas procedural texture for Jupiter stripes
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  const grad = ctx.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0.0, '#4a2511');
  grad.addColorStop(0.15, '#c88b56');
  grad.addColorStop(0.3, '#edd8b4');
  grad.addColorStop(0.45, '#a3572d');
  grad.addColorStop(0.6, '#d6a374');
  grad.addColorStop(0.75, '#5c2c15');
  grad.addColorStop(1.0, '#edd8b4');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 256);

  // Great Red Spot
  ctx.fillStyle = '#9e341b';
  ctx.beginPath();
  ctx.ellipse(320, 150, 45, 25, 0, 0, Math.PI * 2);
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  const planetGeo = new THREE.SphereGeometry(65, 64, 64);
  const planetMat = new THREE.MeshStandardMaterial({
    map: texture,
    roughness: 0.8,
    metalness: 0.1
  });

  const jupiterMesh = new THREE.Mesh(planetGeo, planetMat);
  planetGroup.add(jupiterMesh);

  // Soft glowing atmosphere rim
  const atmGeo = new THREE.SphereGeometry(66.5, 32, 32);
  const atmMat = new THREE.MeshBasicMaterial({
    color: 0xffd1a4,
    transparent: true,
    opacity: 0.15,
    side: THREE.BackSide
  });
  planetGroup.add(new THREE.Mesh(atmGeo, atmMat));

  planetGroup.position.set(-180, 110, -280);
  planetGroup.rotation.z = -0.3;
  scene.add(planetGroup);
}
createJupiterPlanet();

// --- 4. Medieval Grass Field Floor ---
const groundGeo = new THREE.PlaneGeometry(500, 500);
const groundMat = new THREE.MeshStandardMaterial({
  color: 0x224718, // Rich natural grass green
  roughness: 0.9,
  metalness: 0.1
});
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// --- 5. Cherry Blossom Trees & Forest Environment ---
function createCherryBlossomTree() {
  const treeGroup = new THREE.Group();

  // Dark Wood Trunk
  const trunkGeo = new THREE.CylinderGeometry(0.35, 0.65, 4.5, 7);
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x2e1a0e, roughness: 0.9 });
  const trunk = new THREE.Mesh(trunkGeo, trunkMat);
  trunk.position.y = 2.25;
  trunk.castShadow = true;
  trunk.receiveShadow = true;
  treeGroup.add(trunk);

  // Pink Canopy Layers
  const pinkMat1 = new THREE.MeshStandardMaterial({ color: 0xffa6c9, roughness: 0.8 });
  const pinkMat2 = new THREE.MeshStandardMaterial({ color: 0xff69b4, roughness: 0.8 });
  const pinkMat3 = new THREE.MeshStandardMaterial({ color: 0xffb7c5, roughness: 0.8 });

  const mats = [pinkMat1, pinkMat2, pinkMat3];

  for (let i = 0; i < 5; i++) {
    const radius = 1.4 + Math.random() * 0.9;
    const crownGeo = new THREE.DodecahedronGeometry(radius, 1);
    const crown = new THREE.Mesh(crownGeo, mats[i % mats.length]);
    const angle = (i / 5) * Math.PI * 2;
    const dist = 0.8 + Math.random() * 0.6;
    crown.position.set(Math.cos(angle) * dist, 3.8 + Math.random() * 1.2, Math.sin(angle) * dist);
    crown.castShadow = true;
    treeGroup.add(crown);
  }

  return treeGroup;
}

// Generate Cherry Forest
for (let i = 0; i < 90; i++) {
  const tree = createCherryBlossomTree();
  const rad = 15 + Math.random() * 180;
  const ang = Math.random() * Math.PI * 2;
  tree.position.set(Math.cos(ang) * rad, 0, Math.sin(ang) * rad);
  const s = 0.8 + Math.random() * 0.6;
  tree.scale.set(s, s, s);
  scene.add(tree);
}

// --- 6. Falling Pink Petals System ---
const petalCount = 450;
const petalGeo = new THREE.BufferGeometry();
const petalPos = new Float32Array(petalCount * 3);
const petalVel = [];

for (let i = 0; i < petalCount; i++) {
  petalPos[i * 3] = (Math.random() - 0.5) * 250;
  petalPos[i * 3 + 1] = Math.random() * 25 + 1;
  petalPos[i * 3 + 2] = (Math.random() - 0.5) * 250;

  petalVel.push({
    x: Math.random() * 0.04 + 0.02,
    y: -(Math.random() * 0.03 + 0.015),
    z: Math.random() * 0.02 - 0.01,
    rotSpeed: Math.random() * 0.05
  });
}

petalGeo.setAttribute('position', new THREE.BufferAttribute(petalPos, 3));
const petalMat = new THREE.PointsMaterial({
  color: 0xffb7c5,
  size: 0.25,
  transparent: true,
  opacity: 0.85
});
const petalParticles = new THREE.Points(petalGeo, petalMat);
scene.add(petalParticles);

// --- 7. Roblox-Style Medieval Knight Player Character ---
function createRobloxKnightMesh() {
  const knightGroup = new THREE.Group();

  // Materials
  const armorMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.85, roughness: 0.25 }); // Steel
  const goldTrimMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.9, roughness: 0.2 }); // Gold
  const clothMat = new THREE.MeshStandardMaterial({ color: 0x7c3aed, roughness: 0.7 }); // Royal Purple Tabard

  // Roblox Torso (Boxy)
  const torsoGeo = new THREE.BoxGeometry(0.9, 1.1, 0.5);
  const torso = new THREE.Mesh(torsoGeo, armorMat);
  torso.position.y = 1.15;
  torso.castShadow = true;
  knightGroup.add(torso);

  // Purple Knight Tabard / Chestplate Trim
  const tabardGeo = new THREE.BoxGeometry(0.6, 1.12, 0.52);
  const tabard = new THREE.Mesh(tabardGeo, clothMat);
  tabard.position.y = 1.15;
  knightGroup.add(tabard);

  // Roblox Head & Knight Helmet
  const headGeo = new THREE.BoxGeometry(0.55, 0.55, 0.55);
  const helmet = new THREE.Mesh(headGeo, armorMat);
  helmet.position.y = 1.95;
  helmet.castShadow = true;
  knightGroup.add(helmet);

  // Helmet Visor Slot & Gold Crest
  const visorGeo = new THREE.BoxGeometry(0.45, 0.12, 0.57);
  const visorMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.1 });
  const visor = new THREE.Mesh(visorGeo, visorMat);
  visor.position.set(0, 1.95, 0.01);
  knightGroup.add(visor);

  const crestGeo = new THREE.BoxGeometry(0.08, 0.35, 0.4);
  const crest = new THREE.Mesh(crestGeo, goldTrimMat);
  crest.position.set(0, 2.3, -0.05);
  knightGroup.add(crest);

  // Shoulder Pauldrons
  const shoulderGeo = new THREE.BoxGeometry(0.35, 0.35, 0.45);
  const shoulderL = new THREE.Mesh(shoulderGeo, goldTrimMat);
  shoulderL.position.set(-0.62, 1.6, 0);
  knightGroup.add(shoulderL);

  const shoulderR = new THREE.Mesh(shoulderGeo, goldTrimMat);
  shoulderR.position.set(0.62, 1.6, 0);
  knightGroup.add(shoulderR);

  // Roblox Arms & Legs Pivots
  const armLegGeo = new THREE.BoxGeometry(0.4, 1.0, 0.4);
  armLegGeo.translate(0, -0.5, 0);

  // Left Arm
  const leftArmPivot = new THREE.Group();
  leftArmPivot.position.set(-0.65, 1.6, 0);
  const leftArmMesh = new THREE.Mesh(armLegGeo, armorMat);
  leftArmMesh.castShadow = true;
  leftArmPivot.add(leftArmMesh);
  knightGroup.add(leftArmPivot);

  // Right Arm (Holding Sword)
  const rightArmPivot = new THREE.Group();
  rightArmPivot.position.set(0.65, 1.6, 0);
  const rightArmMesh = new THREE.Mesh(armLegGeo, armorMat);
  rightArmMesh.castShadow = true;
  rightArmPivot.add(rightArmMesh);

  // Knight Longsword
  const hiltGeo = new THREE.BoxGeometry(0.3, 0.06, 0.08);
  const hilt = new THREE.Mesh(hiltGeo, goldTrimMat);
  hilt.position.set(0, -0.8, 0.25);
  rightArmPivot.add(hilt);

  const bladeGeo = new THREE.BoxGeometry(0.08, 1.2, 0.03);
  const bladeMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.95, roughness: 0.1 });
  const blade = new THREE.Mesh(bladeGeo, bladeMat);
  blade.position.set(0, -1.35, 0.25);
  rightArmPivot.add(blade);

  knightGroup.add(rightArmPivot);

  // Left Leg
  const leftLegPivot = new THREE.Group();
  leftLegPivot.position.set(-0.24, 0.9, 0);
  const leftLegMesh = new THREE.Mesh(armLegGeo, armorMat);
  leftLegMesh.castShadow = true;
  leftLegPivot.add(leftLegMesh);
  knightGroup.add(leftLegPivot);

  // Right Leg
  const rightLegPivot = new THREE.Group();
  rightLegPivot.position.set(0.24, 0.9, 0);
  const rightLegMesh = new THREE.Mesh(armLegGeo, armorMat);
  rightLegMesh.castShadow = true;
  rightLegPivot.add(rightLegMesh);
  knightGroup.add(rightLegPivot);

  knightGroup.userData = { leftArmPivot, rightArmPivot, leftLegPivot, rightLegPivot };
  return knightGroup;
}

const player = createRobloxKnightMesh();
scene.add(player);

// --- 8. Roblox Medieval Knight NPCs ---
const npcs = [];
function spawnKnightNPC(name, colorHex) {
  const npc = createRobloxKnightMesh();
  const mat = new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.5 });
  
  // Custom Colored Cape for NPC
  const capeGeo = new THREE.BoxGeometry(0.8, 1.1, 0.05);
  const cape = new THREE.Mesh(capeGeo, mat);
  cape.position.set(0, 1.1, -0.28);
  npc.add(cape);

  const rx = (Math.random() - 0.5) * 120;
  const rz = (Math.random() - 0.5) * 120;
  npc.position.set(rx, 0, rz);
  scene.add(npc);

  npcs.push({
    mesh: npc,
    dir: Math.random() * Math.PI * 2,
    speed: 0.035,
    timer: 0
  });
}

const knightVariants = [
  { name: 'Sir Galahad', color: 0xef4444 },
  { name: 'Sir Lancelot', color: 0x3b82f6 },
  { name: 'Paladin Arthur', color: 0x10b981 },
  { name: 'Knight Gawain', color: 0xf59e0b }
];

for (let i = 0; i < 16; i++) {
  const v = knightVariants[i % knightVariants.length];
  spawnKnightNPC(v.name, v.color);
}

// --- 9. Feel-Good Medieval Background Music (Synthesized Web Audio) ---
let audioCtx = null;
function playMedievalSoundtrack() {
  if (audioCtx) return;
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();

  const notes = [220.00, 246.94, 261.63, 293.66, 329.63, 349.23, 392.00, 440.00]; // Medieval A-minor Pentatonic scale
  let noteIdx = 0;

  function playNote() {
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    // Pleasant Lute/Harpsichord Warm Synth Tone
    osc.type = 'triangle';
    const freq = notes[Math.floor(Math.random() * notes.length)];
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);

    gain.gain.setValueAtTime(0.001, audioCtx.currentTime);
    gain.gain.linearRampToValueAtTime(0.08, audioCtx.currentTime + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 1.2);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start();
    osc.stop(audioCtx.currentTime + 1.25);

    const nextDelay = [400, 600, 800, 1200][Math.floor(Math.random() * 4)];
    setTimeout(playNote, nextDelay);
  }

  playNote();
}

// Start sound on first key or mouse action (Browser Autoplay Requirement)
window.addEventListener('keydown', playMedievalSoundtrack, { once: true });
window.addEventListener('click', playMedievalSoundtrack, { once: true });

// --- 10. Controls & Gameplay Loop ---
const keys = {};
window.addEventListener('keydown', (e) => (keys[e.code] = true));
window.addEventListener('keyup', (e) => (keys[e.code] = false));

let moveTimer = 0;
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();

  // Player Movement & Knight Animation
  let isMoving = false;
  const moveSpeed = 0.12;

  if (keys['KeyW'] || keys['ArrowUp']) {
    player.translateZ(-moveSpeed);
    isMoving = true;
  }
  if (keys['KeyS'] || keys['ArrowDown']) {
    player.translateZ(moveSpeed);
    isMoving = true;
  }
  if (keys['KeyA'] || keys['ArrowLeft']) {
    player.rotation.y += 0.04;
  }
  if (keys['KeyD'] || keys['ArrowRight']) {
    player.rotation.y -= 0.04;
  }

  // Roblox Knight Walk Swing Animation
  if (isMoving) {
    moveTimer += 0.18;
    const swing = Math.sin(moveTimer) * 0.65;
    player.userData.leftLegPivot.rotation.x = swing;
    player.userData.rightLegPivot.rotation.x = -swing;
    player.userData.leftArmPivot.rotation.x = -swing * 0.8;
    player.userData.rightArmPivot.rotation.x = swing * 0.8;
  } else {
    player.userData.leftLegPivot.rotation.x = 0;
    player.userData.rightLegPivot.rotation.x = 0;
    player.userData.leftArmPivot.rotation.x = 0;
    player.userData.rightArmPivot.rotation.x = 0;
  }

  // Smooth Third-Person Camera Tracking
  const camOffset = new THREE.Vector3(0, 4.5, 9).applyMatrix4(player.matrixWorld);
  camera.position.lerp(camOffset, 0.1);
  const lookTarget = player.position.clone().add(new THREE.Vector3(0, 1.8, 0));
  camera.lookAt(lookTarget);

  // Update Falling Pink Cherry Blossom Petals
  const posArr = petalParticles.geometry.attributes.position.array;
  for (let i = 0; i < petalCount; i++) {
    const v = petalVel[i];
    posArr[i * 3] += v.x;
    posArr[i * 3 + 1] += v.y;
    posArr[i * 3 + 2] += v.z;

    // Reset loop when petals touch grass
    if (posArr[i * 3 + 1] <= 0) {
      posArr[i * 3 + 1] = 25;
      posArr[i * 3] = player.position.x + (Math.random() - 0.5) * 150;
      posArr[i * 3 + 2] = player.position.z + (Math.random() - 0.5) * 150;
    }
  }
  petalParticles.geometry.attributes.position.needsUpdate = true;

  // Animate NPC Knights
  npcs.forEach((npcObj) => {
    npcObj.timer += 0.02;
    npcObj.mesh.translateZ(-npcObj.speed);

    const swing = Math.sin(npcObj.timer * 8) * 0.5;
    npcObj.mesh.userData.leftLegPivot.rotation.x = swing;
    npcObj.mesh.userData.rightLegPivot.rotation.x = -swing;

    if (Math.random() < 0.01) {
      npcObj.mesh.rotation.y += (Math.random() - 0.5) * 1.5;
    }
  });

  renderer.render(scene, camera);
}

// Window Resize Handling
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Update Document Title
document.title = "Arcadia of knight";

animate();
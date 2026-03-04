import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

/* ─────────────────────────────────────────────────────────
   CONFIG
───────────────────────────────────────────────────────── */
const isMobileDevice = window.innerWidth < 768;

const CONFIG = {
  particleCount:  isMobileDevice ? 40000 : 80000,
  auraCount:      isMobileDevice ? 6000  : 12000,
  ringCount:      isMobileDevice ? 1200  : 2400,
  explosionForce: 3.5,
  formationSpeed: 0.025,
  repulseRadius:  18,
  repulseStrength: 0.18,
  colors: {
    inner: new THREE.Color(0x00eaff),
    core:  new THREE.Color(0xff0055),
    outer: new THREE.Color(0xffaa00),
    aura:  new THREE.Color(0xaa00ff),
    ring:  new THREE.Color(0x00eaff),
  }
};

let DISPLAY_TEXT = '';

/* ─────────────────────────────────────────────────────────
   DIALOG LOGIC
───────────────────────────────────────────────────────── */
const overlay    = document.getElementById('dialog-overlay');
const input      = document.getElementById('text-input');
const charCount  = document.getElementById('char-count');
const launchBtn  = document.getElementById('launch-btn');
const changeBtn  = document.getElementById('change-btn');
const hint       = document.getElementById('hint');
const MAX_CHARS  = 12;

input.addEventListener('input', () => {
  const len = input.value.length;
  charCount.textContent = len;
  const counter = charCount.parentElement;
  counter.className = 'char-counter' + (len >= MAX_CHARS ? ' over' : len >= MAX_CHARS * 0.75 ? ' warn' : '');
});

input.addEventListener('keydown', e => {
  if (e.key === 'Enter') tryLaunch();
});

launchBtn.addEventListener('click', tryLaunch);
changeBtn.addEventListener('click', () => {
  // show dialog again
  overlay.classList.remove('hide');
  overlay.style.display = 'flex';
  setTimeout(() => {
    overlay.style.opacity = '';
  }, 10);
  input.value = DISPLAY_TEXT;
  charCount.textContent = DISPLAY_TEXT.length;
  changeBtn.classList.remove('visible');
  hint.classList.remove('visible');
  input.focus();
});

function tryLaunch() {
  const val = input.value.trim();
  if (!val) {
    input.classList.add('shake');
    input.placeholder = 'Please enter some text!';
    setTimeout(() => { input.classList.remove('shake'); input.placeholder = 'e.g.  HELLO'; }, 600);
    return;
  }
  DISPLAY_TEXT = val.toUpperCase();
  overlay.classList.add('hide');
  setTimeout(() => {
    overlay.style.display = 'none';
    setTimeout(() => {
      hint.classList.add('visible');
      setTimeout(() => {
        hint.classList.remove('visible');
        changeBtn.classList.add('visible');
      }, 3500);
    }, 800);
  }, 700);

  buildScene();
}

/* ─────────────────────────────────────────────────────────
   THREE.JS SETUP
───────────────────────────────────────────────────────── */
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x010103, 0.005);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 0, isMobileDevice ? 120 : 80);

const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ReinhardToneMapping;
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.enablePan = false;
controls.maxDistance = 200;

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));

const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85
);
bloomPass.threshold = 0;
bloomPass.strength  = 1.4;
bloomPass.radius    = 0.8;
composer.addPass(bloomPass);

/* ─────────────────────────────────────────────────────────
   TEXTURES
───────────────────────────────────────────────────────── */
function getGasTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 32;
  const ctx = canvas.getContext('2d');
  const g = ctx.createRadialGradient(16,16,0, 16,16,16);
  g.addColorStop(0,   'rgba(255,255,255,1)');
  g.addColorStop(0.2, 'rgba(255,255,255,0.8)');
  g.addColorStop(0.5, 'rgba(255,255,255,0.1)');
  g.addColorStop(1,   'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0,0,32,32);
  const tex = new THREE.Texture(canvas);
  tex.needsUpdate = true;
  return tex;
}
const particleTexture = getGasTexture();

/* ─────────────────────────────────────────────────────────
   TEXT → POINTS
───────────────────────────────────────────────────────── */
function getTextPoints(text, numPoints) {
  const canvas = document.createElement('canvas');
  const size = 1024;
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const fontSize = isMobileDevice ? 100 : 140;

  ctx.fillStyle = 'black';
  ctx.fillRect(0,0,size,size);
  ctx.fillStyle = 'white';
  ctx.font = `bold ${fontSize}px Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.letterSpacing = '5px';
  ctx.fillText(text, size/2, size/2);

  const pixels = ctx.getImageData(0,0,size,size).data;
  const points = [];
  for (let y=0; y<size; y+=2)
    for (let x=0; x<size; x+=2)
      if (pixels[(y*size+x)*4] > 200)
        points.push({ x: (x-size/2)/6, y: -(y-size/2)/6 });

  const sampled = [];
  if (points.length > 0)
    for (let i=0; i<numPoints; i++)
      sampled.push(points[Math.floor(Math.random()*points.length)]);
  return sampled;
}

/* ─────────────────────────────────────────────────────────
   PARTICLE SYSTEM FACTORY
───────────────────────────────────────────────────────── */
function createParticleSystem(count, size, opacity, isAura) {
  const geo  = new THREE.BufferGeometry();
  const pos  = new Float32Array(count * 3);
  const tgt  = new Float32Array(count * 3);
  const col  = new Float32Array(count * 3);
  const vel  = new Float32Array(count * 3);
  const tpts = getTextPoints(DISPLAY_TEXT, count);

  for (let i=0; i<count; i++) {
    const i3 = i*3;
    const p  = tpts[i % tpts.length];
    const spread = isAura ? 3.0 : 0.8;
    const nx = (Math.random()-.5)*spread;
    const ny = (Math.random()-.5)*spread;
    const nz = (Math.random()-.5)*(isAura?10:3);

    tgt[i3]   = p.x+nx;
    tgt[i3+1] = p.y+ny;
    tgt[i3+2] = nz;

    pos[i3]   = (Math.random()-.5)*300;
    pos[i3+1] = (Math.random()-.5)*300;
    pos[i3+2] = (Math.random()-.5)*300;

    const c = new THREE.Color();
    if (isAura) {
      c.copy(CONFIG.colors.aura).lerp(CONFIG.colors.inner, Math.random()*.5);
    } else {
      const d = Math.sqrt(tgt[i3]**2 + tgt[i3+1]**2);
      if (d<15)       c.copy(CONFIG.colors.inner).lerp(CONFIG.colors.core, Math.random());
      else if (d>40)  c.copy(CONFIG.colors.outer);
      else            { c.copy(CONFIG.colors.core); c.multiplyScalar(.8+Math.random()*.4); }
    }
    col[i3]=c.r; col[i3+1]=c.g; col[i3+2]=c.b;
  }

  geo.setAttribute('position', new THREE.BufferAttribute(pos,3));
  geo.setAttribute('target',   new THREE.BufferAttribute(tgt,3));
  geo.setAttribute('color',    new THREE.BufferAttribute(col,3));
  geo.setAttribute('velocity', new THREE.BufferAttribute(vel,3));

  const mat = new THREE.PointsMaterial({
    size, map: particleTexture,
    vertexColors: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false, transparent: true, opacity
  });

  return { mesh: new THREE.Points(geo, mat), geometry: geo, material: mat };
}

/* ─────────────────────────────────────────────────────────
   AMBIENT RING (always visible)
───────────────────────────────────────────────────────── */
function createRing(count) {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);

  const c0 = CONFIG.colors.ring;
  const c1 = CONFIG.colors.aura;

  for (let i=0; i<count; i++) {
    const i3 = i*3;
    const angle  = (i/count)*Math.PI*2;
    const radius = 72 + (Math.random()-.5)*14;
    const tilt   = (Math.random()-.5)*4;
    pos[i3]   = Math.cos(angle)*radius;
    pos[i3+1] = tilt;
    pos[i3+2] = Math.sin(angle)*radius;
    const c = new THREE.Color().copy(c0).lerp(c1, Math.random());
    col[i3]=c.r; col[i3+1]=c.g; col[i3+2]=c.b;
  }

  geo.setAttribute('position', new THREE.BufferAttribute(pos,3));
  geo.setAttribute('color',    new THREE.BufferAttribute(col,3));

  const mat = new THREE.PointsMaterial({
    size: 0.6, map: particleTexture,
    vertexColors: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false, transparent: true, opacity: 0.5
  });

  return new THREE.Points(geo, mat);
}

/* ─────────────────────────────────────────────────────────
   BACKGROUND STARS
───────────────────────────────────────────────────────── */
function createBackground() {
  const geo = new THREE.BufferGeometry();
  const pos = [];
  for (let i=0; i<2000; i++)
    pos.push((Math.random()-.5)*400,(Math.random()-.5)*400,(Math.random()-.5)*400);
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos,3));
  const mat = new THREE.PointsMaterial({ color:0x8888aa, size:0.5, transparent:true, opacity:0.5 });
  scene.add(new THREE.Points(geo,mat));
}
createBackground();

/* ─────────────────────────────────────────────────────────
   SHOOTING STARS
───────────────────────────────────────────────────────── */
const shootingStars = [];

function spawnShootingStar() {
  const geo = new THREE.BufferGeometry();
  const count = 30;
  const pos  = new Float32Array(count*3);
  const origin = new THREE.Vector3(
    (Math.random()-.5)*200,
    (Math.random()-.5)*100,
    (Math.random()-.5)*200
  );
  for (let i=0; i<count; i++) {
    pos[i*3]   = origin.x;
    pos[i*3+1] = origin.y;
    pos[i*3+2] = origin.z;
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos,3));
  const mat = new THREE.PointsMaterial({
    size: 0.8, color: 0x00eaff,
    blending: THREE.AdditiveBlending,
    depthWrite: false, transparent: true, opacity: 0.9
  });
  const mesh = new THREE.Points(geo, mat);
  scene.add(mesh);

  const dir = new THREE.Vector3(
    (Math.random()-.5)*3,
    (Math.random()-.5)*1.5,
    (Math.random()-.5)*3
  ).normalize();

  shootingStars.push({ mesh, geo, origin: origin.clone(), dir, speed: 2.5+Math.random()*2, life: 0, maxLife: 40+Math.random()*20 });
}

function updateShootingStars() {
  for (let k = shootingStars.length-1; k>=0; k--) {
    const s = shootingStars[k];
    s.life++;
    const count = 30;
    const pos = s.geo.attributes.position.array;
    for (let i=0; i<count; i++) {
      const t   = 1 - i/count;
      const age = s.life - i*0.8;
      if (age < 0) continue;
      pos[i*3]   = s.origin.x + s.dir.x * s.speed * age;
      pos[i*3+1] = s.origin.y + s.dir.y * s.speed * age;
      pos[i*3+2] = s.origin.z + s.dir.z * s.speed * age;
    }
    s.geo.attributes.position.needsUpdate = true;
    s.mesh.material.opacity = Math.max(0, 1 - s.life/s.maxLife);
    if (s.life >= s.maxLife) {
      scene.remove(s.mesh);
      s.geo.dispose();
      s.mesh.material.dispose();
      shootingStars.splice(k,1);
    }
  }
}

/* ─────────────────────────────────────────────────────────
   MOUSE REPULSION
───────────────────────────────────────────────────────── */
const mouse3D = new THREE.Vector3();
const raycaster = new THREE.Raycaster();
const mouseNDC  = new THREE.Vector2(9999, 9999);

window.addEventListener('mousemove', e => {
  mouseNDC.set(
    (e.clientX / window.innerWidth)*2 - 1,
    -(e.clientY / window.innerHeight)*2 + 1
  );
  // project to z=0 plane
  raycaster.setFromCamera(mouseNDC, camera);
  const plane = new THREE.Plane(new THREE.Vector3(0,0,1), 0);
  raycaster.ray.intersectPlane(plane, mouse3D);
});

/* ─────────────────────────────────────────────────────────
   SCENE OBJECTS (rebuilt on each launch)
───────────────────────────────────────────────────────── */
let mainText = null;
let auraText = null;
let ring     = null;

function clearScene() {
  if (mainText) { scene.remove(mainText.mesh); mainText.geometry.dispose(); mainText.material.dispose(); }
  if (auraText) { scene.remove(auraText.mesh); auraText.geometry.dispose(); auraText.material.dispose(); }
  if (ring)     { scene.remove(ring); ring.geometry.dispose(); ring.material.dispose(); }
}

function buildScene() {
  clearScene();

  mainText = createParticleSystem(CONFIG.particleCount, 0.4, 0.9, false);
  scene.add(mainText.mesh);

  auraText = createParticleSystem(CONFIG.auraCount, 1.2, 0.3, true);
  scene.add(auraText.mesh);

  ring = createRing(CONFIG.ringCount);
  scene.add(ring);
}

/* ─────────────────────────────────────────────────────────
   EXPLOSION
───────────────────────────────────────────────────────── */
renderer.domElement.addEventListener('pointerdown', () => {
  if (!mainText) return;
  explode(mainText.geometry);
  explode(auraText.geometry);
  spawnShootingStar();
  spawnShootingStar();
});

function explode(geo) {
  const pos = geo.attributes.position.array;
  const vel = geo.attributes.velocity.array;
  for (let i=0; i<pos.length/3; i++) {
    const i3 = i*3;
    const len = Math.sqrt(pos[i3]**2 + pos[i3+1]**2 + pos[i3+2]**2) || 1;
    const f   = Math.random()*CONFIG.explosionForce + 1.0;
    vel[i3]  += (pos[i3]/len)*f;
    vel[i3+1]+= (pos[i3+1]/len)*f;
    vel[i3+2]+= (pos[i3+2]/len)*f;
  }
}

/* ─────────────────────────────────────────────────────────
   ANIMATION
───────────────────────────────────────────────────────── */
const clock = new THREE.Clock();

function animateSystem(system, time) {
  const pos  = system.geometry.attributes.position.array;
  const tgt  = system.geometry.attributes.target.array;
  const vel  = system.geometry.attributes.velocity.array;
  const R2   = CONFIG.repulseRadius * CONFIG.repulseRadius;

  for (let i=0; i<pos.length/3; i++) {
    const i3 = i*3;

    // velocity integration
    pos[i3]  += vel[i3];
    pos[i3+1]+= vel[i3+1];
    pos[i3+2]+= vel[i3+2];

    // damping
    vel[i3]  *= 0.94;
    vel[i3+1]*= 0.94;
    vel[i3+2]*= 0.94;

    const breath = Math.sin(time*1.5 + tgt[i3]*0.1)*0.5;

    // formation pull
    if (Math.abs(vel[i3]) < 0.1) {
      pos[i3]  += (tgt[i3]   - pos[i3])  * CONFIG.formationSpeed;
      pos[i3+1]+= (tgt[i3+1] - pos[i3+1])* CONFIG.formationSpeed;
      pos[i3+2]+= ((tgt[i3+2]+breath) - pos[i3+2])* CONFIG.formationSpeed;
    }

    // cursor repulsion (only near z≈0 plane)
    const dx = pos[i3]   - mouse3D.x;
    const dy = pos[i3+1] - mouse3D.y;
    const d2 = dx*dx + dy*dy;
    if (d2 < R2 && d2 > 0.001) {
      const inv = CONFIG.repulseStrength / Math.sqrt(d2);
      vel[i3]  += dx * inv;
      vel[i3+1]+= dy * inv;
    }
  }

  system.geometry.attributes.position.needsUpdate = true;
  system.mesh.rotation.y = Math.sin(time*0.2)*0.15;
}

function animateRing(time) {
  if (!ring) return;
  ring.rotation.y = time * 0.06;
  ring.rotation.x = Math.sin(time * 0.04) * 0.06;
  ring.material.opacity = 0.35 + Math.sin(time*1.2)*0.12;
}

// periodic shooting stars
let nextStar = 5;

function animate() {
  requestAnimationFrame(animate);
  const time = clock.getElapsedTime();

  if (mainText) { animateSystem(mainText, time); animateSystem(auraText, time); }
  animateRing(time);
  updateShootingStars();

  if (mainText && time > nextStar) {
    spawnShootingStar();
    nextStar = time + 4 + Math.random()*5;
  }

  controls.update();
  composer.render();
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
});

// Auto-focus input when dialog loads
input.focus();

animate();

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

const DISPLAY_TEXT = "BOUCHRA";

const isMobileDevice = window.innerWidth < 768;

const CONFIG = {
  particleCount: isMobileDevice ? 40000 : 80000,
  auraCount: isMobileDevice ? 6000 : 12000,
  explosionForce: 3.5,
  formationSpeed: 0.025,
  colors: {
    inner: new THREE.Color(0x00eaff),
    core: new THREE.Color(0xff0055),
    outer: new THREE.Color(0xffaa00),
    aura: new THREE.Color(0xaa00ff)
  }
};

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x010103, 0.005);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
const isMobile = window.innerWidth < 768;
camera.position.set(0, 0, isMobile ? 120 : 80);

const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: "high-performance" });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ReinhardToneMapping;
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.enablePan = false;
controls.maxDistance = 150;

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));

const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85);
bloomPass.threshold = 0;
bloomPass.strength = 1.4;
bloomPass.radius = 0.8;
composer.addPass(bloomPass);

function getGasTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 32;
  canvas.height = 32;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
  grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
  grad.addColorStop(0.2, 'rgba(255, 255, 255, 0.8)');
  grad.addColorStop(0.5, 'rgba(255, 255, 255, 0.1)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 32, 32);
  const texture = new THREE.Texture(canvas);
  texture.needsUpdate = true;
  return texture;
}
const particleTexture = getGasTexture();

function getTextPoints(text, numPoints) {
  const canvas = document.createElement('canvas');
  const size = 1024;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  
  const isMobile = window.innerWidth < 768;
  const fontSize = isMobile ? 100 : 140;
  
  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = 'white';
  ctx.font = `bold ${fontSize}px Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.letterSpacing = '5px';
  ctx.fillText(text, size/2, size/2);
  
  const imageData = ctx.getImageData(0, 0, size, size);
  const pixels = imageData.data;
  
  const points = [];
  for(let y = 0; y < size; y += 2) {
    for(let x = 0; x < size; x += 2) {
      const i = (y * size + x) * 4;
      if(pixels[i] > 200) {
        const px = (x - size/2) / 6;
        const py = -(y - size/2) / 6;
        points.push({x: px, y: py});
      }
    }
  }
  
  const sampledPoints = [];
  if(points.length > 0) {
    for(let i = 0; i < numPoints; i++) {
      const p = points[Math.floor(Math.random() * points.length)];
      sampledPoints.push({x: p.x, y: p.y});
    }
  }
  
  return sampledPoints;
}

function createParticleSystem(count, size, opacity, isAura) {
  const geometry = new THREE.BufferGeometry();
  const posArray = new Float32Array(count * 3);
  const targetArray = new Float32Array(count * 3);
  const colArray = new Float32Array(count * 3);
  const velArray = new Float32Array(count * 3);

  const textPoints = getTextPoints(DISPLAY_TEXT, count);

  for (let i = 0; i < count; i++) {
    const i3 = i * 3;

    const p = textPoints[i % textPoints.length];

    let spread = isAura ? 3.0 : 0.8;
    let noiseX = (Math.random() - 0.5) * spread;
    let noiseY = (Math.random() - 0.5) * spread;
    let noiseZ = (Math.random() - 0.5) * (isAura ? 10 : 3);

    let tx = p.x + noiseX;
    let ty = p.y + noiseY;
    let tz = noiseZ;

    let c = new THREE.Color();
    
    if(isAura) {
      c.copy(CONFIG.colors.aura).lerp(CONFIG.colors.inner, Math.random()*0.5);
    } else {
      let dist = Math.sqrt(tx*tx + ty*ty);
      
      if (dist < 15) {
        c.copy(CONFIG.colors.inner).lerp(CONFIG.colors.core, Math.random());
      } else if (dist > 40) {
        c.copy(CONFIG.colors.outer);
      } else {
        c.copy(CONFIG.colors.core);
        c.multiplyScalar(0.8 + Math.random() * 0.4);
      }
    }

    targetArray[i3] = tx;
    targetArray[i3+1] = ty;
    targetArray[i3+2] = tz;

    posArray[i3] = (Math.random() - 0.5) * 300;
    posArray[i3+1] = (Math.random() - 0.5) * 300;
    posArray[i3+2] = (Math.random() - 0.5) * 300;

    colArray[i3] = c.r;
    colArray[i3+1] = c.g;
    colArray[i3+2] = c.b;

    velArray[i3] = 0;
    velArray[i3+1] = 0;
    velArray[i3+2] = 0;
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
  geometry.setAttribute('target', new THREE.BufferAttribute(targetArray, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colArray, 3));
  geometry.setAttribute('velocity', new THREE.BufferAttribute(velArray, 3));

  const material = new THREE.PointsMaterial({
    size: size,
    map: particleTexture,
    vertexColors: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    transparent: true,
    opacity: opacity
  });

  const mesh = new THREE.Points(geometry, material);
  return { mesh, geometry, material };
}

const mainText = createParticleSystem(CONFIG.particleCount, 0.4, 0.9, false);
scene.add(mainText.mesh);

const auraText = createParticleSystem(CONFIG.auraCount, 1.2, 0.3, true);
scene.add(auraText.mesh);

function createBackground() {
  const geo = new THREE.BufferGeometry();
  const pos = [];
  for(let i=0; i<2000; i++) {
    pos.push((Math.random()-0.5)*400, (Math.random()-0.5)*400, (Math.random()-0.5)*400);
  }
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({ color: 0x8888aa, size: 0.5, transparent: true, opacity: 0.5 });
  const stars = new THREE.Points(geo, mat);
  scene.add(stars);
}
createBackground();

window.addEventListener('pointerdown', (e) => {
  document.getElementById('ui').style.opacity = '0';
  explode(mainText.geometry);
  explode(auraText.geometry);
});

function explode(geo) {
  const pos = geo.attributes.position.array;
  const vel = geo.attributes.velocity.array;
  
  for(let i=0; i<pos.length/3; i++) {
    const i3 = i*3;
    const x = pos[i3];
    const y = pos[i3+1];
    const z = pos[i3+2];
    
    let len = Math.sqrt(x*x + y*y + z*z) || 1;
    
    const force = Math.random() * CONFIG.explosionForce + 1.0;
    vel[i3] += (x/len) * force;
    vel[i3+1] += (y/len) * force;
    vel[i3+2] += (z/len) * force;
  }
}

const clock = new THREE.Clock();
  
function animateSystem(system, time) {
  const positions = system.geometry.attributes.position.array;
  const targets = system.geometry.attributes.target.array;
  const velocities = system.geometry.attributes.velocity.array;

  for(let i=0; i < positions.length/3; i++) {
    const i3 = i*3;

    positions[i3]  += velocities[i3];
    positions[i3+1] += velocities[i3+1];
    positions[i3+2] += velocities[i3+2];

    velocities[i3]  *= 0.94;
    velocities[i3+1] *= 0.94;
    velocities[i3+2] *= 0.94;

    const tx = targets[i3];
    const ty = targets[i3+1];
    const tz = targets[i3+2];

    const breath = Math.sin(time * 1.5 + tx*0.1) * 0.5;

    if (Math.abs(velocities[i3]) < 0.1) {
      positions[i3]  += (tx - positions[i3]) * CONFIG.formationSpeed;
      positions[i3+1] += (ty - positions[i3+1]) * CONFIG.formationSpeed;
      positions[i3+2] += ((tz + breath) - positions[i3+2]) * CONFIG.formationSpeed;
    }
  }
  system.geometry.attributes.position.needsUpdate = true;
  
  system.mesh.rotation.y = Math.sin(time * 0.2) * 0.15;
}

function animate() {
  requestAnimationFrame(animate);
  
  const time = clock.getElapsedTime();
  
  animateSystem(mainText, time);
  animateSystem(auraText, time);

  controls.update();
  composer.render();
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
});

animate();

# Particles Animation

An interactive 3D particle system that forms any text you type, built with Three.js. Enter up to 12 characters and watch 80,000 particles fly in from deep space to spell out your text with a glowing bloom effect.

Live demo: https://amirtterk.github.io/Particles-animation/

## Features

- Custom text input: type any word or name (up to 12 characters) and the particles form it in 3D
- Click or tap to trigger an explosion, then watch the particles reform
- Mouse cursor repulsion: move your cursor through the particle cloud to push them around
- Orbit controls: click and drag to rotate the scene in 3D
- Ambient effects: rotating outer ring, background stars, and periodic shooting stars
- Bloom post-processing via UnrealBloomPass for a neon glow look
- Mobile responsive with reduced particle count for performance

## Tech Stack

- HTML5 / CSS3 / JavaScript (ES modules)
- Three.js r0.164.1 with OrbitControls, EffectComposer, and UnrealBloomPass

## How to Run

1. Clone or download the repository
2. Serve the files through a local server (the ES module import map requires one)

```bash
npx serve .
```

Then open the local URL in your browser. Opening `index.html` directly as a file will not work due to CORS restrictions on ES modules.

## Project Structure

- `index.html` - HTML structure, import map for Three.js, and the intro dialog UI
- `style.css` - Fullscreen layout, dialog styling, and UI animations
- `main.js` - Entire Three.js scene: particle system, text rendering, interactions, and animation loop

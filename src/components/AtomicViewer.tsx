import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { ElementData, CATEGORY_COLORS } from '../data/elements';
import { soundEngine } from '../utils/audio';
import { RotateCcw, Play, Pause, Eye, EyeOff, Layers, ZoomIn, ZoomOut, Compass } from 'lucide-react';

export type ModelMode = 'bohr' | 'orbitals' | 'cloud' | 'configuration';

interface AtomicViewerProps {
  element: ElementData;
  activeMode?: ModelMode;
  onModeChange?: (mode: ModelMode) => void;
}

// Module-level scratch vectors to prevent GC allocations in tick loop
const _scratchVec3 = new THREE.Vector3();
const _scratchMatrix = new THREE.Matrix4();

export const AtomicViewer: React.FC<AtomicViewerProps> = ({
  element,
  activeMode: controlledMode,
  onModeChange,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);

  // Visualization settings
  const [internalMode, setInternalMode] = useState<ModelMode>('bohr');
  const currentMode = controlledMode || internalMode;

  const [showNucleus, setShowNucleus] = useState<boolean>(true);
  const [showElectrons, setShowElectrons] = useState<boolean>(true);
  const [showOrbitals, setShowOrbitals] = useState<boolean>(true);
  const [showLabels, setShowLabels] = useState<boolean>(true);
  const [showSpins, setShowSpins] = useState<boolean>(true);
  const [animSpeed, setAnimSpeed] = useState<number>(1.0);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [autoRotate, setAutoRotate] = useState<boolean>(false);

  // References to mutable Three.js state
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const animFrameRef = useRef<number>(0);
  const rootGroupRef = useRef<THREE.Group | null>(null);
  const electronMeshesRef = useRef<{
    mesh: THREE.Mesh;
    spinArrow: THREE.ArrowHelper | null;
    shellRadius: number;
    angle: number;
    speed: number;
    inclination: number;
    azimuth: number;
    spinUp: boolean;
  }[]>([]);
  const orbitalMeshesRef = useRef<THREE.Object3D[]>([]);
  const nucleusGroupRef = useRef<THREE.Group | null>(null);
  const cloudPointsRef = useRef<THREE.Points | null>(null);

  const speedRef = useRef(animSpeed);
  speedRef.current = animSpeed;
  const isPausedRef = useRef(isPaused);
  isPausedRef.current = isPaused;

  const handleModeSelect = (mode: ModelMode) => {
    soundEngine.playOrbitalTransition();
    if (onModeChange) {
      onModeChange(mode);
    } else {
      setInternalMode(mode);
    }
  };

  const resetCamera = useCallback(() => {
    soundEngine.playClick(900);
    if (cameraRef.current && controlsRef.current) {
      cameraRef.current.position.set(0, 16, 32);
      controlsRef.current.target.set(0, 0, 0);
      controlsRef.current.update();
    }
  }, []);

  // Setup Three.js scene once on mount
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // Detect software WebGL
    const isSoftwareGl = (() => {
      try {
        const gl = document.createElement('canvas').getContext('webgl2');
        if (!gl) return true;
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
        const gpu = String(gl.getParameter(param));
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return true;
      }
    })();

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const width = container.clientWidth || 600;
    const height = container.clientHeight || 450;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 16, 32);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
      alpha: true,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    rendererRef.current = renderer;

    container.appendChild(renderer.domElement);

    // Studio Environment map via RoomEnvironment
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // Studio Lighting Rig
    const keyLight = new THREE.DirectionalLight(0xfff6ea, 2.5);
    keyLight.position.set(15, 25, 20);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x88ccff, 1.2);
    fillLight.position.set(-18, -10, -15);
    scene.add(fillLight);

    const hemiLight = new THREE.HemisphereLight(0x06b6d4, 0x0f172a, 1.0);
    scene.add(hemiLight);

    // Orbit Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 6;
    controls.maxDistance = 120;
    controlsRef.current = controls;

    // Root Group
    const rootGroup = new THREE.Group();
    scene.add(rootGroup);
    rootGroupRef.current = rootGroup;

    // Resize Observer
    const handleResize = () => {
      if (!container || !rendererRef.current || !cameraRef.current) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w === 0 || h === 0) return;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    // Render loop
    const clock = new THREE.Clock();

    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate);
      const delta = clock.getDelta();

      if (controlsRef.current) {
        controlsRef.current.update();
      }

      if (autoRotate && rootGroupRef.current) {
        rootGroupRef.current.rotation.y += delta * 0.25;
      }

      // Animate electrons along orbital planes
      if (!isPausedRef.current) {
        const speedMultiplier = speedRef.current;
        const time = clock.getElapsedTime() * speedMultiplier;

        electronMeshesRef.current.forEach((el, idx) => {
          el.angle += el.speed * delta * speedMultiplier * 1.8;

          // Compute 3D orbit position using spherical coordinates
          const r = el.shellRadius;
          const theta = el.angle;
          const phi = el.inclination;
          const az = el.azimuth;

          // Rotate point on circle into inclined plane
          const x0 = r * Math.cos(theta);
          const z0 = r * Math.sin(theta);

          // Apply inclination and azimuth tilt
          _scratchVec3.set(x0, 0, z0);
          _scratchMatrix.makeRotationAxis(
            new THREE.Vector3(Math.cos(az), 0, Math.sin(az)),
            phi
          );
          _scratchVec3.applyMatrix4(_scratchMatrix);

          el.mesh.position.copy(_scratchVec3);

          if (el.spinArrow) {
            el.spinArrow.position.copy(_scratchVec3);
          }
        });

        // Gentle orbital pulsation in quantum modes
        if (orbitalMeshesRef.current.length > 0) {
          const pulse = 1.0 + Math.sin(time * 2) * 0.03;
          orbitalMeshesRef.current.forEach((m) => {
            m.scale.set(pulse, pulse, pulse);
          });
        }

        // Nucleus subtle breathing vibration
        if (nucleusGroupRef.current) {
          const nucWobble = 1.0 + Math.sin(time * 3.5) * 0.015;
          nucleusGroupRef.current.scale.set(nucWobble, nucWobble, nucWobble);
        }

        // Electron cloud rotation
        if (cloudPointsRef.current) {
          cloudPointsRef.current.rotation.y += delta * 0.1 * speedMultiplier;
          cloudPointsRef.current.rotation.z += delta * 0.05 * speedMultiplier;
        }
      }

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      resizeObserver.disconnect();
      controls.dispose();
      renderer.dispose();
      if (renderer.domElement.parentElement === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Rebuild 3D Atomic Structure whenever element, mode, or component visibility changes
  useEffect(() => {
    const root = rootGroupRef.current;
    if (!root) return;

    // Clean up previous children
    while (root.children.length > 0) {
      const child = root.children[0];
      root.remove(child);
      if ((child as THREE.Mesh).geometry) {
        (child as THREE.Mesh).geometry.dispose();
      }
      if ((child as THREE.Mesh).material) {
        const mat = (child as THREE.Mesh).material;
        if (Array.isArray(mat)) {
          mat.forEach((m) => m.dispose());
        } else {
          mat.dispose();
        }
      }
    }

    electronMeshesRef.current = [];
    orbitalMeshesRef.current = [];
    nucleusGroupRef.current = null;
    cloudPointsRef.current = null;

    const { protons, neutrons, shells, symbol, name, category } = element;
    const catHex = CATEGORY_COLORS[category]?.hex || '#06b6d4';

    // 1. BUILD NUCLEUS (Protons in Red, Neutrons in Gray/White)
    if (showNucleus) {
      const nucGroup = new THREE.Group();
      nucleusGroupRef.current = nucGroup;

      const protonMat = new THREE.MeshPhysicalMaterial({
        color: 0xef4444, // Red
        emissive: 0x7f1d1d,
        emissiveIntensity: 0.35,
        roughness: 0.25,
        metalness: 0.2,
        clearcoat: 0.6,
      });

      const neutronMat = new THREE.MeshPhysicalMaterial({
        color: 0xd1d5db, // Slate Gray / White
        emissive: 0x374151,
        emissiveIntensity: 0.15,
        roughness: 0.4,
        metalness: 0.1,
        clearcoat: 0.4,
      });

      const nucleonGeo = new THREE.SphereGeometry(0.38, 16, 16);

      // Total nucleons to display (cap display count for superheavies to prevent visual crowding while showing full density)
      const maxNucleons = Math.min(protons + neutrons, 64);
      const protonCount = Math.round((protons / (protons + neutrons || 1)) * maxNucleons);
      const neutronCount = maxNucleons - protonCount;

      const nucleonParticles: { isProton: boolean }[] = [];
      for (let i = 0; i < protonCount; i++) nucleonParticles.push({ isProton: true });
      for (let i = 0; i < neutronCount; i++) nucleonParticles.push({ isProton: false });

      // Shuffle particles evenly
      for (let i = nucleonParticles.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [nucleonParticles[i], nucleonParticles[j]] = [nucleonParticles[j], nucleonParticles[i]];
      }

      // Golden spiral distribution on sphere packing
      const phi = (1 + Math.sqrt(5)) / 2;
      const nucleusRadius = Math.max(0.65, Math.pow(maxNucleons, 1 / 3) * 0.45);

      nucleonParticles.forEach((p, idx) => {
        const mesh = new THREE.Mesh(nucleonGeo, p.isProton ? protonMat : neutronMat);
        const y = 1 - (idx / (maxNucleons - 1 || 1)) * 2;
        const radiusAtY = Math.sqrt(Math.max(0, 1 - y * y));
        const theta = phi * idx * Math.PI * 2;

        const jitter = 0.85 + Math.random() * 0.3;
        const r = nucleusRadius * jitter;
        mesh.position.set(
          Math.cos(theta) * radiusAtY * r,
          y * r,
          Math.sin(theta) * radiusAtY * r
        );
        nucGroup.add(mesh);
      });

      // Central nucleus glow halo
      const haloGeo = new THREE.SphereGeometry(nucleusRadius * 1.35, 24, 24);
      const haloMat = new THREE.MeshBasicMaterial({
        color: 0xef4444,
        transparent: true,
        opacity: 0.15,
        wireframe: true,
      });
      const halo = new THREE.Mesh(haloGeo, haloMat);
      nucGroup.add(halo);

      root.add(nucGroup);
    }

    // 2. BUILD BOHR MODEL & SHELLS
    if (currentMode === 'bohr' || currentMode === 'configuration') {
      const electronGeo = new THREE.SphereGeometry(0.32, 20, 20);
      const electronMat = new THREE.MeshPhysicalMaterial({
        color: 0x38bdf8, // Electric Blue
        emissive: 0x0284c7,
        emissiveIntensity: 0.7,
        roughness: 0.15,
        metalness: 0.3,
        clearcoat: 1.0,
      });

      const baseShellRadius = 3.6;
      const shellStep = 2.4;

      shells.forEach((electronCountInShell, shellIdx) => {
        const shellRadius = baseShellRadius + shellIdx * shellStep;

        // Visual orbital ring guide
        const ringGeo = new THREE.RingGeometry(shellRadius - 0.03, shellRadius + 0.03, 96);
        const ringMat = new THREE.MeshBasicMaterial({
          color: new THREE.Color(catHex),
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.3,
        });
        const ringMesh = new THREE.Mesh(ringGeo, ringMat);
        ringMesh.rotation.x = Math.PI / 2;
        root.add(ringMesh);

        // Subtle inclined rings for realistic 3D appearance in Bohr mode
        const inclination = (shellIdx * 0.35) % (Math.PI / 3);
        const azimuth = shellIdx * 1.1;

        if (showElectrons) {
          for (let e = 0; e < electronCountInShell; e++) {
            const mesh = new THREE.Mesh(electronGeo, electronMat);

            const initialAngle = (e / electronCountInShell) * Math.PI * 2;
            const speed = 1.0 / Math.sqrt(shellIdx + 1); // Quantum Keplerian orbital velocity v ~ 1/sqrt(n)

            // Pauli Exclusion Spin assignment (alternate ↑ and ↓)
            const spinUp = e % 2 === 0;

            let arrow: THREE.ArrowHelper | null = null;
            if (showSpins) {
              const dir = new THREE.Vector3(0, spinUp ? 1 : -1, 0);
              arrow = new THREE.ArrowHelper(dir, new THREE.Vector3(0, 0, 0), 0.9, spinUp ? 0x10b981 : 0xf43f5e, 0.3, 0.2);
              root.add(arrow);
            }

            root.add(mesh);

            electronMeshesRef.current.push({
              mesh,
              spinArrow: arrow,
              shellRadius,
              angle: initialAngle,
              speed,
              inclination,
              azimuth,
              spinUp,
            });
          }
        }
      });
    }

    // 3. BUILD QUANTUM ORBITALS (s, p, d, f LOBES)
    if ((currentMode === 'orbitals' || currentMode === 'configuration') && showOrbitals) {
      const orbitalGroup = new THREE.Group();

      const orbitalColors = {
        s: 0x38bdf8, // Cyan Blue
        p: 0xf43f5e, // Crimson Rose
        d: 0x10b981, // Emerald Green
        f: 0xa855f7, // Royal Purple
      };

      // Create orbital lobe geometries based on element's block
      // s-Orbital: Spherical Shell
      const sGeo = new THREE.SphereGeometry(3.2, 32, 32);
      const sMat = new THREE.MeshPhysicalMaterial({
        color: orbitalColors.s,
        transparent: true,
        opacity: 0.35,
        roughness: 0.2,
        metalness: 0.1,
        transmission: 0.6,
        ior: 1.2,
        wireframe: false,
        depthWrite: false,
      });
      const sMesh = new THREE.Mesh(sGeo, sMat);
      orbitalGroup.add(sMesh);

      // p-Orbitals: Dumbbell lobes along X, Y, Z
      if (element.number >= 5) {
        const pLobeGeo = new THREE.SphereGeometry(2.2, 24, 24);
        pLobeGeo.scale(0.8, 2.0, 0.8);

        const pMat = new THREE.MeshPhysicalMaterial({
          color: orbitalColors.p,
          transparent: true,
          opacity: 0.4,
          roughness: 0.2,
          transmission: 0.5,
          depthWrite: false,
        });

        // Pz lobe
        const pz1 = new THREE.Mesh(pLobeGeo, pMat);
        pz1.position.set(0, 2.6, 0);
        const pz2 = new THREE.Mesh(pLobeGeo, pMat);
        pz2.position.set(0, -2.6, 0);
        orbitalGroup.add(pz1, pz2);

        // Px lobe
        const px1 = pz1.clone();
        px1.rotation.z = Math.PI / 2;
        px1.position.set(2.6, 0, 0);
        const px2 = pz2.clone();
        px2.rotation.z = Math.PI / 2;
        px2.position.set(-2.6, 0, 0);
        orbitalGroup.add(px1, px2);

        // Py lobe
        const py1 = pz1.clone();
        py1.rotation.x = Math.PI / 2;
        py1.position.set(0, 0, 2.6);
        const py2 = pz2.clone();
        py2.rotation.x = Math.PI / 2;
        py2.position.set(0, 0, -2.6);
        orbitalGroup.add(py1, py2);
      }

      // d-Orbitals: Cloverleaf lobes
      if (element.number >= 21) {
        const dMat = new THREE.MeshPhysicalMaterial({
          color: orbitalColors.d,
          transparent: true,
          opacity: 0.35,
          roughness: 0.25,
          transmission: 0.5,
          depthWrite: false,
        });

        const dGeo = new THREE.SphereGeometry(1.9, 20, 20);
        dGeo.scale(0.6, 1.8, 0.6);

        // 4 clover lobes at 45 degree diagonals
        for (let angle = 0; angle < 4; angle++) {
          const theta = (angle * Math.PI) / 2 + Math.PI / 4;
          const lobe = new THREE.Mesh(dGeo, dMat);
          lobe.rotation.z = theta;
          lobe.position.set(Math.cos(theta) * 3.4, Math.sin(theta) * 3.4, 0);
          orbitalGroup.add(lobe);
        }
      }

      orbitalMeshesRef.current.push(orbitalGroup);
      root.add(orbitalGroup);
    }

    // 4. BUILD ELECTRON PROBABILITY CLOUD (|ψ|² Distribution)
    if (currentMode === 'cloud') {
      const particleCount = Math.min(2500, Math.max(800, element.electrons * 45));
      const positions = new Float32Array(particleCount * 3);
      const colors = new Float32Array(particleCount * 3);

      const colorBase = new THREE.Color(catHex);
      const colorHot = new THREE.Color(0x38bdf8);

      for (let i = 0; i < particleCount; i++) {
        // Quantum hydrogenic radial probability distribution simulation
        // Radial probability P(r) ~ r² e^(-2r/a₀)
        const u = Math.random();
        const r = -Math.log(1 - u * 0.98) * (2.8 + element.period * 1.1);

        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);

        positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
        positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        positions[i * 3 + 2] = r * Math.cos(phi);

        // Color mapped to probability density (brighter towards nucleus)
        const densityFactor = Math.exp(-r / 4);
        const pColor = colorBase.clone().lerp(colorHot, densityFactor);

        colors[i * 3] = pColor.r;
        colors[i * 3 + 1] = pColor.g;
        colors[i * 3 + 2] = pColor.b;
      }

      const cloudGeo = new THREE.BufferGeometry();
      cloudGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      cloudGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

      const cloudMat = new THREE.PointsMaterial({
        size: 0.18,
        vertexColors: true,
        transparent: true,
        opacity: 0.65,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });

      const cloudPoints = new THREE.Points(cloudGeo, cloudMat);
      cloudPointsRef.current = cloudPoints;
      root.add(cloudPoints);
    }
  }, [element, currentMode, showNucleus, showElectrons, showOrbitals, showSpins]);

  return (
    <div className="relative w-full h-[520px] rounded-xl overflow-hidden bg-slate-950/80 border border-slate-800/90 shadow-2xl flex flex-col">
      {/* Top Header Overlay */}
      <div className="absolute top-3 left-4 right-4 z-10 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 rounded-lg bg-slate-900/90 border border-slate-700/80 shadow-md backdrop-blur-sm pointer-events-auto">
            <span className="text-xs font-mono uppercase tracking-wider text-slate-400">Element Model</span>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold text-white tracking-tight">{element.name}</span>
              <span className="text-xs font-mono font-semibold text-cyan-400">({element.symbol})</span>
              <span className="text-xs font-mono text-slate-400">Z = {element.number}</span>
            </div>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="hidden sm:flex items-center gap-1 p-1 rounded-lg bg-slate-900/90 border border-slate-800 shadow-md backdrop-blur-sm pointer-events-auto">
            <button
              onClick={() => handleModeSelect('bohr')}
              className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                currentMode === 'bohr'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Bohr Model
            </button>
            <button
              onClick={() => handleModeSelect('orbitals')}
              className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                currentMode === 'orbitals'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Orbitals
            </button>
            <button
              onClick={() => handleModeSelect('cloud')}
              className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                currentMode === 'cloud'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Electron Cloud
            </button>
            <button
              onClick={() => handleModeSelect('configuration')}
              className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                currentMode === 'configuration'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Configuration
            </button>
          </div>
        </div>

        {/* Legend Overlay */}
        <div className="hidden md:flex flex-col gap-1.5 p-2 rounded-lg bg-slate-900/90 border border-slate-800/80 text-[11px] font-mono text-slate-300 shadow-md backdrop-blur-sm pointer-events-auto">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block shadow-sm shadow-red-500/50"></span>
            <span>Protons ({element.protons})</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-300 inline-block"></span>
            <span>Neutrons ({element.neutrons})</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-400 inline-block shadow-sm shadow-sky-400/50"></span>
            <span>Electrons ({element.electrons})</span>
          </div>
          <div className="flex items-center gap-3 pt-0.5 border-t border-slate-800 text-[10px] text-slate-400">
            <span className="text-emerald-400 font-bold">↑ Spin Up</span>
            <span className="text-rose-400 font-bold">↓ Spin Down</span>
          </div>
        </div>
      </div>

      {/* 3D WebGL Canvas Mount Container */}
      <div
        ref={mountRef}
        className="flex-1 w-full h-full cursor-grab active:cursor-grabbing outline-none"
        title="Click and drag to rotate the 3D atomic model. Scroll to zoom."
      />

      {/* Bottom Collapsible Interactive Control Bar */}
      <div className="p-3 bg-slate-900/95 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs z-10">
        {/* Toggle Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => {
              soundEngine.playClick(1000);
              setShowNucleus(!showNucleus);
            }}
            className={`px-2.5 py-1 rounded border flex items-center gap-1.5 font-medium transition-colors ${
              showNucleus
                ? 'bg-red-500/15 border-red-500/40 text-red-300'
                : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
          >
            {showNucleus ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            Nucleus
          </button>

          <button
            onClick={() => {
              soundEngine.playClick(1100);
              setShowElectrons(!showElectrons);
            }}
            className={`px-2.5 py-1 rounded border flex items-center gap-1.5 font-medium transition-colors ${
              showElectrons
                ? 'bg-sky-500/15 border-sky-500/40 text-sky-300'
                : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
          >
            {showElectrons ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            Electrons
          </button>

          <button
            onClick={() => {
              soundEngine.playClick(1200);
              setShowOrbitals(!showOrbitals);
            }}
            className={`px-2.5 py-1 rounded border flex items-center gap-1.5 font-medium transition-colors ${
              showOrbitals
                ? 'bg-purple-500/15 border-purple-500/40 text-purple-300'
                : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Orbitals
          </button>

          <button
            onClick={() => {
              soundEngine.playClick(1050);
              setShowSpins(!showSpins);
            }}
            className={`px-2.5 py-1 rounded border flex items-center gap-1.5 font-medium transition-colors ${
              showSpins
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
          >
            Spin Vectors
          </button>
        </div>

        {/* Speed Slider & Controls */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 text-[11px] font-mono">Speed:</span>
            <input
              type="range"
              min="0.1"
              max="3.0"
              step="0.1"
              value={animSpeed}
              onChange={(e) => setAnimSpeed(parseFloat(e.target.value))}
              className="w-24 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              title={`Simulation Speed: ${animSpeed.toFixed(1)}x`}
            />
            <span className="text-cyan-400 font-mono text-[11px] w-8">{animSpeed.toFixed(1)}x</span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => {
                soundEngine.playClick(800);
                setIsPaused(!isPaused);
              }}
              className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors border border-slate-700"
              title={isPaused ? 'Resume Animation' : 'Pause Animation'}
            >
              {isPaused ? <Play className="w-3.5 h-3.5 text-emerald-400" /> : <Pause className="w-3.5 h-3.5" />}
            </button>

            <button
              onClick={() => {
                soundEngine.playClick(950);
                setAutoRotate(!autoRotate);
              }}
              className={`p-1.5 rounded border transition-colors ${
                autoRotate
                  ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300'
                  : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
              }`}
              title="Toggle Auto-Rotation"
            >
              <Compass className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={resetCamera}
              className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors border border-slate-700 flex items-center gap-1"
              title="Reset 3D View"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="text-[11px] hidden sm:inline">Reset</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

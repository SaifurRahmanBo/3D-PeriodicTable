import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { soundEngine } from '../utils/audio';
import { RotateCcw, Info } from 'lucide-react';

export type OrbitalType = 's' | 'p' | 'd' | 'f';

interface OrbitalViewerProps {
  initialOrbital?: OrbitalType;
}

interface OrbitalDetail {
  name: string;
  type: OrbitalType;
  l: number;
  maxElectrons: number;
  subtypes: string[];
  description: string;
  quantumDetails: string;
}

const ORBITAL_INFO: Record<OrbitalType, OrbitalDetail> = {
  s: {
    name: 's Orbital',
    type: 's',
    l: 0,
    maxElectrons: 2,
    subtypes: ['1s', '2s', '3s'],
    description: 'Spherically symmetric wavefunction with no angular nodal planes. Probability density depends solely on distance from the atomic nucleus.',
    quantumDetails: 'l = 0, mₗ = 0. Spherical harmonic Y₀⁰ is completely uniform across all angles.',
  },
  p: {
    name: 'p Orbital',
    type: 'p',
    l: 1,
    maxElectrons: 6,
    subtypes: ['pₓ', 'pᵧ', 'p_z'],
    description: 'Dumbbell-shaped orbital consisting of two distinct lobes separated by a planar angular node passing through the nucleus.',
    quantumDetails: 'l = 1, mₗ = {-1, 0, +1}. Lobes possess opposite wave function phases (+ and -).',
  },
  d: {
    name: 'd Orbital',
    type: 'd',
    l: 2,
    maxElectrons: 10,
    subtypes: ['d_xy', 'd_yz', 'd_xz', 'd_x²-y²', 'd_z²'],
    description: 'Four cloverleaf-shaped configurations with two perpendicular nodal planes, plus the distinctive d_z² dumbbell-with-torus.',
    quantumDetails: 'l = 2, mₗ = {-2, -1, 0, +1, +2}. Characteristic of transition metal chemistry and coordination complexes.',
  },
  f: {
    name: 'f Orbital',
    type: 'f',
    l: 3,
    maxElectrons: 14,
    subtypes: ['f_z³', 'f_xz²', 'f_yz²', 'f_xyz', 'f_z(x²-y²)', 'f_x(x²-3y²)', 'f_y(3x²-y²)'],
    description: 'Complex multi-lobed spatial geometries containing three nodal surfaces. Key to understanding lanthanide and actinide valence shielding.',
    quantumDetails: 'l = 3, mₗ = {-3, -2, -1, 0, +1, +2, +3}. High angular momentum gives rise to lanthanide contraction.',
  },
};

export const OrbitalViewer: React.FC<OrbitalViewerProps> = ({ initialOrbital = 's' }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [selectedOrbital, setSelectedOrbital] = useState<OrbitalType>(initialOrbital);
  const [activeSubtype, setActiveSubtype] = useState<string>(ORBITAL_INFO[initialOrbital].subtypes[0]);

  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const orbitalGroupRef = useRef<THREE.Group | null>(null);
  const frameIdRef = useRef<number>(0);

  const handleSelectOrbital = (type: OrbitalType) => {
    soundEngine.playOrbitalTransition();
    setSelectedOrbital(type);
    setActiveSubtype(ORBITAL_INFO[type].subtypes[0]);
  };

  const handleSelectSubtype = (sub: string) => {
    soundEngine.playClick(1150);
    setActiveSubtype(sub);
  };

  const resetView = () => {
    soundEngine.playClick(900);
    if (cameraRef.current && controlsRef.current) {
      cameraRef.current.position.set(0, 5, 12);
      controlsRef.current.target.set(0, 0, 0);
      controlsRef.current.update();
    }
  };

  // Setup WebGL Scene
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

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

    const width = container.clientWidth || 400;
    const height = container.clientHeight || 320;

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(0, 5, 12);
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
    rendererRef.current = renderer;

    container.appendChild(renderer.domElement);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // Studio lighting
    const dirLight1 = new THREE.DirectionalLight(0xffffff, 2.0);
    dirLight1.position.set(8, 12, 10);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x38bdf8, 1.2);
    dirLight2.position.set(-8, -6, -8);
    scene.add(dirLight2);

    const hemiLight = new THREE.HemisphereLight(0x06b6d4, 0x1e1b4b, 0.8);
    scene.add(hemiLight);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 4;
    controls.maxDistance = 30;
    controlsRef.current = controls;

    const group = new THREE.Group();
    scene.add(group);
    orbitalGroupRef.current = group;

    // Coordinate Axes Guide (quiet hairline)
    const axesHelper = new THREE.AxesHelper(4.5);
    (axesHelper.material as THREE.Material).transparent = true;
    (axesHelper.material as THREE.Material).opacity = 0.25;
    scene.add(axesHelper);

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

    const clock = new THREE.Clock();

    const animate = () => {
      frameIdRef.current = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      controls.update();

      if (orbitalGroupRef.current) {
        orbitalGroupRef.current.rotation.y += delta * 0.35;
      }

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(frameIdRef.current);
      resizeObserver.disconnect();
      controls.dispose();
      renderer.dispose();
      if (renderer.domElement.parentElement === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Construct 3D Orbital Geometry
  useEffect(() => {
    const group = orbitalGroupRef.current;
    if (!group) return;

    // Clear previous children
    while (group.children.length > 0) {
      const child = group.children[0];
      group.remove(child);
      if ((child as THREE.Mesh).geometry) {
        (child as THREE.Mesh).geometry.dispose();
      }
      if ((child as THREE.Mesh).material) {
        const mat = (child as THREE.Mesh).material;
        if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
        else mat.dispose();
      }
    }

    const posColor = 0x06b6d4; // Positive phase: Cyan
    const negColor = 0xf43f5e; // Negative phase: Rose Red

    const posMaterial = new THREE.MeshPhysicalMaterial({
      color: posColor,
      emissive: 0x0891b2,
      emissiveIntensity: 0.3,
      transparent: true,
      opacity: 0.65,
      roughness: 0.2,
      metalness: 0.1,
      transmission: 0.45,
      depthWrite: false,
      clearcoat: 0.5,
    });

    const negMaterial = new THREE.MeshPhysicalMaterial({
      color: negColor,
      emissive: 0xbe123c,
      emissiveIntensity: 0.3,
      transparent: true,
      opacity: 0.65,
      roughness: 0.2,
      metalness: 0.1,
      transmission: 0.45,
      depthWrite: false,
      clearcoat: 0.5,
    });

    if (selectedOrbital === 's') {
      // s Orbital: Concentric spherical shell with subtle wireframe inner core
      const sGeo = new THREE.SphereGeometry(2.8, 36, 36);
      const sMesh = new THREE.Mesh(sGeo, posMaterial);
      group.add(sMesh);

      // Inner radial node indicator
      const innerGeo = new THREE.SphereGeometry(1.2, 24, 24);
      const innerMat = new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        wireframe: true,
        transparent: true,
        opacity: 0.3,
      });
      const innerMesh = new THREE.Mesh(innerGeo, innerMat);
      group.add(innerMesh);
    } else if (selectedOrbital === 'p') {
      // p Orbital: Dumbbell with positive and negative lobes along selected axis
      const lobeGeo = new THREE.SphereGeometry(1.8, 28, 28);
      lobeGeo.scale(0.85, 1.8, 0.85);

      const topLobe = new THREE.Mesh(lobeGeo, posMaterial);
      topLobe.position.set(0, 1.9, 0);

      const bottomLobe = new THREE.Mesh(lobeGeo, negMaterial);
      bottomLobe.position.set(0, -1.9, 0);

      const pGroup = new THREE.Group();
      pGroup.add(topLobe, bottomLobe);

      if (activeSubtype === 'pₓ') {
        pGroup.rotation.z = Math.PI / 2;
      } else if (activeSubtype === 'pᵧ') {
        pGroup.rotation.x = Math.PI / 2;
      }
      group.add(pGroup);
    } else if (selectedOrbital === 'd') {
      if (activeSubtype === 'd_z²') {
        // d_z²: Central dumbbell + equatorial toroidal ring
        const lobeGeo = new THREE.SphereGeometry(1.6, 24, 24);
        lobeGeo.scale(0.8, 1.9, 0.8);

        const topLobe = new THREE.Mesh(lobeGeo, posMaterial);
        topLobe.position.set(0, 1.8, 0);

        const bottomLobe = new THREE.Mesh(lobeGeo, posMaterial);
        bottomLobe.position.set(0, -1.8, 0);

        const torusGeo = new THREE.TorusGeometry(1.8, 0.55, 24, 48);
        const torusMesh = new THREE.Mesh(torusGeo, negMaterial);
        torusMesh.rotation.x = Math.PI / 2;

        group.add(topLobe, bottomLobe, torusMesh);
      } else {
        // 4 cloverleaf lobes
        const dLobeGeo = new THREE.SphereGeometry(1.4, 24, 24);
        dLobeGeo.scale(0.7, 1.7, 0.7);

        for (let i = 0; i < 4; i++) {
          const isPos = i % 2 === 0;
          const lobe = new THREE.Mesh(dLobeGeo, isPos ? posMaterial : negMaterial);
          const theta = (i * Math.PI) / 2 + Math.PI / 4;
          lobe.rotation.z = theta;
          lobe.position.set(Math.cos(theta) * 2.1, Math.sin(theta) * 2.1, 0);

          if (activeSubtype === 'd_yz') {
            lobe.rotation.y = Math.PI / 2;
          } else if (activeSubtype === 'd_xz') {
            lobe.rotation.x = Math.PI / 2;
          }
          group.add(lobe);
        }
      }
    } else if (selectedOrbital === 'f') {
      // 8-lobed octupole configuration for f-orbitals
      const fLobeGeo = new THREE.SphereGeometry(1.1, 20, 20);
      fLobeGeo.scale(0.65, 1.4, 0.65);

      const positions = [
        [1, 1, 1], [-1, -1, 1], [-1, 1, -1], [1, -1, -1],
        [-1, -1, -1], [1, 1, -1], [1, -1, 1], [-1, 1, 1],
      ];

      positions.forEach(([x, y, z], idx) => {
        const isPos = idx < 4;
        const lobe = new THREE.Mesh(fLobeGeo, isPos ? posMaterial : negMaterial);
        const vec = new THREE.Vector3(x, y, z).normalize().multiplyScalar(2.2);
        lobe.position.copy(vec);
        lobe.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), vec.clone().normalize());
        group.add(lobe);
      });
    }

    // Central nucleus pinpoint
    const nucGeo = new THREE.SphereGeometry(0.25, 16, 16);
    const nucMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const nuc = new THREE.Mesh(nucGeo, nucMat);
    group.add(nuc);
  }, [selectedOrbital, activeSubtype]);

  const currentInfo = ORBITAL_INFO[selectedOrbital];

  return (
    <div className="w-full h-full rounded-xl bg-slate-950/80 border border-slate-800/90 shadow-2xl flex flex-col overflow-hidden">
      {/* Top Header & Orbital Selector Pills */}
      <div className="p-4 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3 bg-slate-900/60">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <span>Electron Orbitals</span>
            <span className="text-xs font-mono font-normal text-cyan-400">(Quantum Wavefunctions)</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">3D Angular Probability Density & Phase Harmonics</p>
        </div>

        {/* s, p, d, f buttons */}
        <div className="flex items-center gap-1.5 p-1 rounded-lg bg-slate-900 border border-slate-800">
          {(['s', 'p', 'd', 'f'] as OrbitalType[]).map((type) => (
            <button
              key={type}
              onClick={() => handleSelectOrbital(type)}
              className={`w-9 h-8 rounded text-xs font-bold font-mono transition-all uppercase ${
                selectedOrbital === type
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Subtype Orientation Selector */}
      <div className="px-4 py-2 border-b border-slate-800/60 bg-slate-950/40 flex items-center justify-between gap-2 overflow-x-auto">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] font-mono text-slate-400 uppercase mr-1">Orientation:</span>
          {currentInfo.subtypes.map((sub) => (
            <button
              key={sub}
              onClick={() => handleSelectSubtype(sub)}
              className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors ${
                activeSubtype === sub
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {sub}
            </button>
          ))}
        </div>

        <button
          onClick={resetView}
          className="p-1 rounded bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 transition-colors shrink-0"
          title="Reset Camera"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 3D Canvas Stage */}
      <div className="relative flex-1 min-h-[220px]">
        <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing outline-none" />

        {/* Phase legend */}
        <div className="absolute bottom-3 left-4 p-2 rounded-lg bg-slate-900/90 border border-slate-800 text-[10px] font-mono backdrop-blur-sm pointer-events-none flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-sm shadow-cyan-400/50"></span>
            <span className="text-slate-300">Phase (+)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-sm shadow-rose-500/50"></span>
            <span className="text-slate-300">Phase (-)</span>
          </div>
        </div>
      </div>

      {/* Quantum Explanation Footer Card */}
      <div className="p-3 bg-slate-900/80 border-t border-slate-800/80 text-xs">
        <div className="flex items-start gap-2">
          <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-white">{currentInfo.name}</span>
              <span className="font-mono text-[11px] text-cyan-400">
                (Holds up to {currentInfo.maxElectrons} e⁻)
              </span>
            </div>
            <p className="text-slate-300 text-[11px] leading-relaxed mb-1">{currentInfo.description}</p>
            <p className="font-mono text-[10px] text-slate-400">{currentInfo.quantumDetails}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

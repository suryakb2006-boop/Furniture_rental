// 3D studio flat for the landing page, built from simple shapes (no model files to download).
// Furniture drops into place on load and chapter by chapter as the visitor scrolls.
import { useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ContactShadows, Html, Line } from '@react-three/drei';
import { PALETTE, Sofa, CoffeeTable, FloorLamp, Plant, Armchair, Bookshelf, Bed, Wardrobe, Desk } from './furniture3d.jsx';
import * as THREE from 'three';

const { damp } = THREE.MathUtils;
const easeOutBack = (t) => { const c1 = 1.4; const c3 = c1 + 1; return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2; };


// Wraps a piece of furniture: it falls in with a small overshoot once the scroll reaches `at`.
function Piece({ at = 0, delay = 0, progress, reduce, position = [0, 0, 0], rotation = 0, children }) {
  const g = useRef();
  const t = useRef(0);
  useFrame((state, dt) => {
    const on = progress.get() >= at && state.clock.elapsedTime > delay;
    t.current = reduce ? (on ? 1 : 0) : damp(t.current, on ? 1 : 0, 5, Math.min(dt, 0.05));
    const k = Math.max(0, Math.min(1.2, easeOutBack(t.current)));
    if (!g.current) return;
    g.current.visible = t.current > 0.01;
    g.current.position.set(position[0], position[1] + (1 - t.current) * 2.6, position[2]);
    g.current.scale.setScalar(Math.max(0.001, k));
    g.current.rotation.y = rotation + (1 - t.current) * 0.6;
  });
  return <group ref={g}>{children}</group>;
}

// Chapter 3 overlay: floor plan grid, footprints of every piece and the room's dimensions.
function FitOverlay({ progress, reduce, c }) {
  const g = useRef();
  const t = useRef(0);
  const matRefs = useRef([]);
  const labels = useRef([]);
  useFrame((_, dt) => {
    const p = progress.get();
    const on = p >= 0.55 && p < 0.8;
    t.current = reduce ? (on ? 1 : 0) : damp(t.current, on ? 1 : 0, 4, Math.min(dt, 0.05));
    if (g.current) g.current.visible = t.current > 0.01;
    matRefs.current.forEach((m) => { if (m) m.opacity = t.current; });
    labels.current.forEach((el, i) => { if (el) { el.style.opacity = String(t.current); el.style.transform = `translateY(${(1 - t.current) * 8 + i * 0}px)`; } });
  });
  const y = 0.07;
  const rect = (cx, cz, w, d) => [[cx - w / 2, y, cz - d / 2], [cx + w / 2, y, cz - d / 2], [cx + w / 2, y, cz + d / 2], [cx - w / 2, y, cz + d / 2], [cx - w / 2, y, cz - d / 2]];
  const prints = [rect(-1.95, 0.5, 0.85, 2), rect(-0.55, 0.6, 1.05, 0.56), rect(1.45, -1.45, 1.65, 2.05), rect(-2.2, -1.6, 0.56, 1.5), rect(2.05, 0.9, 0.6, 1.2), rect(-0.6, -2.3, 0.85, 0.32)];
  const grid = useMemo(() => {
    const pts = [];
    for (let i = -2.5; i <= 2.5001; i += 0.5) { pts.push([[i, 0.056, -2.5], [i, 0.056, 2.5]]); pts.push([[-2.5, 0.056, i], [2.5, 0.056, i]]); }
    return pts;
  }, []);
  return (
    <group ref={g}>
      {grid.map((pts, i) => <Line key={i} points={pts} color={c.line} lineWidth={0.6} transparent opacity={0.25} />)}
      {prints.map((pts, i) => (
        <Line key={`p${i}`} points={pts} color={c.line} lineWidth={2.2} transparent ref={(l) => { matRefs.current[i] = l?.material; }} />
      ))}
      <Line points={[[-2.5, y, 2.85], [2.5, y, 2.85]]} color={c.line} lineWidth={1.6} />
      <Line points={[[2.85, y, -2.5], [2.85, y, 2.5]]} color={c.line} lineWidth={1.6} />
      <Html position={[0, 0.1, 3.15]} center className="pointer-events-none select-none">
        <span ref={(el) => { labels.current[0] = el; }} className="block whitespace-nowrap rounded-full bg-surface px-2.5 py-1 text-xs font-semibold text-accent opacity-0 shadow-soft">16 ft</span>
      </Html>
      <Html position={[3.2, 0.1, 0]} center className="pointer-events-none select-none">
        <span ref={(el) => { labels.current[1] = el; }} className="block whitespace-nowrap rounded-full bg-surface px-2.5 py-1 text-xs font-semibold text-accent opacity-0 shadow-soft">16 ft</span>
      </Html>
      <Html position={[1.45, 1.4, -1.2]} center className="pointer-events-none select-none">
        <span ref={(el) => { labels.current[2] = el; }} className="flex items-center gap-1.5 whitespace-nowrap rounded-full bg-accent px-3 py-1.5 text-xs font-semibold text-accent-ink opacity-0 shadow-lift">Everything fits, 41% floor used</span>
      </Html>
    </group>
  );
}

// Chapter 4: a ring that circles the flat, for delivery, reminders and pick-up.
function Orbit({ progress, reduce, c }) {
  const g = useRef();
  const t = useRef(0);
  useFrame((state, dt) => {
    const on = progress.get() >= 0.78;
    t.current = reduce ? (on ? 1 : 0) : damp(t.current, on ? 1 : 0, 3, Math.min(dt, 0.05));
    if (!g.current) return;
    g.current.visible = t.current > 0.01;
    g.current.scale.setScalar(0.6 + t.current * 0.4);
    if (!reduce) g.current.rotation.y = state.clock.elapsedTime * 0.35;
  });
  return (
    <group ref={g} position={[0, 0.05, 0]}>
      <mesh rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[4.4, 0.025, 8, 120]} /><meshStandardMaterial color={c.line} emissive={c.line} emissiveIntensity={0.6} /></mesh>
      {[0, 1, 2, 3].map((i) => (
        <mesh key={i} position={[Math.cos((i * Math.PI) / 2) * 4.4, 0, Math.sin((i * Math.PI) / 2) * 4.4]}>
          <sphereGeometry args={[0.12, 16, 16]} /><meshStandardMaterial color={c.fabric2} emissive={c.fabric2} emissiveIntensity={0.5} />
        </mesh>
      ))}
    </group>
  );
}

function Rig({ progress, reduce, compact }) {
  const { camera } = useThree();
  const look = useMemo(() => new THREE.Vector3(0, 0.7, 0), []);
  const target = useMemo(() => new THREE.Vector3(), []);
  useFrame((state, dt) => {
    const p = progress.get();
    const intro = reduce ? 1 : Math.min(1, state.clock.elapsedTime / 2.2);
    const angle = 0.72 + p * 1.25 + (reduce ? 0 : state.pointer.x * 0.12);
    let radius = (compact ? 15 : 12.4) - p * 1.8 + (1 - easeOutBack(intro)) * 5;
    if (p > 0.78) radius += (p - 0.78) * 9;
    const height = 5.4 - p * 1.2 + (reduce ? 0 : state.pointer.y * 0.4) + (p > 0.78 ? (p - 0.78) * 8 : 0);
    target.set(Math.sin(angle) * radius, height, Math.cos(angle) * radius);
    camera.position.lerp(target, reduce ? 1 : 1 - Math.exp(-dt * 3));
    camera.lookAt(look);
  });
  return null;
}

function Room({ progress, reduce, dark, compact }) {
  const c = dark ? PALETTE.dark : PALETTE.light;
  const pp = { progress, reduce };
  return (
    <>
      <Rig progress={progress} reduce={reduce} compact={compact} />
      <ambientLight intensity={dark ? 0.62 : 0.75} />
      <hemisphereLight args={[dark ? '#9fc9b3' : '#ffffff', c.floor, dark ? 0.5 : 0.55]} />
      <directionalLight position={[6, 9, 5]} intensity={dark ? 1.45 : 1.8} castShadow shadow-mapSize={[1024, 1024]} shadow-camera-left={-6} shadow-camera-right={6} shadow-camera-top={6} shadow-camera-bottom={-6} />

      {/* shell of the flat */}
      <Piece {...pp} at={0} delay={0}>
        <mesh position={[0, -0.05, 0]} receiveShadow><boxGeometry args={[5, 0.1, 5]} /><meshStandardMaterial color={c.floor} roughness={0.85} /></mesh>
        {Array.from({ length: 10 }).map((_, i) => (
          <mesh key={i} position={[-2.5 + i * 0.5 + 0.25, 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[0.012, 5]} /><meshBasicMaterial color="#000" transparent opacity={0.06} /></mesh>
        ))}
        <mesh position={[0, 1.3, -2.55]} receiveShadow><boxGeometry args={[5.1, 2.7, 0.1]} /><meshStandardMaterial color={c.wall} roughness={0.95} /></mesh>
        <mesh position={[-2.55, 1.3, 0]} receiveShadow><boxGeometry args={[0.1, 2.7, 5]} /><meshStandardMaterial color={c.wall2} roughness={0.95} /></mesh>
        <mesh position={[0.9, 1.55, -2.49]}><boxGeometry args={[1.3, 1.0, 0.02]} /><meshStandardMaterial color={dark ? '#2c4a3d' : '#cfe5f0'} emissive={dark ? '#1f3a2e' : '#dff0f7'} emissiveIntensity={dark ? 0.6 : 0.5} /></mesh>
        <mesh position={[0.9, 1.55, -2.48]}><boxGeometry args={[0.03, 1.0, 0.02]} /><meshStandardMaterial color={c.linen} /></mesh>
        <mesh position={[-2.49, 1.2, 0.5]}><boxGeometry args={[0.02, 0.7, 1.1]} /><meshStandardMaterial color={c.linen} /></mesh>
        <mesh position={[-2.48, 1.2, 0.5]}><boxGeometry args={[0.02, 0.62, 1.02]} /><meshStandardMaterial color={c.fabric2} /></mesh>
      </Piece>

      {/* hero set */}
      <Piece {...pp} at={0} delay={0.5} position={[0.1, 0.052, 0.55]}><mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[2.3, 1.7]} /><meshStandardMaterial color={c.rug} roughness={1} /></mesh></Piece>
      <Piece {...pp} at={0} delay={0.8} position={[-1.95, 0, 0.5]} rotation={Math.PI / 2}><Sofa c={c} /></Piece>
      <Piece {...pp} at={0} delay={1.1} position={[-0.55, 0, 0.6]} rotation={Math.PI / 2}><CoffeeTable c={c} /></Piece>
      <Piece {...pp} at={0} delay={1.35} position={[-2.1, 0, 2.05]}><FloorLamp c={c} /></Piece>
      <Piece {...pp} at={0} delay={1.55} position={[2.05, 0, 2.05]}><Plant c={c} /></Piece>

      {/* chapter 1: situation */}
      <Piece {...pp} at={0.16} position={[0.75, 0, 1.55]} rotation={-Math.PI / 2 - 0.4}><Armchair c={c} /></Piece>
      <Piece {...pp} at={0.2} position={[-0.6, 0, -2.3]}><Bookshelf c={c} /></Piece>

      {/* chapter 2: whole stay */}
      <Piece {...pp} at={0.36} position={[1.45, 0, -1.45]}><Bed c={c} /></Piece>
      <Piece {...pp} at={0.4} position={[-2.2, 0, -1.6]} rotation={Math.PI / 2}><Wardrobe c={c} /></Piece>
      <Piece {...pp} at={0.44} position={[2.05, 0, 0.9]} rotation={-Math.PI / 2}><Desk c={c} /></Piece>

      <FitOverlay progress={progress} reduce={reduce} c={c} />
      <Orbit progress={progress} reduce={reduce} c={c} />
      <ContactShadows position={[0, 0.001, 0]} opacity={dark ? 0.5 : 0.35} scale={9} blur={2.4} far={3} />
    </>
  );
}

export default function Scene3D({ progress, reduce = false, dark = false, active = true, compact = false }) {
  return (
    <Canvas
      shadows
      dpr={[1, 1.75]}
      frameloop={active ? 'always' : 'never'}
      camera={{ position: [9, 7, 9], fov: 32, near: 0.1, far: 80 }}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      aria-label="3D model of a furnished studio flat"
    >
      <Room progress={progress} reduce={reduce} dark={dark} compact={compact} />
    </Canvas>
  );
}

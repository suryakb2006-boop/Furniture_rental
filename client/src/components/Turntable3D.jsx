// A single piece of furniture on a slowly turning plinth. Drag to spin it; it settles back to auto-rotate.
import { useEffect, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { ContactShadows, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { MODELS, PALETTE } from './furniture3d.jsx';

function useDark() {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'));
  useEffect(() => {
    const o = new MutationObserver(() => setDark(document.documentElement.classList.contains('dark')));
    o.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => o.disconnect();
  }, []);
  return dark;
}

// Scales the model so its footprint matches a real item (widthCm x depthCm), keeping its height.
export function FittedModel({ kind, c, widthCm, depthCm }) {
  const m = MODELS[kind] || MODELS.sofa;
  const sx = widthCm ? Math.min(1.8, Math.max(0.55, widthCm / 100 / m.w)) : 1;
  const sz = depthCm ? Math.min(1.8, Math.max(0.55, depthCm / 100 / m.d)) : 1;
  const C = m.C;
  return <group scale={[sx, 1, sz]}><C c={c} /></group>;
}

function Stage({ kind, widthCm, depthCm, dark, reduce }) {
  const g = useRef();
  const t = useRef(0);
  const c = dark ? PALETTE.dark : PALETTE.light;
  const size = Math.max((widthCm || MODELS[kind]?.w * 100 || 150) / 100, (depthCm || MODELS[kind]?.d * 100 || 90) / 100);
  useEffect(() => { t.current = 0; }, [kind]);
  useFrame((_, dt) => {
    t.current = reduce ? 1 : THREE.MathUtils.damp(t.current, 1, 5, Math.min(dt, 0.05));
    if (!g.current) return;
    const k = 1 + 1.4 * (t.current - 1) ** 3 + 0.4 * (t.current - 1) ** 2;
    g.current.scale.setScalar(Math.max(0.001, k));
    g.current.position.y = (1 - t.current) * 0.8;
  });
  const fit = 2.2 / Math.max(1.2, size);
  return (
    <>
      <ambientLight intensity={dark ? 0.7 : 0.8} />
      <hemisphereLight args={['#ffffff', dark ? '#1d2621' : '#c49a6c', dark ? 0.45 : 0.5]} />
      <directionalLight position={[4, 6, 3]} intensity={dark ? 1.4 : 1.7} castShadow shadow-mapSize={[1024, 1024]} />
      <directionalLight position={[-4, 3, -2]} intensity={0.35} color="#bfe3d0" />
      <group scale={fit}>
        <mesh position={[0, -0.03, 0]} receiveShadow>
          <cylinderGeometry args={[Math.max(1.3, size * 0.75), Math.max(1.35, size * 0.78), 0.06, 64]} />
          <meshStandardMaterial color={dark ? '#1c3428' : '#d6e6dc'} roughness={0.9} />
        </mesh>
        <group ref={g} key={kind}>
          <FittedModel kind={kind} c={c} widthCm={widthCm} depthCm={depthCm} />
        </group>
      </group>
      <ContactShadows position={[0, 0.01, 0]} opacity={dark ? 0.55 : 0.4} scale={6} blur={2.2} far={2.5} />
    </>
  );
}

export default function Turntable3D({ kind = 'sofa', widthCm, depthCm, reduce = false, className, autoRotate = true }) {
  const dark = useDark();
  return (
    <div className={className}>
      <Canvas shadows dpr={[1, 1.75]} camera={{ position: [3.2, 2.3, 3.6], fov: 34 }} gl={{ antialias: true, alpha: true }}>
        <Stage kind={kind} widthCm={widthCm} depthCm={depthCm} dark={dark} reduce={reduce} />
        <OrbitControls enablePan={false} enableZoom={false} autoRotate={autoRotate && !reduce} autoRotateSpeed={1.6} minPolarAngle={0.6} maxPolarAngle={1.35} target={[0, 0.45, 0]} />
      </Canvas>
    </div>
  );
}

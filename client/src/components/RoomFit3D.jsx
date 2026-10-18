// 3D view of a Room Fit Check layout: the same positions as the 2D plan, with each piece shown as a
// representative model scaled to its real footprint.
import { useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { ContactShadows, OrbitControls } from '@react-three/drei';
import { PALETTE, modelFor, MODELS } from './furniture3d.jsx';
import { FittedModel } from './Turntable3D.jsx';

function useDark() {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'));
  useEffect(() => {
    const o = new MutationObserver(() => setDark(document.documentElement.classList.contains('dark')));
    o.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => o.disconnect();
  }, []);
  return dark;
}

export default function RoomFit3D({ W, L, rects, door, reduce }) {
  const dark = useDark();
  const c = dark ? PALETTE.dark : PALETTE.light;
  const w = W / 100;
  const l = L / 100;
  const span = Math.max(w, l);
  return (
    <Canvas shadows dpr={[1, 1.75]} camera={{ position: [span * 0.9, span * 1.05, span * 1.15], fov: 38 }} gl={{ antialias: true, alpha: true }}>
      <ambientLight intensity={dark ? 0.65 : 0.8} />
      <hemisphereLight args={['#ffffff', c.floor, 0.45]} />
      <directionalLight position={[w, span * 2, l]} intensity={dark ? 1.3 : 1.6} castShadow shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-span} shadow-camera-right={span} shadow-camera-top={span} shadow-camera-bottom={-span} />
      <group>
        <mesh position={[0, -0.04, 0]} receiveShadow><boxGeometry args={[w, 0.08, l]} /><meshStandardMaterial color={c.floor} roughness={0.85} /></mesh>
        {/* two low walls so the room reads as a room without hiding the furniture */}
        <mesh position={[0, 0.5, -l / 2 - 0.04]} receiveShadow><boxGeometry args={[w + 0.08, 1, 0.08]} /><meshStandardMaterial color={c.wall} /></mesh>
        <mesh position={[-w / 2 - 0.04, 0.5, 0]} receiveShadow><boxGeometry args={[0.08, 1, l + 0.08]} /><meshStandardMaterial color={c.wall2} /></mesh>
        {/* door opening marked on the floor */}
        <mesh position={[-w / 2 + (door.x + door.w / 2) / 100, 0.005, l / 2 - door.h / 200]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[door.w / 100, door.h / 100]} /><meshBasicMaterial color={c.line} transparent opacity={0.18} />
        </mesh>
        {rects.map((r) => {
          const kind = modelFor(r.name, r.category);
          const cx = -w / 2 + (r.x + r.rw / 2) / 100;
          const cz = -l / 2 + (r.y + r.rh / 2) / 100;
          return (
            <group key={r.id} position={[cx, 0, cz]} rotation={[0, r.rot ? Math.PI / 2 : 0, 0]}>
              <FittedModel kind={kind} c={c} widthCm={r.w} depthCm={r.d} />
              {r.bad && (
                <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                  <planeGeometry args={[r.w / 100 + 0.1, r.d / 100 + 0.1]} /><meshBasicMaterial color="#d9463a" transparent opacity={0.35} />
                </mesh>
              )}
            </group>
          );
        })}
      </group>
      <ContactShadows position={[0, 0.005, 0]} opacity={0.35} scale={span * 1.6} blur={2} far={2} />
      <OrbitControls enablePan={false} minDistance={span * 0.8} maxDistance={span * 3} maxPolarAngle={1.35} autoRotate={!reduce} autoRotateSpeed={0.6} target={[0, 0.3, 0]} />
    </Canvas>
  );
}

export { MODELS };

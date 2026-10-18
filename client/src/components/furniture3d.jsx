// Procedural 3D furniture (plain shapes, no model files). Shared by the landing story, the showroom
// turntable, the item page 3D view and the Room Fit Check 3D view.
import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';

export const PALETTE = {
  light: { floor: '#c49a6c', wall: '#e8ede8', wall2: '#dfe6df', skirting: '#cfd8cf', rug: '#d8c7a4', wood: '#8a5a36', dark: '#2b2f2d', fabric: '#2f6b52', fabric2: '#c9962c', linen: '#f3f1ea', blanket: '#1f5a43', leaf: '#3f7d4f', pot: '#b86b45', line: '#1f5a43', label: '#14201a' },
  dark: { floor: '#6e5238', wall: '#1d2621', wall2: '#18201c', skirting: '#26312b', rug: '#4a4131', wood: '#6b4528', dark: '#111513', fabric: '#3f8a69', fabric2: '#c9962c', linen: '#d9d6cc', blanket: '#2f6b52', leaf: '#4e9a62', pot: '#9c5a3a', line: '#82c7a3', label: '#e6ece7' },
};

export const Box = ({ size, pos, color, radius = 0.03, ...rest }) => (
  <RoundedBox args={size} radius={Math.min(radius, Math.min(...size) / 2.2)} smoothness={3} position={pos} castShadow receiveShadow {...rest}>
    <meshStandardMaterial color={color} roughness={0.75} />
  </RoundedBox>
);
export const Leg = ({ pos, h, color }) => (
  <mesh position={[pos[0], h / 2, pos[1]]} castShadow><cylinderGeometry args={[0.025, 0.02, h, 10]} /><meshStandardMaterial color={color} roughness={0.5} /></mesh>
);

export function Sofa({ c }) {
  return (
    <group>
      <Box size={[2, 0.22, 0.85]} pos={[0, 0.27, 0]} color={c.fabric} />
      <Box size={[2, 0.55, 0.2]} pos={[0, 0.6, -0.33]} color={c.fabric} radius={0.08} />
      <Box size={[0.18, 0.38, 0.85]} pos={[-0.91, 0.52, 0]} color={c.fabric} radius={0.07} />
      <Box size={[0.18, 0.38, 0.85]} pos={[0.91, 0.52, 0]} color={c.fabric} radius={0.07} />
      <Box size={[0.8, 0.12, 0.6]} pos={[-0.41, 0.44, 0.07]} color={c.fabric} radius={0.05} />
      <Box size={[0.8, 0.12, 0.6]} pos={[0.41, 0.44, 0.07]} color={c.fabric} radius={0.05} />
      <Box size={[0.4, 0.34, 0.12]} pos={[0.55, 0.62, -0.18]} color={c.fabric2} radius={0.06} rotation={[-0.2, 0, 0.1]} />
      {[[-0.9, -0.35], [0.9, -0.35], [-0.9, 0.35], [0.9, 0.35]].map((p) => <Leg key={p.join()} pos={p} h={0.16} color={c.wood} />)}
    </group>
  );
}
export function CoffeeTable({ c }) {
  return (
    <group>
      <Box size={[1.05, 0.05, 0.56]} pos={[0, 0.42, 0]} color={c.wood} radius={0.02} />
      <Box size={[0.95, 0.03, 0.46]} pos={[0, 0.16, 0]} color={c.wood} radius={0.01} />
      {[[-0.47, -0.23], [0.47, -0.23], [-0.47, 0.23], [0.47, 0.23]].map((p) => <Leg key={p.join()} pos={p} h={0.42} color={c.wood} />)}
      <mesh position={[0.2, 0.5, 0.05]} castShadow><cylinderGeometry args={[0.07, 0.05, 0.12, 16]} /><meshStandardMaterial color={c.pot} /></mesh>
      <Box size={[0.3, 0.04, 0.22]} pos={[-0.2, 0.465, 0]} color={c.fabric2} radius={0.01} />
    </group>
  );
}
export function FloorLamp({ c }) {
  return (
    <group>
      <mesh position={[0, 0.03, 0]} castShadow><cylinderGeometry args={[0.2, 0.22, 0.05, 24]} /><meshStandardMaterial color={c.dark} /></mesh>
      <mesh position={[0, 0.85, 0]}><cylinderGeometry args={[0.015, 0.015, 1.65, 8]} /><meshStandardMaterial color={c.dark} metalness={0.6} roughness={0.3} /></mesh>
      <mesh position={[0, 1.62, 0]}><coneGeometry args={[0.26, 0.3, 24, 1, true]} /><meshStandardMaterial color="#f6ead0" emissive="#ffcf87" emissiveIntensity={0.9} side={THREE.DoubleSide} /></mesh>
      <pointLight position={[0, 1.5, 0]} intensity={2.2} distance={4} color="#ffcf87" />
    </group>
  );
}
export function Plant({ c }) {
  return (
    <group>
      <mesh position={[0, 0.2, 0]} castShadow><cylinderGeometry args={[0.2, 0.15, 0.4, 20]} /><meshStandardMaterial color={c.pot} roughness={0.8} /></mesh>
      {[[0, 0.75, 0, 0.32], [0.14, 0.95, 0.05, 0.22], [-0.12, 1.05, -0.05, 0.2], [0.02, 1.2, 0.02, 0.16]].map(([x, y, z, r]) => (
        <mesh key={`${x}${y}`} position={[x, y, z]} castShadow><icosahedronGeometry args={[r, 1]} /><meshStandardMaterial color={c.leaf} flatShading roughness={0.9} /></mesh>
      ))}
    </group>
  );
}
export function Armchair({ c }) {
  return (
    <group>
      <Box size={[0.8, 0.2, 0.75]} pos={[0, 0.3, 0]} color={c.fabric2} radius={0.06} />
      <Box size={[0.8, 0.55, 0.16]} pos={[0, 0.6, -0.3]} color={c.fabric2} radius={0.07} />
      <Box size={[0.13, 0.3, 0.7]} pos={[-0.34, 0.5, 0]} color={c.fabric2} radius={0.06} />
      <Box size={[0.13, 0.3, 0.7]} pos={[0.34, 0.5, 0]} color={c.fabric2} radius={0.06} />
      {[[-0.32, -0.3], [0.32, -0.3], [-0.32, 0.3], [0.32, 0.3]].map((p) => <Leg key={p.join()} pos={p} h={0.2} color={c.wood} />)}
    </group>
  );
}
export function Bookshelf({ c }) {
  return (
    <group>
      <Box size={[0.85, 1.8, 0.32]} pos={[0, 0.9, 0]} color={c.wood} radius={0.02} />
      {[0.35, 0.75, 1.15, 1.55].map((y, i) => (
        <group key={y}>
          <Box size={[0.75, 0.3, 0.26]} pos={[0, y, 0.04]} color={c.wall2} radius={0.005} />
          {[-0.28, -0.18, -0.08, 0.12, 0.22].slice(0, 3 + (i % 3)).map((x, j) => (
            <Box key={x} size={[0.07, 0.24 - (j % 2) * 0.04, 0.2]} pos={[x, y - 0.02, 0.06]} color={[c.fabric, c.fabric2, c.pot, c.blanket][(i + j) % 4]} radius={0.005} />
          ))}
        </group>
      ))}
    </group>
  );
}
export function Bed({ c }) {
  return (
    <group>
      <Box size={[1.65, 0.28, 2.05]} pos={[0, 0.2, 0]} color={c.wood} radius={0.03} />
      <Box size={[1.55, 0.2, 1.95]} pos={[0, 0.44, 0.02]} color={c.linen} radius={0.08} />
      <Box size={[1.57, 0.08, 1.15]} pos={[0, 0.56, 0.42]} color={c.blanket} radius={0.04} />
      <Box size={[0.6, 0.14, 0.36]} pos={[-0.38, 0.6, -0.72]} color={c.linen} radius={0.07} />
      <Box size={[0.6, 0.14, 0.36]} pos={[0.38, 0.6, -0.72]} color={c.linen} radius={0.07} />
      <Box size={[1.75, 1.0, 0.1]} pos={[0, 0.55, -1.02]} color={c.wood} radius={0.04} />
    </group>
  );
}
export function Wardrobe({ c }) {
  return (
    <group>
      <Box size={[1.5, 2, 0.56]} pos={[0, 1.02, 0]} color={c.wall2} radius={0.02} />
      {[-0.5, 0, 0.5].map((x) => <Box key={x} size={[0.47, 1.88, 0.02]} pos={[x, 1.02, 0.285]} color={c.linen} radius={0.005} />)}
      {[-0.29, 0.21, 0.29].map((x) => <Box key={x} size={[0.02, 0.2, 0.03]} pos={[x, 1.05, 0.31]} color={c.dark} radius={0.005} />)}
    </group>
  );
}
export function Desk({ c, withChair = true }) {
  return (
    <group>
      <Box size={[1.2, 0.05, 0.6]} pos={[0, 0.74, 0]} color={c.wood} radius={0.02} />
      {[[-0.56, -0.26], [0.56, -0.26], [-0.56, 0.26], [0.56, 0.26]].map((p) => <Leg key={p.join()} pos={p} h={0.74} color={c.dark} />)}
      <Box size={[0.55, 0.34, 0.03]} pos={[0.1, 1.0, -0.18]} color={c.dark} radius={0.01} />
      <mesh position={[0.1, 0.8, -0.15]}><cylinderGeometry args={[0.02, 0.05, 0.08, 10]} /><meshStandardMaterial color={c.dark} /></mesh>
      <mesh position={[0.1, 1.0, -0.163]}><boxGeometry args={[0.52, 0.3, 0.01]} /><meshStandardMaterial color="#9fd4bb" emissive="#6fbf98" emissiveIntensity={0.4} /></mesh>
      {withChair && <group position={[0, 0, 0.55]}>
        <Box size={[0.5, 0.08, 0.48]} pos={[0, 0.48, 0]} color={c.dark} radius={0.04} />
        <Box size={[0.48, 0.55, 0.06]} pos={[0, 0.8, 0.22]} color={c.dark} radius={0.04} />
        <mesh position={[0, 0.24, 0]}><cylinderGeometry args={[0.025, 0.025, 0.44, 8]} /><meshStandardMaterial color={c.dark} /></mesh>
      </group>}
    </group>
  );
}


function Chair4({ c, color, h = 0.45 }) {
  return (
    <group>
      <Box size={[0.42, 0.05, 0.42]} pos={[0, h, 0]} color={color || c.wood} radius={0.02} />
      <Box size={[0.42, 0.42, 0.04]} pos={[0, h + 0.23, -0.19]} color={color || c.wood} radius={0.02} />
      {[[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]].map((p) => <Leg key={p.join()} pos={p} h={h} color={c.wood} />)}
    </group>
  );
}
export function DiningSet({ c }) {
  return (
    <group>
      <Box size={[1.8, 0.05, 0.9]} pos={[0, 0.74, 0]} color={c.wood} radius={0.02} />
      {[[-0.85, -0.4], [0.85, -0.4], [-0.85, 0.4], [0.85, 0.4]].map((p) => <Leg key={p.join()} pos={p} h={0.74} color={c.wood} />)}
      {[-0.55, 0, 0.55].map((x) => (
        <group key={x}>
          <group position={[x, 0, -0.62]}><Chair4 c={c} color={c.linen} /></group>
          <group position={[x, 0, 0.62]} rotation={[0, Math.PI, 0]}><Chair4 c={c} color={c.linen} /></group>
        </group>
      ))}
    </group>
  );
}
export function OfficeChair({ c }) {
  return (
    <group>
      <Box size={[0.52, 0.08, 0.5]} pos={[0, 0.48, 0]} color={c.dark} radius={0.04} />
      <Box size={[0.5, 0.6, 0.06]} pos={[0, 0.82, -0.22]} color={c.dark} radius={0.05} />
      <mesh position={[0, 0.25, 0]}><cylinderGeometry args={[0.025, 0.025, 0.46, 8]} /><meshStandardMaterial color={c.dark} metalness={0.5} /></mesh>
      {[0, 1, 2, 3, 4].map((i) => (
        <mesh key={i} position={[Math.cos((i / 5) * Math.PI * 2) * 0.22, 0.04, Math.sin((i / 5) * Math.PI * 2) * 0.22]} rotation={[0, -(i / 5) * Math.PI * 2, 0]}>
          <boxGeometry args={[0.3, 0.03, 0.04]} /><meshStandardMaterial color={c.dark} />
        </mesh>
      ))}
    </group>
  );
}
export function BanquetChair({ c }) {
  return <Chair4 c={c} color={c.fabric2} />;
}
export function RoundTable({ c, d = 1.83, h = 0.74 }) {
  return (
    <group>
      <mesh position={[0, h, 0]} castShadow receiveShadow><cylinderGeometry args={[d / 2, d / 2, 0.05, 40]} /><meshStandardMaterial color={c.linen} roughness={0.9} /></mesh>
      <mesh position={[0, h - 0.18, 0]}><cylinderGeometry args={[d / 2 + 0.01, d / 2 + 0.01, 0.34, 40, 1, true]} /><meshStandardMaterial color={c.linen} side={2} /></mesh>
      <mesh position={[0, h / 2, 0]}><cylinderGeometry args={[0.05, 0.05, h, 10]} /><meshStandardMaterial color={c.dark} /></mesh>
      <mesh position={[0, h + 0.1, 0]}><cylinderGeometry args={[0.06, 0.04, 0.16, 12]} /><meshStandardMaterial color={c.fabric2} /></mesh>
    </group>
  );
}
export function CocktailTable({ c }) {
  return <RoundTable c={c} d={0.6} h={1.1} />;
}
export function FilingCabinet({ c }) {
  return (
    <group>
      <Box size={[0.47, 1.3, 0.62]} pos={[0, 0.65, 0]} color="#8f9a94" radius={0.02} />
      {[0.22, 0.52, 0.82, 1.12].map((y) => <Box key={y} size={[0.14, 0.03, 0.03]} pos={[0, y, 0.32]} color={c.dark} radius={0.01} />)}
    </group>
  );
}
export function StageBackdrop({ c }) {
  return (
    <group>
      <Box size={[4.9, 2.4, 0.08]} pos={[0, 1.3, 0]} color={c.linen} radius={0.02} />
      <Box size={[4.9, 0.1, 0.6]} pos={[0, 0.05, 0]} color={c.wood} radius={0.02} />
      {[-2, -1, 0, 1, 2].map((x) => <mesh key={x} position={[x, 2.2, 0.08]}><sphereGeometry args={[0.1, 16, 16]} /><meshStandardMaterial color={c.fabric2} emissive={c.fabric2} emissiveIntensity={0.5} /></mesh>)}
    </group>
  );
}
export function Rug({ c }) {
  return <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[1.52, 2.44]} /><meshStandardMaterial color={c.rug} roughness={1} /></mesh>;
}

// Native footprint of each model in metres (x = width, z = depth), used to scale models to a real item's size.
export const MODELS = {
  sofa: { C: Sofa, w: 2.0, d: 0.9 },
  armchair: { C: Armchair, w: 0.8, d: 0.75 },
  bed: { C: Bed, w: 1.75, d: 2.1, dz: -0.02 },
  wardrobe: { C: Wardrobe, w: 1.5, d: 0.56 },
  coffee: { C: CoffeeTable, w: 1.05, d: 0.56 },
  dining: { C: DiningSet, w: 1.8, d: 1.7 },
  desk: { C: (p) => <Desk {...p} withChair={false} />, w: 1.2, d: 0.6 },
  officechair: { C: OfficeChair, w: 0.65, d: 0.65 },
  banquet: { C: BanquetChair, w: 0.45, d: 0.45 },
  roundtable: { C: RoundTable, w: 1.83, d: 1.83 },
  cocktail: { C: CocktailTable, w: 0.6, d: 0.6 },
  bookshelf: { C: Bookshelf, w: 0.85, d: 0.32 },
  filing: { C: FilingCabinet, w: 0.47, d: 0.62 },
  lamp: { C: FloorLamp, w: 0.44, d: 0.44 },
  backdrop: { C: StageBackdrop, w: 4.9, d: 0.6 },
  rug: { C: Rug, w: 1.52, d: 2.44 },
  plant: { C: Plant, w: 0.4, d: 0.4 },
};

// Picks a representative model for a catalogue item from its name and category.
export function modelFor(name = '', category = '') {
  const n = name.toLowerCase();
  if (/rug/.test(n)) return 'rug';
  if (/backdrop|stage/.test(n)) return 'backdrop';
  if (/cocktail/.test(n)) return 'cocktail';
  if (/round|banquet table/.test(n)) return 'roundtable';
  if (/dining/.test(n)) return 'dining';
  if (/coffee/.test(n)) return 'coffee';
  if (/conference|workstation/.test(n)) return 'dining';
  if (/wardrobe/.test(n)) return 'wardrobe';
  if (/bookshelf|shelf/.test(n)) return 'bookshelf';
  if (/filing|cabinet/.test(n)) return 'filing';
  if (/lamp/.test(n)) return 'lamp';
  if (/banquet|chiavari/.test(n)) return 'banquet';
  if (/office|mesh|ergonomic/.test(n)) return 'officechair';
  if (/armchair|accent/.test(n)) return 'armchair';
  const byCat = { Sofa: 'sofa', Bed: 'bed', Chair: 'armchair', Table: 'coffee', Desk: 'desk', Storage: 'wardrobe', Decor: 'lamp' };
  return byCat[category] || 'sofa';
}

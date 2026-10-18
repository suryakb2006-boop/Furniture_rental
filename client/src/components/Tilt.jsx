import { useRef } from 'react';
import { motion, useMotionTemplate, useMotionValue, useReducedMotion, useSpring, useTransform } from 'motion/react';
import { cx } from './ui.jsx';

// 3D tilt toward the pointer with a soft light glare, for cards.
export default function Tilt({ children, className, max = 8 }) {
  const ref = useRef(null);
  const reduce = useReducedMotion();
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const rx = useSpring(useTransform(py, [0, 1], [max, -max]), { stiffness: 250, damping: 22 });
  const ry = useSpring(useTransform(px, [0, 1], [-max, max]), { stiffness: 250, damping: 22 });
  const gx = useTransform(px, (v) => `${v * 100}%`);
  const gy = useTransform(py, (v) => `${v * 100}%`);
  const glare = useMotionTemplate`radial-gradient(420px circle at ${gx} ${gy}, rgb(255 255 255 / 0.16), transparent 45%)`;
  const move = (e) => {
    if (reduce || e.pointerType === 'touch' || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    px.set((e.clientX - r.left) / r.width);
    py.set((e.clientY - r.top) / r.height);
  };
  const leave = () => { px.set(0.5); py.set(0.5); };
  return (
    <motion.div ref={ref} onPointerMove={move} onPointerLeave={leave} style={{ rotateX: rx, rotateY: ry, transformPerspective: 900 }} className={cx('group/tilt relative [transform-style:preserve-3d]', className)}>
      {children}
      {!reduce && <motion.div aria-hidden="true" style={{ background: glare }} className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-300 group-hover/tilt:opacity-100" />}
    </motion.div>
  );
}

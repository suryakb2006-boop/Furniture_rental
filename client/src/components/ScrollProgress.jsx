import { motion, useScroll, useSpring } from 'motion/react';

// Thin reading-progress bar along the top edge.
export default function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 200, damping: 30, restDelta: 0.001 });
  return <motion.div aria-hidden="true" style={{ scaleX }} className="scroll-progress fixed inset-x-0 top-0 z-[70] h-0.5 origin-left bg-accent" />;
}

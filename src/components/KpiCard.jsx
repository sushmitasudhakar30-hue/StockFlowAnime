import { motion, useMotionValue, useSpring, useTransform, useMotionTemplate } from 'framer-motion';
import { useCountUp, formatINR, formatNumber } from '../utils/hooks';
import { ease } from '../motion/variants';
import './KpiCard.css';

export default function KpiCard({ label, value, type = 'number', icon, variant = 'primary', delay = 0 }) {
  const [displayValue, ref] = useCountUp(type === 'currency' ? Math.round(value) : value);

  // Pointer-tracked 3D tilt (±8°) + specular glare, spring-smoothed
  const mx = useMotionValue(0.5);
  const my = useMotionValue(0.5);
  const sx = useSpring(mx, { stiffness: 180, damping: 18 });
  const sy = useSpring(my, { stiffness: 180, damping: 18 });
  const rotateY = useTransform(sx, [0, 1], [-8, 8]);
  const rotateX = useTransform(sy, [0, 1], [8, -8]);
  const gx = useTransform(sx, (v) => v * 100);
  const gy = useTransform(sy, (v) => v * 100);
  const glare = useMotionTemplate`radial-gradient(220px circle at ${gx}% ${gy}%, rgba(255,255,255,0.14), transparent 62%)`;
  const onMove = (e) => {
    if (e.pointerType !== 'mouse') return;
    const r = e.currentTarget.getBoundingClientRect();
    mx.set((e.clientX - r.left) / r.width);
    my.set((e.clientY - r.top) / r.height);
  };
  const onLeave = () => { mx.set(0.5); my.set(0.5); };

  const formatted = type === 'currency'
    ? formatINR(displayValue)
    : formatNumber(displayValue);

  return (
    <motion.div
      ref={ref}
      style={{ rotateX, rotateY, transformPerspective: 900 }}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      className={`kpi-card kpi-${variant}`}
      initial={{ opacity: 0, y: 22, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.55, ease, delay: delay / 1000 }}
      whileHover={{ y: -5, transition: { type: 'spring', stiffness: 400, damping: 22 } }}
      whileTap={{ scale: 0.98 }}
    >
      <motion.div className="kpi-glare" style={{ backgroundImage: glare }} />
      <motion.div
        className="kpi-icon"
        initial={{ scale: 0.5, rotate: -20, opacity: 0 }}
        animate={{ scale: 1, rotate: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 16, delay: delay / 1000 + 0.15 }}
        whileHover={{ rotate: 8, scale: 1.08 }}
      >
        {icon}
      </motion.div>
      <div className="kpi-content">
        <span className="kpi-label">{label}</span>
        <span className="kpi-value">{formatted}</span>
      </div>
    </motion.div>
  );
}

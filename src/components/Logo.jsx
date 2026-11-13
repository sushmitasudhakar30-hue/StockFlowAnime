import { useId } from 'react';
import { motion } from 'framer-motion';
import { ease } from '../motion/variants';
import './Logo.css';

/* StockFlow brand mark — an isometric stock cube with a flow line running across its faces.
   <Logo />                       mark + wordmark, animated entrance
   <Logo size={44} variant="light" />   white wordmark (for dark gradient panels)
   <Logo animated={false} />      static (invoices, print)
   <LogoMark />                   mark only */

const FACES = {
  top:   'M24 3 L42 13.5 L24 24 L6 13.5 Z',
  left:  'M6 13.5 L24 24 L24 45 L6 34.5 Z',
  right: 'M42 13.5 L42 34.5 L24 45 L24 24 Z',
};
const FLOW = 'M9.5 31.5 C15 35 19 27 24 30 S33 30 38.5 22';

export function LogoMark({ size = 28, animated = true, hoverSpin = true }) {
  const uid = useId().replace(/:/g, '');
  const ids = { top: `sf-top-${uid}`, left: `sf-left-${uid}`, right: `sf-right-${uid}` };

  const face = (key, delay) => ({
    initial: animated ? { opacity: 0, y: key === 'top' ? -8 : 6 } : false,
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.55, ease, delay },
  });

  return (
    <motion.span
      className="sf-logo-mark"
      style={{ width: size, height: size }}
      whileHover={animated && hoverSpin ? { rotateY: 360 } : undefined}
      transition={{ duration: 0.9, ease }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 48 48" width={size} height={size} fill="none">
        <defs>
          <linearGradient id={ids.top} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#67e8f9" /><stop offset="1" stopColor="#a5b4fc" />
          </linearGradient>
          <linearGradient id={ids.left} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#6366f1" /><stop offset="1" stopColor="#3730a3" />
          </linearGradient>
          <linearGradient id={ids.right} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#8b5cf6" /><stop offset="1" stopColor="#22d3ee" />
          </linearGradient>
        </defs>
        <motion.path d={FACES.left}  fill={`url(#${ids.left})`}  {...face('left', 0)} />
        <motion.path d={FACES.right} fill={`url(#${ids.right})`} {...face('right', 0.08)} />
        <motion.path d={FACES.top}   fill={`url(#${ids.top})`}   {...face('top', 0.16)} />
        <motion.path
          d={FLOW} stroke="#fff" strokeWidth="2.6" strokeLinecap="round"
          initial={animated ? { pathLength: 0, opacity: 0 } : false}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 0.7, ease, delay: 0.4 }}
        />
        <path d="M24 3 L42 13.5 L42 34.5 L24 45 L6 34.5 L6 13.5 Z" stroke="rgba(255,255,255,.22)" strokeWidth=".6" strokeLinejoin="round" />
      </svg>
    </motion.span>
  );
}

export default function Logo({ size = 28, variant = 'gradient', animated = true, wordmark = true, className = '' }) {
  return (
    <span className={`sf-logo sf-logo-${variant} ${className}`.trim()} style={{ '--sf-size': `${size}px` }}>
      <LogoMark size={size} animated={animated} />
      {wordmark && (
        animated ? (
          <motion.span
            className="sf-logo-word"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3, duration: 0.45, ease }}
          >
            Stock<b>Flow</b>
          </motion.span>
        ) : (
          <span className="sf-logo-word">Stock<b>Flow</b></span>
        )
      )}
    </span>
  );
}

import { lazy, Suspense, useMemo } from 'react';
import { useReducedMotion } from 'framer-motion';
import { LogoMark } from '../Logo';

// Three.js lives in its own chunk — it is never part of the main bundle.
const WarehouseScene = lazy(() => import('./WarehouseScene'));

const hasWebGL = () => {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch { return false; }
};

export default function HeroScene() {
  const reduce = useReducedMotion();
  const ok = useMemo(() => hasWebGL() && window.matchMedia('(min-width: 901px)').matches, []);

  if (reduce || !ok) {
    return (
      <div className="login-3d login-3d-fallback" aria-hidden="true">
        <LogoMark size={150} animated={false} hoverSpin={false} />
      </div>
    );
  }
  return <Suspense fallback={null}><WarehouseScene /></Suspense>;
}

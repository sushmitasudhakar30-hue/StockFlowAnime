/* Login hero — an isometric warehouse of instanced rounded crates with a glowing "flow line"
   (the same idea as the logo). Lazy-loaded; pauses when off-screen or the tab is hidden. */
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Canvas, extend, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

extend({ RoundedBoxGeometry });

const easeOutExpo = (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));
const PALETTE = ['#6366f1', '#8b5cf6', '#22d3ee', '#a5b4fc'].map((c) => new THREE.Color(c));
const CAM = [7, 6, 9];

function buildLayout() {
  const items = [];
  for (let x = -2; x <= 2; x++) {
    for (let z = -2; z <= 2; z++) {
      items.push({
        x: x * 1.5,
        z: z * 1.5,
        h: 0.6 + ((Math.abs(x * 7 + z * 13) % 5) * 0.28),
        color: PALETTE[(x + z + 10) % 4],
        delay: (Math.abs(x) + Math.abs(z)) * 0.08,
      });
    }
  }
  return items;
}

function Crates() {
  const mesh = useRef();
  const items = useMemo(buildLayout, []);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const clock = useRef(0);
  const done = useRef(false);

  const place = (time) => {
    items.forEach((it, i) => {
      const p = easeOutExpo(THREE.MathUtils.clamp((time - it.delay) / 0.9, 0, 1)); // staggered drop-in
      dummy.position.set(it.x, it.h / 2 + (1 - p) * 7, it.z);
      dummy.scale.set(1, it.h, 1);
      dummy.updateMatrix();
      mesh.current.setMatrixAt(i, dummy.matrix);
    });
    mesh.current.instanceMatrix.needsUpdate = true;
  };

  useLayoutEffect(() => {
    items.forEach((it, i) => mesh.current.setColorAt(i, it.color));
    mesh.current.instanceColor.needsUpdate = true;
    place(0);
  }); // eslint-disable-line react-hooks/exhaustive-deps

  useFrame((_, dt) => {
    if (done.current) return;
    clock.current += dt;
    place(clock.current);
    if (clock.current > 2.4) done.current = true; // stop touching matrices once settled
  });

  return (
    <instancedMesh ref={mesh} args={[null, null, items.length]} frustumCulled={false}>
      <roundedBoxGeometry args={[1.1, 1, 1.1, 3, 0.09]} />
      <meshStandardMaterial roughness={0.35} metalness={0.25} />
    </instancedMesh>
  );
}

function FlowLine() {
  const pulse = useRef();
  const light = useRef();
  const curve = useMemo(
    () =>
      new THREE.CatmullRomCurve3(
        [[-4.8, 2.4, 3.8], [-2, 2.7, 1], [0, 2.3, 0], [2, 2.8, -1.6], [4.8, 2.4, -3.8]].map((p) => new THREE.Vector3(...p))
      ),
    []
  );
  useFrame(({ clock }) => {
    const p = curve.getPointAt((clock.elapsedTime * 0.1) % 1);
    pulse.current.position.copy(p);
    light.current.position.copy(p);
  });
  return (
    <group>
      <mesh>
        <tubeGeometry args={[curve, 120, 0.04, 8, false]} />
        <meshBasicMaterial color="#67e8f9" toneMapped={false} transparent opacity={0.85} />
      </mesh>
      <mesh ref={pulse}>
        <sphereGeometry args={[0.16, 20, 20]} />
        <meshBasicMaterial color="#ffffff" toneMapped={false} />
      </mesh>
      <pointLight ref={light} color="#22d3ee" intensity={14} distance={6} />
    </group>
  );
}

function Rig({ children }) {
  const group = useRef();
  const pointer = useRef({ x: 0, y: 0 });
  const t = useRef(0);
  const { camera } = useThree();

  useEffect(() => {
    const move = (e) => {
      pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener('pointermove', move);
    return () => window.removeEventListener('pointermove', move);
  }, []);

  useFrame((_, dt) => {
    t.current += dt;
    const k = easeOutExpo(Math.min(t.current / 1.2, 1)); // dolly-in 1.2s
    const dist = 1.7 - 0.7 * k;
    const f = k < 1 ? 1 : Math.min(1, dt * 3);           // damped parallax afterwards
    camera.position.x += (CAM[0] * dist + pointer.current.x * 0.9 - camera.position.x) * f;
    camera.position.y += (CAM[1] * dist - pointer.current.y * 0.6 - camera.position.y) * f;
    camera.position.z += (CAM[2] * dist - camera.position.z) * f;
    camera.lookAt(0, 0.8, 0);
    group.current.rotation.y += dt * 0.1;
  });
  return <group ref={group}>{children}</group>;
}

export default function WarehouseScene() {
  const wrap = useRef(null);
  const [inView, setInView] = useState(true);
  const [tabOn, setTabOn] = useState(true);

  useEffect(() => {
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting));
    io.observe(wrap.current);
    const vis = () => setTabOn(!document.hidden);
    document.addEventListener('visibilitychange', vis);
    return () => { io.disconnect(); document.removeEventListener('visibilitychange', vis); };
  }, []);

  return (
    <div ref={wrap} className="login-3d" aria-hidden="true">
      <Canvas
        dpr={[1, 1.75]}
        frameloop={inView && tabOn ? 'always' : 'never'}
        camera={{ position: [CAM[0] * 1.7, CAM[1] * 1.7, CAM[2] * 1.7], fov: 32 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      >
        <fog attach="fog" args={['#0b1020', 12, 28]} />
        <ambientLight intensity={0.55} />
        <directionalLight position={[6, 9, 5]} intensity={1.6} color="#e0e7ff" />
        <pointLight position={[-6, 3, -6]} intensity={30} color="#8b5cf6" distance={20} />
        <Rig>
          <Crates />
          <FlowLine />
          <gridHelper args={[24, 24, '#3b3f8f', '#1c2250']} position={[0, 0, 0]} />
        </Rig>
      </Canvas>
    </div>
  );
}

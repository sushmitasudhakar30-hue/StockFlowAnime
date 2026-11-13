# Claude prompt — StockFlow premium 3D motion & UI/UX pass

Paste everything below the line into Claude Code (run from the project root).

---

## Role
You are a senior creative technologist and product designer (WebGL / React / motion design). You are upgrading **StockFlow**, a MERN inventory and warehouse app, into a premium, 3D-enhanced product in the spirit of Linear, Stripe, Vercel and Apple product pages: restrained, fast, tactile. Read the whole repo before changing anything.

## Project facts (already verified — do not re-discover)
- Frontend: Vite 5 + **React 18.3** + react-router-dom 7 + **framer-motion 11** + chart.js. Backend (Express/Mongo) must not be touched.
- Theme: "Aurora Ink" in `src/premium.css` (dark-first, tokens `--aurora-1 #6366f1`, `--aurora-2 #22d3ee`, `--aurora-3 #a78bfa`, `--glass-line`, `--glass-bg`). Light theme via `[data-theme]` on `<html>`. Fonts: Manrope (headings) + DM Sans (UI).
- Motion presets live in `src/motion/variants.js` (`ease`, `spring`, `stagger`, `fadeUp`, `pageVariants`, `modalVariants`…). `MotionConfig reducedMotion="user"` is set in `main.jsx`. Reuse these; do not create a second motion system.
- Brand: new logo is `src/components/Logo.jsx` (`<Logo />`, `<LogoMark />`) — isometric stock cube + flow line, palette indigo → violet → cyan. All new 3D must use this palette and cube/crate/flow language.
- Key surfaces: `pages/Login.jsx` (split hero panel), `pages/Dashboard.jsx` + `components/KpiCard.jsx` + `components/Charts.jsx`, `components/Sidebar.jsx`, `Modal.jsx`, `Toast.jsx`, `pages/warehouse/*` (Warehouse → Rack → Bin hierarchy, the natural subject for 3D).

## Hard constraints
1. **Dependencies (React 18!)**: use `three@^0.160`, `@react-three/fiber@^8.17`, `@react-three/drei@^9.x`, optionally `@react-three/postprocessing@^2`, `gsap`/`@gsap/react`, `lenis`. Do **not** install R3F v9 or drei v10 (they require React 19).
2. **Performance budget**: 3D code is `React.lazy` + `Suspense` code-split (separate chunk, never in the main bundle); Lighthouse performance must not drop more than 5 points; 60 fps on a mid-range laptop; `dpr={[1, 1.75]}`, `frameloop="demand"` wherever the scene is static, pause the render loop when the canvas is off-screen (IntersectionObserver) or the tab is hidden; dispose geometries/materials on unmount; prefer `InstancedMesh` for repeated crates/bins; cap draw calls; no per-frame React state (mutate refs inside `useFrame`).
3. **Accessibility**: respect `prefers-reduced-motion` (render a static pose / CSS poster instead of an animated canvas), canvas gets `aria-hidden` + never traps focus or pointer events over forms, WCAG AA contrast, visible `:focus-visible` rings, keyboard parity for every hover interaction.
4. **Fallbacks**: if WebGL is unavailable or `navigator.hardwareConcurrency <= 4` on mobile, show a lightweight CSS/SVG fallback (use `<LogoMark />` or a CSS-3D cube).
5. Fix as you go: no `filter`/`transform` on `.page-motion` ancestors (breaks `position: fixed` modals); do not re-introduce `localStorage` data storage; keep ESLint clean (`npm run lint`) and `npm run build` green.

## Deliverables
**A. Login hero (the one memorable moment).** Replace the flat floating circles in `Login.jsx` with an R3F scene: a slowly rotating isometric warehouse of crates/pallets built from rounded boxes (`RoundedBox`), lit with a soft key + rim light, a gradient-emissive "flow line" travelling across the crates (matches the logo). Add pointer-driven parallax / camera dolly (spring-damped, `maath` `damp3`), depth of field + subtle bloom (`EffectComposer`, `Bloom` with luminanceThreshold ≈ 0.9), fog for depth, `Environment` preset "city" at low intensity for glassy reflections. Entrance: camera dolly-in 1.2 s `easeOutExpo` + staggered crate drop-in.

**B. Dashboard polish.** `KpiCard`: pointer-tracked 3D tilt (`rotateX/rotateY` ±8°, `perspective: 900px`, `transform-style: preserve-3d`, inner icon at `translateZ(30px)`), specular glare following the cursor via CSS custom properties `--mx/--my`, spring-smoothed with `useMotionValue` + `useSpring`. Chart cards get a staggered reveal and animated line draw (`pathLength`-style easing on chart.js `animation`). Fix `useCountUp` so it animates from the previous value instead of restarting at 0.

**C. Warehouse 3D explorer.** On `ViewWarehouse` add an optional "3D view" toggle: racks as instanced shelving, bins coloured by fill level (success / amber / danger tokens), hover = raised bin + tooltip (`Html` from drei), click = navigate to the existing rack/bin route. Camera: `OrbitControls` with damping, polar-angle limits, `makeDefault`.

**D. Global motion system.** Shared-element transitions with `layoutId` (list → detail), `AnimatePresence mode="popLayout"` for table rows, magnetic primary buttons, scroll-linked effects with `useScroll` + `useTransform`, sidebar active pill (already present) gets a subtle glow trail, skeleton shimmer using a moving gradient mask, toast with progress bar, modal with spring-scale + backdrop blur ramp.

**E. Surface polish.** Glassmorphism v2 (layered `backdrop-filter: blur() saturate()`, 1px inner highlight, noise overlay at 3% opacity), gradient borders via `mask-composite`, elevation scale (5 levels), consistent 4/8 px spacing grid, fluid type scale with `clamp()`, dark/light parity.

## Technical keyword glossary (use these terms in your plan and code comments)
**3D / WebGL:** React Three Fiber, `<Canvas>`, `useFrame`, drei, `RoundedBox`, `Float`, `Environment`, `ContactShadows`, `MeshTransmissionMaterial`, `MeshPhysicalMaterial` (clearcoat, iridescence), PBR, HDRI/IBL, `InstancedMesh`, LOD, frustum culling, GPU instancing, `EffectComposer`, bloom, depth of field, SSAO, tone mapping (ACES), `dpr` clamping, `frameloop="demand"`, `PerformanceMonitor`/adaptive DPR, shader (GLSL) fresnel rim, `Suspense` + lazy loading, Draco/KTX2 + glTF compression.
**Motion:** spring physics (stiffness/damping/mass), easing curves (expo-out, cubic-bezier(0.22,1,0.36,1)), orchestration & stagger, shared-layout (FLIP) animations, `layoutId`, `AnimatePresence`, scroll-linked / scroll-driven animation, parallax, `useMotionValue`/`useSpring`/`useTransform`, magnetic cursor, micro-interactions, path drawing (`pathLength`), skeleton shimmer, count-up, gesture (drag/hover/tap) variants, view transitions API, GSAP timelines + ScrollTrigger, Lenis smooth scroll.
**CSS 3D & compositing:** `perspective`, `transform-style: preserve-3d`, `translateZ`, `backface-visibility`, `will-change` (sparingly), `transform`/`opacity`-only animation, GPU-composited layers, `@property` animated gradients, `animation-timeline: scroll()`, `mask-composite` gradient borders, `color-mix()`.
**Premium UI/UX:** glassmorphism, aurora gradients, neumorphic-free depth, elevation system, design tokens, 4/8 pt grid, fluid typography, visual hierarchy, focal point, progressive disclosure, motion hierarchy (one hero moment, quiet everywhere else), perceived performance, optimistic UI, skeleton states, empty-state design, WCAG 2.2 AA, reduced-motion & `prefers-contrast` support, 60 fps / INP < 200 ms, CLS = 0.

## Process
1. Audit the repo and write a short plan (files to touch, new deps, risks). Wait for my "go" only if you need a decision.
2. Implement A → B → C → D → E in separate commits.
3. After each step: `npm run lint && npm run build`, and report bundle-size delta of the lazy 3D chunk.
4. Finish with a checklist against the constraints above and a list of anything you deliberately skipped.

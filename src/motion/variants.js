/* Shared Framer Motion presets — keep every animation in the app consistent. */

export const ease = [0.22, 1, 0.36, 1]; // smooth "expo out"
export const spring = { type: 'spring', stiffness: 380, damping: 30 };

/* A parent that reveals its children one after another */
export const stagger = (gap = 0.07, delay = 0) => ({
  hidden: {},
  show: { transition: { staggerChildren: gap, delayChildren: delay } },
});

/* A child that fades up */
export const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease } },
};

export const fadeIn = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.4, ease } },
};

export const slideInLeft = {
  hidden: { opacity: 0, x: -14 },
  show: { opacity: 1, x: 0, transition: { duration: 0.4, ease } },
};

/* Page-to-page route transition.
   No `filter` here on purpose: a filter on this wrapper (even blur(0px)) makes it the containing block
   for position:fixed children, which pushes every modal off-centre. */
export const pageVariants = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.38, ease } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.18 } },
};

/* Dropdowns / popovers */
export const popVariants = {
  hidden: { opacity: 0, y: -6, scale: 0.96 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.18, ease } },
  exit: { opacity: 0, y: -6, scale: 0.97, transition: { duration: 0.12 } },
};

/* Modal */
export const overlayVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
};
export const modalVariants = {
  hidden: { opacity: 0, scale: 0.94, y: 18 },
  show: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring', stiffness: 380, damping: 30 } },
  exit: { opacity: 0, scale: 0.97, y: 10, transition: { duration: 0.14 } },
};

/* Toast */
export const toastVariants = {
  hidden: { opacity: 0, x: 60, scale: 0.95 },
  show: { opacity: 1, x: 0, scale: 1, transition: { type: 'spring', stiffness: 420, damping: 32 } },
  exit: { opacity: 0, x: 60, scale: 0.95, transition: { duration: 0.18 } },
};

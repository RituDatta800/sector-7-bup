/**
 * The motion vocabulary for the console.
 *
 * One rule holds the sequence together: the chart never unmounts. Inputs and
 * results swap underneath it inside an `AnimatePresence mode="wait"`, while the
 * chart itself only ever animates its height and a short rotateX swing — so the
 * reader's eye stays locked to the data through the whole transition.
 */

import type { Transition, Variants } from 'framer-motion';

/** Stage of the optimize flow. The chart's geometry is derived from this. */
export type Stage = 'compose' | 'solving' | 'result';

export const SPRING_SOFT: Transition = {
  type: 'spring',
  stiffness: 220,
  damping: 30,
  mass: 0.9,
};

export const SPRING_SWING: Transition = {
  type: 'spring',
  stiffness: 140,
  damping: 18,
  mass: 1.1,
};

export const EASE_OUT: Transition = { duration: 0.42, ease: [0.22, 1, 0.36, 1] };
export const EASE_IN: Transition = { duration: 0.3, ease: [0.55, 0, 1, 0.45] };

/* -------------------------------------------------------------------------- */
/* Panel swap                                                                  */
/* -------------------------------------------------------------------------- */

/** Wraps a whole stage section. Children stagger in behind it. */
export const sectionVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.05, duration: 0.2 },
  },
  exit: {
    opacity: 0,
    transition: { staggerChildren: 0.03, staggerDirection: -1, duration: 0.24 },
  },
};

/**
 * A step in the input stack. Steps arrive in order from below and leave
 * downward together — the "slide away" that clears the stage for the chart to
 * rise into.
 */
export const stackStepVariants: Variants = {
  hidden: { opacity: 0, y: 34, scale: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    filter: 'blur(0px)',
    transition: SPRING_SOFT,
  },
  exit: {
    opacity: 0,
    y: 60,
    scale: 0.95,
    filter: 'blur(5px)',
    transition: { duration: 0.36, ease: [0.55, 0, 1, 0.45] },
  },
};

/** Lift applied to a step card while the pointer is over it. */
export const CARD_HOVER = { y: -3, transition: { type: 'spring', stiffness: 380, damping: 26 } } as const;

/** Swap between the hourly-grid and JSON editors inside step 1. */
export const tabSwapVariants: Variants = {
  hidden: { opacity: 0, x: 12 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.26, ease: [0.22, 1, 0.36, 1] } },
  exit: { opacity: 0, x: -12, transition: { duration: 0.16, ease: [0.55, 0, 1, 0.45] } },
};

/** Generic reveal for result cards, table rows and directive entries. */
export const revealVariants: Variants = {
  hidden: { opacity: 0, y: 22, scale: 0.985 },
  visible: { opacity: 1, y: 0, scale: 1, transition: SPRING_SOFT },
  exit: { opacity: 0, y: -14, scale: 0.99, transition: EASE_IN },
};

/** Numbers and short labels that should arrive a beat after their card. */
export const fadeUpVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.34, ease: [0.22, 1, 0.36, 1] } },
  exit: { opacity: 0, transition: { duration: 0.16 } },
};

/* -------------------------------------------------------------------------- */
/* Chart geometry                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Plot heights per stage. `compose` is the browsing height; the two solved
 * stages are the pinned, compact header height the chart swings up into.
 */
export const CHART_PLOT_HEIGHT: Record<Stage, number> = {
  compose: 384,
  solving: 300,
  result: 300,
};

/** Rotation keyframes for the swing. Zero when the user prefers reduced motion. */
export const SWING_KEYFRAMES = {
  rotateX: [0, -9, 1.5, 0],
  y: [0, -10, 2, 0],
} as const;

export const swingTransition: Transition = {
  duration: 0.85,
  times: [0, 0.4, 0.74, 1],
  ease: [0.22, 1, 0.36, 1],
};

/** Collapses every motion value to its resting state for reduced-motion users. */
export const STILL: Transition = { duration: 0 };

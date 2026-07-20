import type { Transition, Variants } from "motion/react"

/**
 * Shared animation system for the dashboard.
 * Every variant factory takes `reduced` (from useReducedMotion()) and
 * collapses to a near-instant, transform-free transition when true.
 */

export const EASE_PREMIUM: Transition["ease"] = [0.16, 1, 0.3, 1]
export const EASE_REVEAL: Transition["ease"] = [0.65, 0, 0.35, 1]

const REDUCED_TRANSITION: Transition = { duration: 0.01 }

type Reduced = boolean | null

// ---------------------------------------------------------------------------
// Sidebar
// ---------------------------------------------------------------------------

export function sidebarContainer(reduced: Reduced): Variants {
  return {
    hidden: { opacity: 0, x: reduced ? 0 : -16 },
    show: {
      opacity: 1,
      x: 0,
      transition: reduced
        ? REDUCED_TRANSITION
        : {
            duration: 0.3,
            ease: EASE_PREMIUM,
            delayChildren: 0.1,
            staggerChildren: 0.055,
          },
    },
  }
}

export function sidebarItem(reduced: Reduced): Variants {
  return {
    hidden: { opacity: 0, x: reduced ? 0 : -8 },
    show: {
      opacity: 1,
      x: 0,
      transition: reduced
        ? REDUCED_TRANSITION
        : { duration: 0.25, ease: EASE_PREMIUM },
    },
  }
}

// ---------------------------------------------------------------------------
// Header
// ---------------------------------------------------------------------------

export function pageHeader(reduced: Reduced, delay = 0.25): Variants {
  return {
    hidden: { opacity: 0, x: reduced ? 0 : -14 },
    show: {
      opacity: 1,
      x: 0,
      transition: reduced
        ? REDUCED_TRANSITION
        : { duration: 0.3, delay, ease: EASE_PREMIUM },
    },
  }
}

// ---------------------------------------------------------------------------
// Metric cards
// ---------------------------------------------------------------------------

export function cardsContainer(reduced: Reduced, delay = 0.35): Variants {
  return {
    hidden: {},
    show: {
      transition: reduced
        ? REDUCED_TRANSITION
        : { delayChildren: delay, staggerChildren: 0.1 },
    },
  }
}

export function metricCard(reduced: Reduced): Variants {
  return {
    hidden: { opacity: 0, y: reduced ? 0 : 16, scale: reduced ? 1 : 0.98 },
    show: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: reduced
        ? REDUCED_TRANSITION
        : { duration: 0.4, ease: EASE_PREMIUM },
    },
  }
}

// ---------------------------------------------------------------------------
// Chart
// ---------------------------------------------------------------------------

export function chartReveal(reduced: Reduced, delay = 0.75): Variants {
  return {
    hidden: {
      opacity: 0,
      clipPath: reduced ? "inset(0 0% 0 0)" : "inset(0 100% 0 0)",
    },
    show: {
      opacity: 1,
      clipPath: "inset(0 0% 0 0)",
      transition: reduced
        ? REDUCED_TRANSITION
        : { duration: 0.45, delay, ease: EASE_REVEAL },
    },
  }
}

// ---------------------------------------------------------------------------
// Tabs / filters / table
// ---------------------------------------------------------------------------

export function tabsContainer(reduced: Reduced, delay = 0.95): Variants {
  return {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: reduced
        ? REDUCED_TRANSITION
        : { duration: 0.35, delay, ease: "easeOut" },
    },
  }
}

export function tableContainer(reduced: Reduced, delay = 1.05): Variants {
  return {
    hidden: {},
    show: {
      transition: reduced
        ? REDUCED_TRANSITION
        : { delayChildren: delay, staggerChildren: 0.035 },
    },
  }
}

/**
 * Opacity-only by design: table rows carry dnd-kit's own `transform` style
 * for drag reordering, and Motion takes ownership of `transform` for any
 * animated x/y/scale value. Animating y here would fight dnd-kit's
 * positioning once dragging starts, so only opacity is animated.
 */
export function tableRow(reduced: Reduced): Variants {
  return {
    hidden: { opacity: reduced ? 1 : 0 },
    show: {
      opacity: 1,
      transition: reduced
        ? REDUCED_TRANSITION
        : { duration: 0.25, ease: "easeOut" },
    },
  }
}

// ---------------------------------------------------------------------------
// Generic
// ---------------------------------------------------------------------------

export function fadeIn(reduced: Reduced, delay = 0): Variants {
  return {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: reduced
        ? REDUCED_TRANSITION
        : { duration: 0.3, delay, ease: "easeOut" },
    },
  }
}

export function scaleIn(reduced: Reduced, delay = 0): Variants {
  return {
    hidden: { opacity: 0, scale: reduced ? 1 : 0.96 },
    show: {
      opacity: 1,
      scale: 1,
      transition: reduced
        ? REDUCED_TRANSITION
        : { duration: 0.25, delay, ease: EASE_PREMIUM },
    },
  }
}

// ---------------------------------------------------------------------------
// Hover / tap micro-interaction presets (used with whileHover / whileTap)
// ---------------------------------------------------------------------------

export const hoverLift = { y: -3 }
export const hoverNudge = { x: 2 }
export const hoverScaleSm = { scale: 1.02 }
export const hoverScaleXs = { scale: 1.01 }
export const tapScale = { scale: 0.97 }
export const tapScaleSm = { scale: 0.96 }

export function microTap(reduced: Reduced): Transition {
  return reduced ? { duration: 0 } : { duration: 0.18 }
}

// ---------------------------------------------------------------------------
// Login
// ---------------------------------------------------------------------------

export function loginLogo(reduced: Reduced): Variants {
  return {
    hidden: { opacity: 0, scale: reduced ? 1 : 0.7, y: reduced ? 0 : -8 },
    show: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: reduced
        ? REDUCED_TRANSITION
        : { duration: 0.4, ease: EASE_PREMIUM },
    },
  }
}

export function loginCard(reduced: Reduced, delay = 0.1): Variants {
  return {
    hidden: { opacity: 0, y: reduced ? 0 : 20, scale: reduced ? 1 : 0.98 },
    show: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: reduced
        ? REDUCED_TRANSITION
        : { duration: 0.45, delay, ease: EASE_PREMIUM },
    },
  }
}

export function loginFields(reduced: Reduced, delay = 0.3): Variants {
  return {
    hidden: {},
    show: {
      transition: reduced
        ? REDUCED_TRANSITION
        : { delayChildren: delay, staggerChildren: 0.07 },
    },
  }
}

export function loginField(reduced: Reduced): Variants {
  return {
    hidden: { opacity: 0, y: reduced ? 0 : 10 },
    show: {
      opacity: 1,
      y: 0,
      transition: reduced
        ? REDUCED_TRANSITION
        : { duration: 0.3, ease: EASE_PREMIUM },
    },
  }
}

// ---------------------------------------------------------------------------
// Equipe page (standalone) — rows sweep in from the left, distinct from the
// dashboard table's opacity-only stagger. Only `opacity`/`transform` are
// animated (no `filter`) — blur is expensive to rasterize across many
// full-width rows at once and visibly janks the page on pagination.
// ---------------------------------------------------------------------------

export function teamToolbar(reduced: Reduced, delay = 0.05): Variants {
  return {
    hidden: { opacity: 0, y: reduced ? 0 : -12 },
    show: {
      opacity: 1,
      y: 0,
      transition: reduced
        ? REDUCED_TRANSITION
        : { duration: 0.35, delay, ease: EASE_PREMIUM },
    },
  }
}

export function teamTableContainer(reduced: Reduced, delay = 0.15): Variants {
  return {
    hidden: {},
    show: {
      transition: reduced
        ? REDUCED_TRANSITION
        : { delayChildren: delay, staggerChildren: 0.03 },
    },
  }
}

export function teamTableRow(reduced: Reduced): Variants {
  return {
    hidden: { opacity: 0, x: reduced ? 0 : -18 },
    show: {
      opacity: 1,
      x: 0,
      transition: reduced
        ? REDUCED_TRANSITION
        : { duration: 0.3, ease: EASE_PREMIUM },
    },
  }
}

// ---------------------------------------------------------------------------
// Ticket list & chat
// ---------------------------------------------------------------------------

export function listContainer(reduced: Reduced, delay = 0.1): Variants {
  return {
    hidden: {},
    show: {
      transition: reduced
        ? REDUCED_TRANSITION
        : { delayChildren: delay, staggerChildren: 0.04 },
    },
  }
}

export function listItem(reduced: Reduced): Variants {
  return {
    hidden: { opacity: 0, y: reduced ? 0 : 10 },
    show: {
      opacity: 1,
      y: 0,
      transition: reduced
        ? REDUCED_TRANSITION
        : { duration: 0.25, ease: "easeOut" },
    },
  }
}

export function messageBubble(reduced: Reduced): Variants {
  return {
    hidden: { opacity: 0, y: reduced ? 0 : 8, scale: reduced ? 1 : 0.98 },
    show: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: reduced
        ? REDUCED_TRANSITION
        : { duration: 0.2, ease: EASE_PREMIUM },
    },
  }
}

// ---------------------------------------------------------------------------
// Administração page — deliberately distinct from the rest of the dashboard:
// the page settles in with a soft blur-to-focus reveal, the two panels slide
// in from opposite edges, and cards/rows pop with spring physics instead of a
// linear ease, for a more tactile, "premium" feel on this page specifically.
// ---------------------------------------------------------------------------

const SPRING_PREMIUM: Transition = { type: "spring", stiffness: 260, damping: 24, mass: 0.9 }

export function adminPageReveal(reduced: Reduced): Variants {
  return {
    hidden: {
      opacity: 0,
      y: reduced ? 0 : 14,
      filter: reduced ? "blur(0px)" : "blur(6px)",
    },
    show: {
      opacity: 1,
      y: 0,
      filter: "blur(0px)",
      transition: reduced ? REDUCED_TRANSITION : { duration: 0.5, ease: EASE_PREMIUM },
    },
  }
}

export function adminPanelIn(reduced: Reduced, direction: "left" | "right", delay = 0): Variants {
  const x = direction === "left" ? -28 : 28
  return {
    hidden: { opacity: 0, x: reduced ? 0 : x },
    show: {
      opacity: 1,
      x: 0,
      transition: reduced ? REDUCED_TRANSITION : { ...SPRING_PREMIUM, delay },
    },
  }
}

export function adminStagger(reduced: Reduced, delay = 0.1): Variants {
  return {
    hidden: {},
    show: {
      transition: reduced
        ? REDUCED_TRANSITION
        : { delayChildren: delay, staggerChildren: 0.06 },
    },
  }
}

export function adminItemPop(reduced: Reduced): Variants {
  return {
    hidden: { opacity: 0, y: reduced ? 0 : 10, scale: reduced ? 1 : 0.96 },
    show: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: reduced ? REDUCED_TRANSITION : SPRING_PREMIUM,
    },
  }
}

export const adminCardHover = { y: -3, scale: 1.015 }
export const adminCardTap = { scale: 0.98 }

/**
 * Scale-free variant for table rows: `<tr>` transforms are fine for
 * translate/opacity, but scaling a table row can visually squash its cells
 * inconsistently across browsers, so this drops the scale from adminItemPop.
 */
export function adminRowPop(reduced: Reduced): Variants {
  return {
    hidden: { opacity: 0, y: reduced ? 0 : 10 },
    show: {
      opacity: 1,
      y: 0,
      transition: reduced ? REDUCED_TRANSITION : SPRING_PREMIUM,
    },
  }
}

// ---------------------------------------------------------------------------
// Atividades do Setor — calendar/kanban module. Tab switches (calendário /
// kanban / minhas tarefas / eventos / histórico) cross-fade with a small
// vertical settle instead of snapping, and Kanban columns cascade in by
// index. Card hover/pickup lift is deliberately done in CSS, not here — the
// cards carry dnd-kit's own inline `transform` for drag positioning, and
// letting Motion also animate `transform` on the same element fights it
// (same reasoning as `tableRow` above).
// ---------------------------------------------------------------------------

export function activityTabSwitch(reduced: Reduced): Variants {
  return {
    hidden: { opacity: 0, y: reduced ? 0 : 8 },
    show: {
      opacity: 1,
      y: 0,
      transition: reduced ? REDUCED_TRANSITION : { duration: 0.28, ease: EASE_PREMIUM },
    },
    exit: {
      opacity: 0,
      y: reduced ? 0 : -6,
      transition: reduced ? REDUCED_TRANSITION : { duration: 0.16, ease: "easeIn" },
    },
  }
}

export function kanbanColumnIn(reduced: Reduced, index = 0): Variants {
  return {
    hidden: { opacity: 0, y: reduced ? 0 : 16 },
    show: {
      opacity: 1,
      y: 0,
      transition: reduced ? REDUCED_TRANSITION : { ...SPRING_PREMIUM, delay: index * 0.07 },
    },
  }
}

// ---------------------------------------------------------------------------
// Reuniões — video grid tiles cascade in by index like Kanban columns, and
// the chat/participants side panel slides in from the edge it's docked to
// (same spring feel as adminPanelIn, kept as its own factory so this module
// stays free-standing from Administração's).
// ---------------------------------------------------------------------------

export function meetingTileIn(reduced: Reduced, index = 0): Variants {
  return {
    hidden: { opacity: 0, scale: reduced ? 1 : 0.94 },
    show: {
      opacity: 1,
      scale: 1,
      transition: reduced ? REDUCED_TRANSITION : { ...SPRING_PREMIUM, delay: index * 0.05 },
    },
  }
}

export function meetingPanelSlide(reduced: Reduced, direction: "left" | "right" = "right"): Variants {
  const x = direction === "left" ? -24 : 24
  return {
    hidden: { opacity: 0, x: reduced ? 0 : x },
    show: {
      opacity: 1,
      x: 0,
      transition: reduced ? REDUCED_TRANSITION : SPRING_PREMIUM,
    },
  }
}

export function meetingControlBarIn(reduced: Reduced): Variants {
  return {
    hidden: { opacity: 0, y: reduced ? 0 : 20 },
    show: {
      opacity: 1,
      y: 0,
      transition: reduced ? REDUCED_TRANSITION : { duration: 0.35, ease: EASE_PREMIUM },
    },
  }
}

// ---------------------------------------------------------------------------
// Chat Interno — bate-papo/grupo. Message entrance reuses `messageBubble`
// as-is (already generic). These two are specific to this module: the
// three-dot typing indicator bounces in a loop, and the call-ring avatar
// pulses while ringing — both intentionally infinite/looping, unlike every
// other variant in this file which only animates a mount transition.
// ---------------------------------------------------------------------------

export function typingDotPulse(reduced: Reduced, index = 0): Variants {
  if (reduced) {
    return { hidden: { opacity: 0.4 }, show: { opacity: 0.4 } }
  }
  return {
    hidden: { opacity: 0.3, y: 0 },
    show: {
      opacity: [0.3, 1, 0.3],
      y: [0, -3, 0],
      transition: {
        duration: 1,
        repeat: Infinity,
        ease: "easeInOut",
        delay: index * 0.15,
      },
    },
  }
}

export function callRingPulse(reduced: Reduced): Variants {
  if (reduced) {
    return { hidden: { scale: 1, opacity: 1 }, show: { scale: 1, opacity: 1 } }
  }
  return {
    hidden: { scale: 1, opacity: 0.7 },
    show: {
      scale: [1, 1.08, 1],
      opacity: [0.7, 1, 0.7],
      transition: { duration: 1.6, repeat: Infinity, ease: "easeInOut" },
    },
  }
}

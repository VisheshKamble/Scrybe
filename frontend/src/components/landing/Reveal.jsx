import { motion, useReducedMotion } from 'framer-motion'

const EASE = [0.16, 1, 0.3, 1]

/**
 * Fades + slides a section into place the first time it enters the
 * viewport. Centralized here so every section on the landing page shares
 * the same easing/timing instead of each hand-rolling its own transition.
 */
export default function Reveal({
  children,
  delay = 0,
  y = 22,
  className = '',
  as = 'div',
  once = true,
  amount = 0.2,
}) {
  const reduceMotion = useReducedMotion()
  const Component = motion[as] ?? motion.div

  return (
    <Component
      className={className}
      initial={reduceMotion ? false : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once, amount }}
      transition={{ duration: 0.6, delay, ease: EASE }}
    >
      {children}
    </Component>
  )
}

/**
 * Stagger + StaggerItem: the same cascading "text arrives line by line"
 * choreography Hero uses, but triggered on scroll-into-view instead of on
 * mount — so every section on the page can cascade its content in, not
 * just the hero. Wrap a group in <Stagger>, mark each direct animated
 * child as <StaggerItem>.
 */
export function Stagger({
  children,
  className = '',
  as = 'div',
  stagger = 0.09,
  delayChildren = 0,
  once = true,
  amount = 0.2,
}) {
  const reduceMotion = useReducedMotion()
  const Component = motion[as] ?? motion.div

  return (
    <Component
      className={className}
      initial={reduceMotion ? false : 'hidden'}
      whileInView="show"
      viewport={{ once, amount }}
      variants={{ hidden: {}, show: { transition: { staggerChildren: stagger, delayChildren } } }}
    >
      {children}
    </Component>
  )
}

export function StaggerItem({ children, className = '', y = 16, as = 'div' }) {
  const Component = motion[as] ?? motion.div
  return (
    <Component
      className={className}
      variants={{
        hidden: { opacity: 0, y },
        show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE } },
      }}
    >
      {children}
    </Component>
  )
}

import { motion, useReducedMotion } from 'framer-motion'

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
      transition={{ duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </Component>
  )
}

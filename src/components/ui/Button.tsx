import { motion, type HTMLMotionProps } from 'motion/react'
import { forwardRef, type ReactNode } from 'react'
import { Link, type LinkProps } from 'react-router'
import { spring } from '@/lib/motion'

type Variant = 'primary' | 'secondary' | 'soft' | 'ghost' | 'dark'
type Size = 'sm' | 'md' | 'lg'

const VARIANT: Record<Variant, string> = {
  // coral fill + warm ink text keeps ≥4.5:1 contrast
  primary: 'bg-coral text-ink shadow-[var(--shadow-puffy)] hover:bg-[#ff8a7c]',
  secondary: 'bg-white/90 text-ink border border-line shadow-[var(--shadow-soft)] hover:bg-white',
  soft: 'bg-cream-3/70 text-ink hover:bg-cream-3',
  ghost: 'bg-transparent text-ink hover:bg-ink/5',
  dark: 'bg-ink text-cream shadow-[0_10px_24px_-10px_rgb(59_38_34/0.6)] hover:bg-[#4a312c]',
}

const SIZE: Record<Size, string> = {
  sm: 'h-10 px-4 text-sm gap-1.5 rounded-full',
  md: 'h-12 px-5 text-[15px] gap-2 rounded-full',
  lg: 'h-14 px-7 text-base gap-2.5 rounded-full',
}

const base =
  'relative select-none items-center justify-center whitespace-nowrap font-display font-semibold tracking-tight transition-colors disabled:pointer-events-none disabled:opacity-45'

// a bare display utility in className (e.g. "hidden md:inline-flex") must win over the default
const display = (className: string) => (/(^|\s)(hidden|block|flex|grid|inline-block)(\s|$)/.test(className) ? '' : 'inline-flex')

interface Common {
  variant?: Variant
  size?: Size
  icon?: ReactNode
  iconRight?: ReactNode
  block?: boolean
}

export type ButtonProps = Common & Omit<HTMLMotionProps<'button'>, 'children'> & { children?: ReactNode }

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', icon, iconRight, block, className = '', children, type = 'button', ...rest },
  ref,
) {
  return (
    <motion.button
      ref={ref}
      type={type}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.94, y: 1 }}
      transition={spring.bouncy}
      className={`${base} ${display(className)} ${VARIANT[variant]} ${SIZE[size]} ${block ? 'w-full' : ''} ${className}`}
      {...rest}
    >
      {icon}
      {children}
      {iconRight}
    </motion.button>
  )
})

const MotionLink = motion.create(Link)

export function ButtonLink({
  variant = 'primary',
  size = 'md',
  icon,
  iconRight,
  block,
  className = '',
  children,
  ...rest
}: Common &
  Omit<LinkProps, 'onAnimationStart' | 'onAnimationEnd' | 'onAnimationIteration' | 'onDrag' | 'onDragStart' | 'onDragEnd' | 'children'> & {
    children?: ReactNode
  }) {
  return (
    <MotionLink
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.94, y: 1 }}
      transition={spring.bouncy}
      className={`${base} ${display(className)} ${VARIANT[variant]} ${SIZE[size]} ${block ? 'w-full' : ''} ${className}`}
      {...rest}
    >
      {icon}
      {children}
      {iconRight}
    </MotionLink>
  )
}

/** Round icon-only button. `label` is required for screen readers. */
export function IconButton({
  label,
  children,
  className = '',
  variant = 'secondary',
  ...rest
}: { label: string; variant?: Variant } & Omit<HTMLMotionProps<'button'>, 'children'> & { children: ReactNode }) {
  return (
    <motion.button
      type="button"
      aria-label={label}
      title={label}
      whileTap={{ scale: 0.88 }}
      transition={spring.bouncy}
      className={`${display(className)} size-11 shrink-0 items-center justify-center rounded-full ${VARIANT[variant]} ${className}`}
      {...rest}
    >
      {children}
    </motion.button>
  )
}

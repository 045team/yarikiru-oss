import { ComponentPropsWithoutRef, Ref } from 'react'
import { Transition } from 'motion/react'

export interface RotatingTextProps extends ComponentPropsWithoutRef<'span'> {
    texts: string[]
    transition?: Transition
    initial?: Record<string, unknown>
    animate?: Record<string, unknown>
    exit?: Record<string, unknown>
    animatePresenceMode?: 'wait' | 'sync' | 'popLayout'
    animatePresenceInitial?: boolean
    rotationInterval?: number
    staggerDuration?: number
    staggerFrom?: 'first' | 'last' | 'center' | 'random' | number
    loop?: boolean
    auto?: boolean
    splitBy?: 'characters' | 'words' | 'lines' | string
    onNext?: (index: number) => void
    mainClassName?: string
    splitLevelClassName?: string
    elementLevelClassName?: string
}

export interface RotatingTextRef {
    next: () => void
    previous: () => void
    jumpTo: (index: number) => void
    reset: () => void
}

declare const RotatingText: React.ForwardRefExoticComponent<
    RotatingTextProps & React.RefAttributes<RotatingTextRef>
>

export default RotatingText

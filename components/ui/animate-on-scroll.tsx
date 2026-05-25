'use client'

import { useEffect, useRef, ReactNode } from 'react'

interface AnimateOnScrollProps {
  children: ReactNode
  delay?: number
  className?: string
}

export function AnimateOnScroll({ children, delay = 0, className = '' }: AnimateOnScrollProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.style.animationDelay = `${delay}ms`
          el.classList.add('animate-fade-up')
          observer.disconnect()
        }
      },
      { threshold: 0.1 }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [delay])

  return (
    <div ref={ref} style={{ opacity: 0 }} className={className}>
      {children}
    </div>
  )
}

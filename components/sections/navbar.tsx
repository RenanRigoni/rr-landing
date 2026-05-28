'use client'

import { useState, useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import Image from 'next/image'
import { WhatsappLogo, List, X } from '@phosphor-icons/react'
import { WHATSAPP_URL } from '@/lib/constants'

const NAV_LINKS = [
  { label: 'Como funciona', href: '#como-funciona' },
  { label: 'Pacotes e preços', href: '#pacotes' },
  { label: 'Outros serviços', href: '/servicos' },
  { label: 'Perguntas frequentes', href: '#faq' },
]

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()

  function resolveHref(href: string) {
    if (href.startsWith('#') && pathname !== '/') return `/${href}`
    return href
  }
  const overlayRef = useRef<HTMLDivElement>(null)
  const closeBtnRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!isOpen) return

    closeBtnRef.current?.focus()

    const overlay = overlayRef.current
    if (!overlay) return

    const focusable = overlay.querySelectorAll<HTMLElement>(
      'a[href], button, [tabindex]:not([tabindex="-1"])'
    )
    const first = focusable[0]
    const last = focusable[focusable.length - 1]

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setIsOpen(false); return }
      if (e.key !== 'Tab') return
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last?.focus() }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first?.focus() }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex justify-center pt-5 px-4">
      <nav className="w-full max-w-5xl" aria-label="Navegação principal">
        <div className="glass rounded-pill px-5 py-3 flex items-center justify-between">
          <a href="/" aria-label="dev.RR: página inicial">
            <Image
              src="/logos/logo-primary-color.svg"
              alt="dev.RR"
              width={120}
              height={40}
              className="h-8 w-auto"
              priority
            />
          </a>

          <div className="hidden md:flex items-center gap-6">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={resolveHref(link.href)}
                className="text-sm text-content-secondary font-medium hover:text-content-primary transition-colors duration-200"
              >
                {link.label}
              </a>
            ))}
          </div>

          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden md:flex items-center gap-2 rounded-pill bg-brand-600 text-white px-5 py-3 text-sm font-semibold transition-all duration-200 ease-spring hover:bg-brand-500 hover:scale-[1.02] hover:shadow-glow-sm active:scale-[0.98]"
          >
            <WhatsappLogo size={16} weight="fill" />
            Falar no WhatsApp
          </a>

          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden w-11 h-11 flex items-center justify-center rounded-full bg-white/[0.08] text-content-primary cursor-pointer border border-white/10"
            aria-label={isOpen ? 'Fechar menu' : 'Abrir menu'}
            aria-expanded={isOpen}
            aria-controls="mobile-menu"
            type="button"
          >
            {isOpen ? <X size={18} weight="light" /> : <List size={18} weight="light" />}
          </button>
        </div>

        {isOpen && (
          <div
            id="mobile-menu"
            ref={overlayRef}
            role="dialog"
            aria-modal="true"
            aria-label="Menu de navegação"
            className="md:hidden fixed inset-0 bg-surface/95 backdrop-blur-2xl z-40 flex flex-col items-center justify-center gap-6"
          >
            <button
              ref={closeBtnRef}
              onClick={() => setIsOpen(false)}
              className="absolute top-6 right-6 w-11 h-11 flex items-center justify-center rounded-full bg-white/[0.08] border border-white/10 cursor-pointer"
              aria-label="Fechar menu"
              type="button"
            >
              <X size={20} weight="light" className="text-content-primary" />
            </button>
            <Image
              src="/logos/logo-primary-color.svg"
              alt="dev.RR"
              width={140}
              height={48}
              className="h-10 w-auto"
            />
            <nav className="flex flex-col items-center w-full px-8 gap-1">
              {NAV_LINKS.map((link) => (
                <a
                  key={link.href}
                  href={resolveHref(link.href)}
                  onClick={() => setIsOpen(false)}
                  className="w-full text-center py-4 text-base text-content-primary font-medium border-b border-white/[0.08] last:border-0 hover:text-brand-400 transition-colors duration-200"
                >
                  {link.label}
                </a>
              ))}
            </nav>
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 rounded-pill bg-brand-600 text-white px-8 py-4 text-lg font-semibold"
            >
              <WhatsappLogo size={22} weight="fill" />
              Falar no WhatsApp
            </a>
          </div>
        )}
      </nav>
    </header>
  )
}

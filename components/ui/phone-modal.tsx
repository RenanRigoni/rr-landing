'use client'

import { useEffect } from 'react'
import { X } from '@phosphor-icons/react'

interface PhoneModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
}

export function PhoneModal({ isOpen, onClose, title, children }: PhoneModalProps) {
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handler)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-black/75 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex flex-col items-center gap-4"
        onClick={(e) => e.stopPropagation()}
        style={{ animation: 'phoneModalIn 0.25s cubic-bezier(0.16,1,0.3,1) forwards' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between w-full px-1">
          <div>
            <p className="text-white/40 text-[10px] uppercase tracking-widest">Prévia</p>
            <p className="text-white font-semibold text-sm leading-tight">{title}</p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Fechar prévia"
          >
            <X size={15} weight="bold" className="text-white" />
          </button>
        </div>

        {/* Phone frame */}
        <div
          className="relative bg-zinc-900 rounded-[2.75rem] shadow-2xl overflow-hidden"
          style={{
            width: 230,
            height: 460,
            border: '3px solid #3f3f46',
            boxShadow: '0 0 0 1px #27272a, 0 40px 80px rgba(0,0,0,0.7)',
          }}
        >
          {/* Dynamic island */}
          <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-16 h-[14px] bg-black rounded-full z-10" />
          {/* Side button */}
          <div className="absolute right-[-4px] top-20 w-[3px] h-10 bg-zinc-700 rounded-l-sm" />
          <div className="absolute left-[-4px] top-16 w-[3px] h-7 bg-zinc-700 rounded-r-sm" />
          <div className="absolute left-[-4px] top-26 w-[3px] h-7 bg-zinc-700 rounded-r-sm" />

          {/* Screen content */}
          <div className="w-full h-full overflow-y-auto overflow-x-hidden pt-5 scrollbar-none">
            {children}
          </div>

          {/* Home indicator */}
          <div
            className="absolute bottom-2 left-1/2 -translate-x-1/2 w-16 h-[3px] bg-white/25 rounded-full z-10"
            style={{ pointerEvents: 'none' }}
          />
        </div>

        <p className="text-white/20 text-[10px]">Prévia ilustrativa · não é o produto final</p>
      </div>

      <style>{`
        @keyframes phoneModalIn {
          from { opacity: 0; transform: scale(0.92) translateY(10px); }
          to   { opacity: 1; transform: scale(1)    translateY(0); }
        }
        .scrollbar-none::-webkit-scrollbar { display: none; }
        .scrollbar-none { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  )
}

'use client'

import { useState } from 'react'
import { Plus, Minus } from '@phosphor-icons/react'
import { FAQ_ITEMS, WHATSAPP_URL } from '@/lib/constants'

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  return (
    <section id="faq" className="py-24 px-4 bg-surface scroll-mt-24">
      <div className="max-w-3xl mx-auto flex flex-col gap-12">
        <div className="flex flex-col gap-4">
          <h2 className="font-sans font-bold text-[clamp(1.875rem,4vw,3rem)] leading-[1.2] tracking-[-0.02em] text-content-primary">
            Ficou alguma dúvida?
          </h2>
        </div>

        <div className="flex flex-col gap-3">
          {FAQ_ITEMS.map((item, i) => (
            <div
              key={item.question}
              className="bg-surface-elevated border border-white/[0.06] rounded-2xl overflow-hidden"
            >
              <button
                id={`faq-btn-${i}`}
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left cursor-pointer"
                aria-expanded={openIndex === i}
                aria-controls={`faq-panel-${i}`}
                type="button"
              >
                <span className="font-semibold text-sm text-content-primary leading-[1.4]">
                  {item.question}
                </span>
                <span className="shrink-0 w-7 h-7 rounded-full bg-white/[0.06] border border-white/[0.10] flex items-center justify-center transition-transform duration-300 ease-spring">
                  {openIndex === i ? (
                    <Minus size={14} weight="bold" className="text-brand-400" />
                  ) : (
                    <Plus size={14} weight="bold" className="text-content-muted" />
                  )}
                </span>
              </button>
              {openIndex === i && (
                <div
                  id={`faq-panel-${i}`}
                  role="region"
                  aria-labelledby={`faq-btn-${i}`}
                  className="px-6 pb-5"
                >
                  <p className="text-sm text-content-secondary leading-[1.7]">{item.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>

        <p className="text-center text-sm text-content-secondary">
          Não encontrou o que procurava?{' '}
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand-400 font-semibold hover:underline"
          >
            Me manda uma mensagem no WhatsApp
          </a>
          . Respondo em até 1 hora.
        </p>
      </div>
    </section>
  )
}

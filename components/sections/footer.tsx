import Image from 'next/image'
import { WhatsappLogo, EnvelopeSimple } from '@phosphor-icons/react/dist/ssr'
import { SITE_CONFIG, WHATSAPP_URL } from '@/lib/constants'

export function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="py-12 px-4 bg-surface-footer border-t border-white/5">
      <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex flex-col items-center md:items-start gap-1">
          <Image
            src="/rr-monocromatico-transp.png"
            alt="dev.RR"
            width={100}
            height={36}
            className="h-7 w-auto brightness-0 invert"
          />
          <p className="text-xs text-content-secondary">{SITE_CONFIG.tagline}</p>
        </div>

        <div className="flex items-center gap-4">
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="WhatsApp"
            className="w-11 h-11 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors duration-200 cursor-pointer"
          >
            <WhatsappLogo size={20} weight="light" className="text-content-secondary" />
          </a>
          <a
            href={`mailto:${SITE_CONFIG.email}`}
            aria-label="Email"
            className="w-11 h-11 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors duration-200 cursor-pointer"
          >
            <EnvelopeSimple size={20} weight="light" className="text-content-secondary" />
          </a>
        </div>

        <p className="text-xs text-content-secondary text-center md:text-right">
          © {currentYear} dev.RR · {SITE_CONFIG.city}, {SITE_CONFIG.state}
          <br />
          Todos os direitos reservados.
        </p>
      </div>
    </footer>
  )
}

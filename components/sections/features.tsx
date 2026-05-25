import {
  User,
  Timer,
  WhatsappLogo,
  Microphone,
  Star,
  Handshake,
} from '@phosphor-icons/react/dist/ssr'
import { FEATURES, SITE_CONFIG } from '@/lib/constants'

const ICON_MAP: Record<string, React.ElementType> = {
  User,
  Timer,
  WhatsappLogo,
  MicrophoneStage: Microphone,
  Star,
  HandshakeLogo: Handshake,
}

export function Features() {
  return (
    <section className="py-24 px-4 bg-surface">
      <div className="max-w-6xl mx-auto flex flex-col gap-14">
        <div className="flex flex-col gap-4 max-w-2xl">
          <h2 className="font-sans font-bold text-[clamp(1.875rem,4vw,3rem)] leading-[1.2] tracking-[-0.02em] text-content-primary">
            Por que negócios locais escolhem a dev.RR
          </h2>
          <p className="text-lg text-content-secondary leading-[1.7]">
            Não somos agência. Não temos gerente de conta nem reuniões de 2 horas. Você fala diretamente comigo, de qualquer cidade do Brasil, por call ou WhatsApp.
          </p>
        </div>

        <div className="flex flex-col gap-6">
          {/* First feature: destaque full-width */}
          {(() => {
            const first = FEATURES[0]
            const Icon = ICON_MAP[first.icon] ?? Star
            return (
              <div className="card-border-brand p-px rounded-card">
                <div className="bg-surface-card rounded-[1.875rem] p-7 flex flex-col sm:flex-row gap-6 items-start">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center ring-1 bg-brand-600/20 ring-brand-400/30 shrink-0">
                    <Icon size={24} weight="light" className="text-brand-400" />
                  </div>
                  <div className="flex flex-col gap-2">
                    <h3 className="font-semibold text-lg leading-[1.3] text-content-primary">
                      {first.title}
                    </h3>
                    <p className="text-base leading-[1.7] text-content-secondary max-w-[56ch]">
                      {first.description}
                    </p>
                  </div>
                </div>
              </div>
            )
          })()}

          {/* Remaining features: lista compacta com dividers */}
          <div className="flex flex-col divide-y divide-white/[0.06] border border-white/[0.06] rounded-2xl overflow-hidden">
            {FEATURES.slice(1).map((feature) => {
              const Icon = ICON_MAP[feature.icon] ?? Star
              return (
                <div
                  key={feature.title}
                  className="flex items-start gap-4 px-6 py-5 bg-surface-elevated"
                >
                  <div className="w-9 h-9 rounded-full bg-brand-600/15 ring-1 ring-brand-400/20 flex items-center justify-center shrink-0 mt-0.5">
                    <Icon size={17} weight="light" className="text-brand-400" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <h3 className="font-semibold text-sm text-content-primary leading-[1.3]">
                      {feature.title}
                    </h3>
                    <p className="text-sm leading-[1.6] text-content-secondary">
                      {feature.description}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}

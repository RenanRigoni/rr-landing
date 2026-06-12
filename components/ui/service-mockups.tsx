import {
  WhatsappLogo,
  InstagramLogo,
  GlobeSimple,
  ForkKnife,
  Star,
  CheckCircle,
  CalendarBlank,
  ChartBar,
  EnvelopeSimple,
  ArrowRight,
  ChatCircleDots,
  ShoppingCartSimple,
  Kanban,
  GearSix,
  RocketLaunch,
  Megaphone,
  Images,
} from '@phosphor-icons/react/dist/ssr'

export function LinkBioMock() {
  return (
    <div className="flex flex-col items-center gap-3 px-4 pb-6 bg-gradient-to-b from-violet-950 via-zinc-950 to-zinc-950 min-h-full">
      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-violet-400 to-pink-500 flex items-center justify-center mt-6 shadow-lg">
        <span className="text-white text-xl font-bold">BE</span>
      </div>
      <div className="text-center">
        <p className="text-white font-semibold text-sm">Bela Estética</p>
        <p className="text-white/40 text-[10px]">@bela.estetica · Patrocínio, MG</p>
      </div>
      <div className="w-full flex flex-col gap-2 mt-1">
        <div className="flex items-center gap-2 bg-green-500/20 border border-green-500/30 rounded-xl px-3 py-2.5 cursor-pointer">
          <WhatsappLogo size={14} weight="fill" className="text-green-400 shrink-0" />
          <span className="text-green-300 text-[11px] font-medium">Agendar via WhatsApp</span>
        </div>
        <div className="flex items-center gap-2 bg-pink-500/20 border border-pink-500/30 rounded-xl px-3 py-2.5 cursor-pointer">
          <InstagramLogo size={14} weight="fill" className="text-pink-400 shrink-0" />
          <span className="text-pink-300 text-[11px] font-medium">Ver no Instagram</span>
        </div>
        <div className="flex items-center gap-2 bg-white/[0.07] border border-white/10 rounded-xl px-3 py-2.5 cursor-pointer">
          <GlobeSimple size={14} className="text-white/60 shrink-0" />
          <span className="text-white/70 text-[11px] font-medium">Acessar o site</span>
        </div>
        <div className="flex items-center gap-2 bg-white/[0.07] border border-white/10 rounded-xl px-3 py-2.5 cursor-pointer">
          <ForkKnife size={14} className="text-white/60 shrink-0" />
          <span className="text-white/70 text-[11px] font-medium">Ver cardápio</span>
        </div>
      </div>
      <p className="text-white/15 text-[8px] mt-4">dev.RR</p>
    </div>
  )
}

export function CardapioMock() {
  const items = [
    { name: 'X-Burguer Especial', price: 'R$ 28,90', tag: '🔥 Mais pedido' },
    { name: 'X-Bacon Duplo', price: 'R$ 34,90', tag: null },
    { name: 'Combo Família', price: 'R$ 59,90', tag: '🎉 Oferta' },
  ]
  return (
    <div className="flex flex-col bg-zinc-50 min-h-full">
      <div className="bg-zinc-900 px-4 py-3 flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-amber-400 flex items-center justify-center">
          <ForkKnife size={14} weight="fill" className="text-zinc-900" />
        </div>
        <div>
          <p className="text-white text-[11px] font-semibold">Burguer House</p>
          <p className="text-white/40 text-[9px]">Aberto agora · Entrega 30min</p>
        </div>
      </div>
      <div className="flex gap-2 px-3 py-2 border-b border-zinc-200 overflow-x-auto">
        {['Lanches', 'Bebidas', 'Sobremesas'].map((c, i) => (
          <span
            key={c}
            className={`shrink-0 px-3 py-1 rounded-full text-[10px] font-medium ${i === 0 ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-500'}`}
          >
            {c}
          </span>
        ))}
      </div>
      <div className="flex flex-col gap-0 divide-y divide-zinc-100">
        {items.map((item) => (
          <div key={item.name} className="flex items-center gap-3 px-3 py-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-200 to-orange-300 shrink-0" />
            <div className="flex-1 min-w-0">
              {item.tag && (
                <span className="text-[8px] text-amber-600 font-semibold">{item.tag}</span>
              )}
              <p className="text-zinc-800 text-[11px] font-medium leading-tight truncate">{item.name}</p>
              <p className="text-zinc-900 text-[11px] font-bold">{item.price}</p>
            </div>
            <div className="w-6 h-6 rounded-full bg-zinc-900 flex items-center justify-center shrink-0">
              <span className="text-white text-[13px] leading-none">+</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function LeadCaptureMock() {
  return (
    <div className="flex flex-col bg-white min-h-full">
      <div className="h-20 bg-gradient-to-br from-blue-600 to-violet-600 flex items-end px-4 pb-3">
        <div>
          <p className="text-white font-bold text-sm leading-tight">Ganhe 20% OFF</p>
          <p className="text-white/70 text-[10px]">na sua primeira consulta</p>
        </div>
      </div>
      <div className="flex flex-col gap-3 px-4 pt-5 pb-4">
        <div>
          <p className="text-zinc-500 text-[9px] font-semibold uppercase tracking-wider mb-1">Seu nome</p>
          <div className="border border-zinc-200 rounded-lg px-3 py-2 text-[11px] text-zinc-400 bg-zinc-50">
            Ex: Maria Silva
          </div>
        </div>
        <div>
          <p className="text-zinc-500 text-[9px] font-semibold uppercase tracking-wider mb-1">Seu WhatsApp</p>
          <div className="border border-zinc-200 rounded-lg px-3 py-2 text-[11px] text-zinc-400 bg-zinc-50">
            (34) 9 0000-0000
          </div>
        </div>
        <div className="bg-green-500 rounded-xl px-3 py-2.5 flex items-center justify-center gap-2 mt-1 cursor-pointer">
          <WhatsappLogo size={13} weight="fill" className="text-white" />
          <span className="text-white text-[11px] font-semibold">Quero meu desconto!</span>
        </div>
        <p className="text-zinc-400 text-[8px] text-center leading-relaxed">
          🔒 Seus dados não são compartilhados. Apenas a clínica receberá seu contato.
        </p>
        <div className="flex items-center gap-2 bg-zinc-50 rounded-xl p-2 border border-zinc-100 mt-1">
          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
            <CheckCircle size={14} weight="fill" className="text-blue-600" />
          </div>
          <div>
            <p className="text-zinc-700 text-[10px] font-medium">Já recebemos 47 respostas</p>
            <p className="text-zinc-400 text-[9px]">esta semana</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export function EmailMock() {
  const emails = [
    { from: 'João Mendes', subject: 'Orçamento solicitado', time: '09:42', unread: true },
    { from: 'Ana Costa', subject: 'Confirmação de agendamento', time: '08:15', unread: true },
    { from: 'Pedro Alves', subject: 'Dúvida sobre o serviço', time: 'Ontem', unread: false },
  ]
  return (
    <div className="flex flex-col bg-zinc-50 min-h-full">
      <div className="bg-blue-700 px-4 py-3">
        <p className="text-white/60 text-[9px]">Caixa de entrada</p>
        <p className="text-white font-semibold text-[11px]">contato@clinicabela.com.br</p>
      </div>
      <div className="flex flex-col divide-y divide-zinc-100">
        {emails.map((e) => (
          <div key={e.subject} className={`px-3 py-3 flex gap-2 ${e.unread ? 'bg-white' : 'bg-zinc-50'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold ${e.unread ? 'bg-blue-600 text-white' : 'bg-zinc-200 text-zinc-500'}`}>
              {e.from[0]}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1">
                <p className={`text-[11px] truncate ${e.unread ? 'font-semibold text-zinc-900' : 'text-zinc-500'}`}>{e.from}</p>
                <p className="text-[9px] text-zinc-400 shrink-0">{e.time}</p>
              </div>
              <p className="text-[10px] text-zinc-500 truncate">{e.subject}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="px-3 py-2 mt-1">
        <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-xl px-3 py-2">
          <EnvelopeSimple size={13} className="text-blue-500 shrink-0" />
          <p className="text-blue-700 text-[10px]">2 mensagens não lidas</p>
        </div>
      </div>
    </div>
  )
}

export function RelatorioMock() {
  const bars = [40, 65, 50, 80, 70, 90, 75]
  const days = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D']
  return (
    <div className="flex flex-col bg-zinc-950 min-h-full px-4 py-5 gap-4">
      <div>
        <p className="text-white/40 text-[9px] uppercase tracking-wider">Relatório — Maio 2025</p>
        <p className="text-white font-bold text-sm">Clínica Bela Estética</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {[
          { label: 'Visualizações', value: '847', delta: '+12%' },
          { label: 'Cliques WhatsApp', value: '43', delta: '+28%' },
          { label: 'Buscas Google', value: '312', delta: '+8%' },
          { label: 'Posição local', value: '#2', delta: '▲1' },
        ].map((s) => (
          <div key={s.label} className="bg-white/[0.05] border border-white/[0.08] rounded-xl p-2.5">
            <p className="text-white/40 text-[8px]">{s.label}</p>
            <p className="text-white font-bold text-base leading-tight">{s.value}</p>
            <p className="text-green-400 text-[9px] font-medium">{s.delta} este mês</p>
          </div>
        ))}
      </div>
      <div>
        <p className="text-white/40 text-[9px] mb-2">Cliques por dia — últimos 7 dias</p>
        <div className="flex items-end gap-1 h-14">
          {bars.map((h, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div
                className="w-full rounded-sm bg-brand-500"
                style={{ height: `${h}%` }}
              />
              <span className="text-white/30 text-[7px]">{days[i]}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/20 rounded-xl p-2.5">
        <ChartBar size={14} className="text-green-400 shrink-0" />
        <p className="text-green-300 text-[10px]">Melhor mês desde o início</p>
      </div>
    </div>
  )
}

export function AvaliacoesMock() {
  const reviews = [
    { name: 'Mariana L.', text: 'Atendimento incrível, super atenciosos!', stars: 5 },
    { name: 'Carlos M.', text: 'Resultado excelente, já indiquei para amigos.', stars: 5 },
  ]
  return (
    <div className="flex flex-col bg-white min-h-full">
      <div className="bg-white px-4 pt-5 pb-3 border-b border-zinc-100">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
            <span className="text-white text-[10px] font-bold">BE</span>
          </div>
          <div>
            <p className="text-zinc-800 font-semibold text-[11px]">Bela Estética</p>
            <p className="text-zinc-400 text-[9px]">Patrocínio, MG · Aberto agora</p>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-3">
          <span className="text-zinc-900 font-bold text-2xl">4.9</span>
          <div className="flex flex-col">
            <div className="flex gap-0.5">
              {[...Array(5)].map((_, i) => (
                <Star key={i} size={12} weight="fill" className="text-amber-400" />
              ))}
            </div>
            <p className="text-zinc-400 text-[9px]">127 avaliações no Google</p>
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-0 divide-y divide-zinc-50 px-3 pt-2">
        {reviews.map((r) => (
          <div key={r.name} className="py-3">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-[9px] font-bold text-blue-700">
                {r.name[0]}
              </div>
              <p className="text-zinc-700 text-[10px] font-semibold">{r.name}</p>
              <div className="flex gap-0.5 ml-auto">
                {[...Array(r.stars)].map((_, i) => (
                  <Star key={i} size={9} weight="fill" className="text-amber-400" />
                ))}
              </div>
            </div>
            <p className="text-zinc-500 text-[10px] leading-relaxed">{r.text}</p>
          </div>
        ))}
      </div>
      <div className="px-3 pb-4 mt-1">
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-2.5">
          <p className="text-blue-700 text-[10px] font-medium text-center">
            ✉️ Pedido de avaliação enviado para 18 clientes esta semana
          </p>
        </div>
      </div>
    </div>
  )
}

export function ManutencaoMock() {
  const tasks = [
    { label: 'Fotos do mês atualizadas', done: true },
    { label: 'Promoção de junho publicada', done: true },
    { label: 'Horário especial configurado', done: true },
    { label: 'Novo serviço adicionado', done: false },
  ]
  return (
    <div className="flex flex-col bg-zinc-50 min-h-full">
      <div className="bg-zinc-900 px-4 py-4">
        <p className="text-white/40 text-[9px]">Parceria Digital · Junho 2025</p>
        <p className="text-white font-semibold text-[11px]">Clínica Bela Estética</p>
      </div>
      <div className="px-4 py-4 flex flex-col gap-3">
        <p className="text-zinc-500 text-[9px] font-semibold uppercase tracking-wider">Tarefas do mês</p>
        <div className="flex flex-col gap-2">
          {tasks.map((t) => (
            <div key={t.label} className="flex items-center gap-2">
              <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${t.done ? 'bg-green-500' : 'border-2 border-zinc-300'}`}>
                {t.done && <CheckCircle size={10} weight="fill" className="text-white" />}
              </div>
              <p className={`text-[10px] ${t.done ? 'text-zinc-600 line-through' : 'text-zinc-800 font-medium'}`}>{t.label}</p>
            </div>
          ))}
        </div>
        <div className="mt-2 bg-white border border-zinc-200 rounded-xl p-3">
          <p className="text-zinc-400 text-[9px] mb-1">Próxima atualização</p>
          <div className="flex items-center gap-2">
            <CalendarBlank size={14} className="text-brand-500" />
            <p className="text-zinc-800 text-[11px] font-semibold">15 de julho, 2025</p>
          </div>
        </div>
        <div className="bg-green-50 border border-green-100 rounded-xl p-2.5">
          <p className="text-green-700 text-[10px] font-medium">✅ 3 de 4 tarefas concluídas</p>
          <p className="text-green-600 text-[9px]">Suporte disponível em até 4h</p>
        </div>
      </div>
    </div>
  )
}

export function SiteMultiMock() {
  return (
    <div className="flex flex-col bg-white min-h-full">
      {/* Mini browser bar */}
      <div className="bg-zinc-100 border-b border-zinc-200 px-2 py-1.5 flex items-center gap-1.5">
        <div className="flex gap-1">
          <div className="w-2 h-2 rounded-full bg-red-400" />
          <div className="w-2 h-2 rounded-full bg-yellow-400" />
          <div className="w-2 h-2 rounded-full bg-green-400" />
        </div>
        <div className="flex-1 bg-white border border-zinc-200 rounded px-2 py-0.5">
          <p className="text-zinc-400 text-[8px]">clinicabela.com.br</p>
        </div>
      </div>
      {/* Site navbar */}
      <div className="bg-zinc-900 px-3 py-2 flex items-center justify-between">
        <p className="text-white text-[10px] font-bold">Clínica Bela</p>
        <div className="flex gap-2">
          {['Sobre', 'Serviços', 'Blog', 'Contato'].map((p) => (
            <p key={p} className="text-white/50 text-[8px]">{p}</p>
          ))}
        </div>
      </div>
      {/* Hero */}
      <div className="bg-gradient-to-br from-blue-600 to-violet-700 px-3 py-5">
        <p className="text-white text-[10px] text-white/60 mb-1">Estética avançada</p>
        <p className="text-white font-bold text-sm leading-tight">Sua beleza em boas mãos</p>
        <div className="mt-3 flex gap-2">
          <div className="bg-white rounded-lg px-2 py-1.5 flex items-center gap-1">
            <WhatsappLogo size={10} weight="fill" className="text-green-600" />
            <p className="text-zinc-800 text-[9px] font-semibold">Agendar</p>
          </div>
          <div className="border border-white/30 rounded-lg px-2 py-1.5">
            <p className="text-white text-[9px]">Serviços</p>
          </div>
        </div>
      </div>
      {/* Services strip */}
      <div className="px-3 py-3">
        <p className="text-zinc-500 text-[9px] font-semibold uppercase tracking-wider mb-2">Serviços</p>
        <div className="grid grid-cols-2 gap-1.5">
          {['Limpeza de pele', 'Micropigmentação', 'Design de sobrancelhas', 'Botox'].map((s) => (
            <div key={s} className="bg-zinc-50 border border-zinc-100 rounded-lg px-2 py-2">
              <div className="w-4 h-4 rounded bg-violet-100 mb-1" />
              <p className="text-zinc-700 text-[9px] font-medium leading-tight">{s}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function AgendamentoMock() {
  const days = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']
  const dates = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21]
  const available = [3, 5, 10, 12, 17, 19]
  const selected = 12
  return (
    <div className="flex flex-col bg-white min-h-full">
      <div className="bg-blue-600 px-4 py-3">
        <p className="text-white/70 text-[9px]">Agendar consulta</p>
        <p className="text-white font-semibold text-[11px]">Clínica Bela Estética</p>
      </div>
      <div className="px-3 py-3">
        <div className="flex items-center justify-between mb-2">
          <p className="text-zinc-800 text-[11px] font-semibold">Junho 2025</p>
          <div className="flex gap-2 text-zinc-400 text-[10px]">
            <span>‹</span><span>›</span>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-0.5 mb-1">
          {days.map((d) => (
            <p key={d} className="text-center text-zinc-400 text-[8px] font-semibold py-0.5">{d}</p>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-0.5">
          {dates.map((d) => (
            <div
              key={d}
              className={`aspect-square flex items-center justify-center rounded-lg text-[9px] font-medium
                ${d === selected ? 'bg-blue-600 text-white' : ''}
                ${available.includes(d) && d !== selected ? 'text-blue-600 bg-blue-50 font-semibold' : ''}
                ${!available.includes(d) && d !== selected ? 'text-zinc-300' : ''}
              `}
            >
              {d}
            </div>
          ))}
        </div>
        <div className="mt-3">
          <p className="text-zinc-500 text-[9px] mb-2">Horários disponíveis · 12 jun</p>
          <div className="grid grid-cols-3 gap-1.5">
            {['09:00', '10:30', '14:00', '15:30', '16:00', '17:30'].map((t) => (
              <div
                key={t}
                className={`text-center py-1.5 rounded-lg text-[10px] font-medium border ${t === '10:30' ? 'bg-blue-600 text-white border-blue-600' : 'border-zinc-200 text-zinc-600'}`}
              >
                {t}
              </div>
            ))}
          </div>
        </div>
        <div className="mt-3 bg-blue-600 rounded-xl py-2.5 flex items-center justify-center gap-1.5 cursor-pointer">
          <CheckCircle size={13} weight="fill" className="text-white" />
          <p className="text-white text-[11px] font-semibold">Confirmar 10:30</p>
        </div>
      </div>
    </div>
  )
}

export function ChatbotMock() {
  return (
    <div className="flex flex-col bg-[#0a1628] min-h-full">
      {/* WhatsApp header */}
      <div className="bg-[#1f2c34] px-3 py-2.5 flex items-center gap-2 border-b border-white/5">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center">
          <span className="text-white text-[10px] font-bold">CB</span>
        </div>
        <div>
          <p className="text-white text-[11px] font-semibold">Clínica Bela Estética</p>
          <p className="text-green-400 text-[9px]">● online</p>
        </div>
      </div>
      {/* Chat */}
      <div className="flex flex-col gap-2.5 px-3 py-3 flex-1">
        {/* Bot message */}
        <div className="flex flex-col gap-0.5 max-w-[85%]">
          <div className="bg-[#1f2c34] rounded-2xl rounded-tl-sm px-3 py-2.5">
            <p className="text-white/80 text-[10px] leading-relaxed">
              👋 Olá! Obrigado por entrar em contato com a <strong className="text-white">Clínica Bela Estética.</strong>
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-0.5 max-w-[85%]">
          <div className="bg-[#1f2c34] rounded-2xl rounded-tl-sm px-3 py-2.5">
            <p className="text-white/80 text-[10px] leading-relaxed">
              No momento estamos <strong className="text-white">fora do horário</strong> de atendimento. Voltamos às <strong className="text-white">09h00 de segunda a sexta.</strong>
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-0.5 max-w-[85%]">
          <div className="bg-[#1f2c34] rounded-2xl rounded-tl-sm px-3 py-2.5">
            <p className="text-white/80 text-[10px] leading-relaxed">
              Para agendar agora, clique abaixo 👇
            </p>
          </div>
        </div>
        {/* Quick reply */}
        <div className="flex flex-col gap-1.5 max-w-[85%]">
          <div className="border border-green-500/40 rounded-xl px-3 py-2 flex items-center gap-1.5 cursor-pointer">
            <CalendarBlank size={11} className="text-green-400 shrink-0" />
            <p className="text-green-400 text-[10px] font-medium">📅 Quero agendar</p>
          </div>
          <div className="border border-white/10 rounded-xl px-3 py-2">
            <p className="text-white/50 text-[10px]">💬 Falar com atendente</p>
          </div>
        </div>
        {/* User message */}
        <div className="flex flex-col gap-0.5 max-w-[85%] self-end">
          <div className="bg-[#005c4b] rounded-2xl rounded-tr-sm px-3 py-2">
            <p className="text-white/80 text-[10px]">Oi, quero agendar!</p>
          </div>
        </div>
        {/* Bot response */}
        <div className="flex flex-col gap-0.5 max-w-[85%]">
          <div className="bg-[#1f2c34] rounded-2xl rounded-tl-sm px-3 py-2.5">
            <p className="text-white/80 text-[10px] leading-relaxed">
              Perfeito! 🎉 Acesse nosso agendamento online:
            </p>
            <div className="mt-1.5 bg-green-500/20 rounded-lg px-2 py-1.5 flex items-center gap-1">
              <ArrowRight size={10} className="text-green-400" />
              <p className="text-green-400 text-[9px] font-medium">clinicabela.com.br/agendar</p>
            </div>
          </div>
        </div>
      </div>
      {/* Input bar */}
      <div className="bg-[#1f2c34] px-2 py-2 flex items-center gap-2 border-t border-white/5">
        <div className="flex-1 bg-[#2a3942] rounded-full px-3 py-1.5">
          <p className="text-white/20 text-[9px]">Mensagem</p>
        </div>
        <div className="w-7 h-7 rounded-full bg-green-500 flex items-center justify-center">
          <ChatCircleDots size={13} weight="fill" className="text-white" />
        </div>
      </div>
    </div>
  )
}

export function EcommerceMock() {
  const products = [
    { name: 'Kit Premium', price: 'R$ 189,90', tag: 'Mais vendido' },
    { name: 'Produto Essencial', price: 'R$ 79,90', tag: null },
    { name: 'Combo Especial', price: 'R$ 249,90', tag: 'Oferta' },
  ]

  return (
    <div className="flex flex-col bg-zinc-50 min-h-full">
      <div className="bg-zinc-950 px-4 py-3 flex items-center justify-between">
        <div>
          <p className="text-white font-semibold text-[11px]">Loja Aura</p>
          <p className="text-white/40 text-[9px]">Catálogo online</p>
        </div>
        <div className="w-8 h-8 rounded-full bg-brand-500 flex items-center justify-center">
          <ShoppingCartSimple size={15} weight="fill" className="text-white" />
        </div>
      </div>
      <div className="px-3 py-3">
        <div className="bg-brand-600 rounded-2xl p-3 mb-3">
          <p className="text-white/70 text-[9px]">Nova coleção</p>
          <p className="text-white text-sm font-bold leading-tight">Compre pelo site ou peça no WhatsApp</p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {products.map((product, index) => (
            <div key={product.name} className={`${index === 2 ? 'col-span-2 flex-row' : 'flex-col'} bg-white border border-zinc-100 rounded-xl p-2 flex gap-2`}>
              <div className={`${index === 2 ? 'w-16 h-14' : 'w-full h-14'} rounded-lg bg-gradient-to-br from-blue-100 via-cyan-100 to-emerald-100 shrink-0`} />
              <div className="flex-1 min-w-0">
                {product.tag && <p className="text-brand-600 text-[8px] font-semibold">{product.tag}</p>}
                <p className="text-zinc-800 text-[10px] font-semibold leading-tight truncate">{product.name}</p>
                <p className="text-zinc-950 text-[11px] font-bold">{product.price}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3 bg-green-500 rounded-xl py-2 flex items-center justify-center gap-1.5">
          <WhatsappLogo size={13} weight="fill" className="text-white" />
          <p className="text-white text-[10px] font-semibold">Finalizar pedido</p>
        </div>
      </div>
    </div>
  )
}

export function CrmMock() {
  const columns = [
    { label: 'Novo', count: 8, color: 'bg-blue-500' },
    { label: 'Contato', count: 5, color: 'bg-amber-500' },
    { label: 'Proposta', count: 3, color: 'bg-green-500' },
  ]

  return (
    <div className="flex flex-col bg-zinc-950 min-h-full px-3 py-4 gap-3">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-brand-500/20 border border-brand-400/30 flex items-center justify-center">
          <Kanban size={15} weight="fill" className="text-brand-400" />
        </div>
        <div>
          <p className="text-white text-[11px] font-semibold">CRM Comercial</p>
          <p className="text-white/40 text-[9px]">Funil de vendas</p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        {columns.map((column) => (
          <div key={column.label} className="bg-white/[0.05] border border-white/[0.08] rounded-xl p-2 min-h-36">
            <div className="flex items-center justify-between gap-1 mb-2">
              <p className="text-white/60 text-[8px] font-semibold">{column.label}</p>
              <span className="text-white/30 text-[8px]">{column.count}</span>
            </div>
            <div className="flex flex-col gap-1.5">
              {[1, 2, 3].map((item) => (
                <div key={item} className="bg-zinc-900 border border-white/[0.06] rounded-lg p-1.5">
                  <div className={`w-4 h-1 rounded-full ${column.color} mb-1`} />
                  <p className="text-white/80 text-[8px] leading-tight">Lead #{item + column.count}</p>
                  <p className="text-white/30 text-[7px]">WhatsApp</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-2.5">
        <p className="text-green-300 text-[10px] font-medium">R$ 18.400 em oportunidades abertas</p>
      </div>
    </div>
  )
}

export function SistemaMock() {
  const rows = [
    ['Pedido #1842', 'Em produção', 'Hoje'],
    ['Cadastro novo', 'Pendente', 'Amanhã'],
    ['Solicitação', 'Concluída', 'Ontem'],
  ]

  return (
    <div className="flex flex-col bg-white min-h-full">
      <div className="bg-zinc-900 px-4 py-3 flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
          <GearSix size={15} weight="fill" className="text-white" />
        </div>
        <div>
          <p className="text-white text-[11px] font-semibold">Sistema Interno</p>
          <p className="text-white/40 text-[9px]">Operação em tempo real</p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 px-3 py-3">
        {[
          ['24', 'tarefas'],
          ['12', 'clientes'],
          ['91%', 'entregas'],
        ].map(([value, label]) => (
          <div key={label} className="bg-zinc-50 border border-zinc-100 rounded-xl p-2">
            <p className="text-zinc-900 text-base font-bold leading-none">{value}</p>
            <p className="text-zinc-400 text-[8px] mt-1">{label}</p>
          </div>
        ))}
      </div>
      <div className="px-3 pb-3">
        <p className="text-zinc-500 text-[9px] font-semibold uppercase tracking-wider mb-2">Fluxo da operação</p>
        <div className="flex flex-col divide-y divide-zinc-100 border border-zinc-100 rounded-xl overflow-hidden">
          {rows.map(([name, status, date]) => (
            <div key={name} className="grid grid-cols-[1fr_auto] gap-2 bg-white px-3 py-2">
              <div>
                <p className="text-zinc-800 text-[10px] font-semibold">{name}</p>
                <p className="text-zinc-400 text-[8px]">{date}</p>
              </div>
              <span className="self-center rounded-full bg-blue-50 text-blue-700 px-2 py-1 text-[8px] font-medium">
                {status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function SaasMock() {
  return (
    <div className="flex flex-col bg-[#08111f] min-h-full px-4 py-4 gap-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white text-[11px] font-semibold">MVP SaaS</p>
          <p className="text-white/40 text-[9px]">Painel do usuário</p>
        </div>
        <div className="w-8 h-8 rounded-lg bg-violet-500/20 border border-violet-400/30 flex items-center justify-center">
          <RocketLaunch size={15} weight="fill" className="text-violet-300" />
        </div>
      </div>
      <div className="bg-gradient-to-br from-violet-600 to-blue-600 rounded-2xl p-3">
        <p className="text-white/70 text-[9px]">Validação</p>
        <p className="text-white font-bold text-lg leading-none mt-1">128 usuários</p>
        <p className="text-white/60 text-[9px] mt-1">+34% nos últimos 7 dias</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {['Onboarding', 'Pagamentos', 'Dashboard', 'Convites'].map((item, index) => (
          <div key={item} className="bg-white/[0.05] border border-white/[0.08] rounded-xl p-2.5">
            <div className={`w-6 h-6 rounded-lg mb-2 ${index % 2 === 0 ? 'bg-violet-400/20' : 'bg-cyan-400/20'}`} />
            <p className="text-white/80 text-[9px] font-medium">{item}</p>
            <p className="text-white/30 text-[8px]">ativo</p>
          </div>
        ))}
      </div>
      <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-2.5">
        <div className="flex items-center gap-2">
          <CheckCircle size={13} weight="fill" className="text-green-400" />
          <p className="text-green-300 text-[10px]">Pronto para testar com clientes</p>
        </div>
      </div>
    </div>
  )
}

export function TrafegoPagoMock() {
  const bars = [55, 72, 40, 88, 64, 76]

  return (
    <div className="flex flex-col bg-zinc-50 min-h-full">
      <div className="bg-blue-700 px-4 py-3 flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center">
          <Megaphone size={15} weight="fill" className="text-white" />
        </div>
        <div>
          <p className="text-white text-[11px] font-semibold">Tráfego Pago</p>
          <p className="text-white/50 text-[9px]">Campanhas ativas</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 px-3 py-3">
        {[
          ['312', 'cliques'],
          ['47', 'leads'],
          ['R$ 8,40', 'custo/lead'],
          ['4,2x', 'retorno'],
        ].map(([value, label]) => (
          <div key={label} className="bg-white border border-zinc-100 rounded-xl p-2.5">
            <p className="text-zinc-900 text-sm font-bold">{value}</p>
            <p className="text-zinc-400 text-[8px]">{label}</p>
          </div>
        ))}
      </div>
      <div className="px-3 pb-3">
        <p className="text-zinc-500 text-[9px] mb-2">Resultados por campanha</p>
        <div className="flex items-end gap-1 h-16 bg-white border border-zinc-100 rounded-xl p-2">
          {bars.map((height, index) => (
            <div key={index} className="flex-1 flex flex-col items-center justify-end gap-1">
              <div className="w-full rounded-sm bg-blue-600" style={{ height: `${height}%` }} />
              <span className="text-zinc-300 text-[7px]">C{index + 1}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function MidiasDigitaisMock() {
  return (
    <div className="flex flex-col bg-zinc-950 min-h-full px-4 py-4 gap-3">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-pink-500/20 border border-pink-400/30 flex items-center justify-center">
          <Images size={15} weight="fill" className="text-pink-300" />
        </div>
        <div>
          <p className="text-white text-[11px] font-semibold">Mídias Digitais</p>
          <p className="text-white/40 text-[9px]">Posts, carrosséis e anúncios</p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        {Array.from({ length: 9 }).map((_, index) => (
          <div
            key={index}
            className={`aspect-square rounded-lg border border-white/10 ${
              index % 3 === 0
                ? 'bg-gradient-to-br from-pink-500 to-orange-400'
                : index % 3 === 1
                  ? 'bg-gradient-to-br from-blue-500 to-cyan-400'
                  : 'bg-gradient-to-br from-zinc-700 to-zinc-900'
            }`}
          >
            <div className="h-full p-1.5 flex flex-col justify-between">
              <div className="w-4 h-1 rounded-full bg-white/60" />
              <div className="space-y-1">
                <div className="w-full h-1 rounded-full bg-white/50" />
                <div className="w-2/3 h-1 rounded-full bg-white/30" />
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {[
          ['12', 'posts'],
          ['4', 'carrosséis'],
          ['6', 'anúncios'],
        ].map(([value, label]) => (
          <div key={label} className="bg-white/[0.05] border border-white/[0.08] rounded-xl p-2 text-center">
            <p className="text-white font-bold text-sm leading-none">{value}</p>
            <p className="text-white/35 text-[8px] mt-1">{label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

export const MOCKUP_MAP: Record<string, React.ComponentType> = {
  Link: LinkBioMock,
  ForkKnife: CardapioMock,
  Funnel: LeadCaptureMock,
  EnvelopeSimple: EmailMock,
  ChartBar: RelatorioMock,
  Star: AvaliacoesMock,
  Wrench: ManutencaoMock,
  SquaresFour: SiteMultiMock,
  CalendarCheck: AgendamentoMock,
  Robot: ChatbotMock,
  ShoppingCartSimple: EcommerceMock,
  Kanban: CrmMock,
  GearSix: SistemaMock,
  RocketLaunch: SaasMock,
  Megaphone: TrafegoPagoMock,
  Images: MidiasDigitaisMock,
}

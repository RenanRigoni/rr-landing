export const SITE_CONFIG = {
  name: 'RR.dev',
  tagline: 'Presença digital que gera contatos de verdade.',
  description:
    'Criação de sites profissionais e landing pages para negócios locais em Patrocínio/MG. Google Empresa, presença digital completa e manutenção mensal. Entrega em 7 dias. Fale no WhatsApp.',
  url: 'https://rr-dev.vercel.app', // trocar pelo domínio final
  city: 'Patrocínio',
  state: 'MG',
  phone: '34991415238',
  email: 'renan.rigoni@gmail.com',
  whatsappMessage: 'Olá! Vim pelo site e quero saber mais sobre os serviços.',
  lat: '-18.9442',
  lng: '-46.9928',
} as const

export const WHATSAPP_URL = `https://wa.me/55${SITE_CONFIG.phone}?text=${encodeURIComponent(
  SITE_CONFIG.whatsappMessage
)}`

export const FAQ_ITEMS = [
  {
    question: 'Preciso entender de tecnologia para contratar?',
    answer:
      'Não. Você só precisa me contar sobre seu negócio em uma conversa de 30 minutos. O resto — código, hospedagem, domínio e configuração — é comigo.',
  },
  {
    question: 'Quanto tempo demora para criar um site profissional?',
    answer:
      'Google Empresa: ativo em 1 dia útil. Pacotes com site: 5 a 7 dias úteis após o briefing.',
  },
  {
    question: `Qual é o preço para criar um site em ${SITE_CONFIG.city}?`,
    answer:
      'Os pacotes começam em R$797 (Google Empresa + configuração) e R$1.797 para landing page profissional completa com Google Empresa, copy incluso e 30 dias de suporte.',
  },
  {
    question: 'Vocês atendem que tipo de negócio?',
    answer: `Atendemos negócios locais em ${SITE_CONFIG.city}: clínicas, consultórios, lojas, salões, prestadores de serviço e profissionais autônomos que querem aparecer no Google e receber mais clientes pelo WhatsApp.`,
  },
  {
    question: 'Posso pagar parcelado?',
    answer:
      'Sim. Aceitamos cartão de crédito parcelado e PIX. Entre em contato pelo WhatsApp para combinar a melhor forma.',
  },
  {
    question: 'Já tenho um site. Vale refazer ou reformar?',
    answer:
      'Depende. Me manda o link no WhatsApp e faço uma avaliação rápida gratuita. Se o que você tem ainda tem aproveitamento, te digo. Se não, te explico por quê e o que faz mais sentido.',
  },
  {
    question: 'O que acontece depois que o site é entregue?',
    answer:
      'Você tem suporte incluído (15 ou 30 dias dependendo do pacote). Para quem quer parceria contínua, há o Pacote Parceria Digital com manutenção mensal.',
  },
] as const

export const PRICING_PLANS = [
  {
    name: 'Presença Local',
    tagline: 'Apareça no Google a partir de amanhã.',
    price: '797',
    period: null,
    highlight: false,
    badge: null,
    features: [
      'Configuração completa do Google Empresa',
      'Descrição profissional do negócio',
      'Fotos, horários e serviços configurados',
      'Link direto para WhatsApp no perfil',
      'Briefing de 30 minutos',
      '15 dias de suporte',
    ],
    bonus: 'Guia: como pedir avaliações no Google',
    cta: 'Quero Presença Local',
  },
  {
    name: 'Presença Profissional',
    tagline: 'Site + Google. Clientes te encontram e chamam.',
    price: '1.797',
    period: null,
    highlight: true,
    badge: 'Mais vendido',
    features: [
      'Landing page profissional completa',
      'Google Empresa configurado e otimizado',
      'Copy escrito por mim (você não escreve nada)',
      'Botão de WhatsApp rastreável',
      'Imagens profissionais incluídas',
      'SEO básico e hospedagem configurada',
      '30 dias de ajustes e suporte',
    ],
    bonus: 'Análise dos 3 maiores concorrentes + Bio do Instagram',
    cta: 'Quero este pacote',
  },
  {
    name: 'Parceria Digital',
    tagline: 'Presença completa + alguém cuidando todo mês.',
    price: '2.497',
    period: '+ R$297/mês',
    highlight: false,
    badge: null,
    features: [
      'Site completo até 5 páginas',
      'Google Empresa + estratégia de avaliações',
      'Copy completo por mim',
      '1 mês de manutenção incluso',
      'Relatório mensal de desempenho',
      'Suporte prioritário (resposta em 4h)',
    ],
    bonus: 'Página de depoimentos + Link WhatsApp inteligente + 1h consultoria',
    cta: 'Quero Parceria Digital',
  },
] as const

export const FEATURES = [
  {
    icon: 'User',
    title: 'Você fala direto com o dev',
    description:
      'Sem atendente, sem gerente de conta. Do briefing à entrega, é você e eu.',
  },
  {
    icon: 'Timer',
    title: 'Entrega em até 7 dias úteis',
    description:
      'Não 3 meses. Não "quando a equipe tiver disponibilidade". Sete dias.',
  },
  {
    icon: 'WhatsappLogo',
    title: 'Foco em contatos reais',
    description:
      'Site bonito que não gera contato não serve. Cada escolha visa fazer seu WhatsApp tocar.',
  },
  {
    icon: 'MicrophoneStage',
    title: 'Briefing de 30 minutos',
    description:
      'Você fala, eu escrevo e estruturo. Você não precisa saber o que colocar no site.',
  },
  {
    icon: 'Star',
    title: 'Linguagem simples, sem jargão',
    description:
      'Você vai entender tudo o que eu entregar. Sem termos técnicos, sem surpresas.',
  },
  {
    icon: 'HandshakeLogo',
    title: 'Não sumimos depois de entregar',
    description:
      'Todo pacote inclui suporte. Se precisar ajustar algo, estou aqui.',
  },
] as const

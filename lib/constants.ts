export const SITE_CONFIG = {
  name: 'dev.RR',
  tagline: 'Presença digital que gera contatos de verdade.',
  description:
    'Criação de sites e landing pages para negócios locais em todo o Brasil. Google Empresa, presença digital completa e entrega em 7 dias. Atendimento online. Fale no WhatsApp.',
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
    question: 'Qual é o preço para criar um site profissional?',
    answer:
      'Os pacotes começam em R$797 (Google Empresa + configuração) e R$1.797 para landing page profissional completa com Google Empresa, copy incluso e 30 dias de suporte.',
  },
  {
    question: 'Vocês atendem que tipo de negócio?',
    answer: `Atendo negócios locais de qualquer cidade do Brasil — clínicas, consultórios, lojas, salões, prestadores de serviço e profissionais autônomos. Sou de ${SITE_CONFIG.city}/${SITE_CONFIG.state}, mas executo tudo remotamente via call online. Briefing, aprovação e entrega: 100% à distância.`,
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

export const SOLUTION_PACKAGES = [
  {
    icon: 'ShoppingCartSimple',
    name: 'Vendas Online',
    tagline: 'Para transformar presença digital em pedido, orçamento ou compra.',
    price: '4.997',
    period: null,
    highlight: false,
    badge: null,
    features: [
      'E-commerce inicial com catálogo organizado',
      'Fluxo de pedido, pagamento ou orçamento',
      'Páginas essenciais para vender com confiança',
      'Base de mídias digitais para lançamento',
    ],
    bonus: 'Ideal para lojas, marcas locais e serviços que querem vender online',
    cta: 'Quero vender online',
  },
  {
    icon: 'Kanban',
    name: 'Operação Comercial',
    tagline: 'Para captar, organizar e acompanhar oportunidades comerciais.',
    price: '3.497',
    period: null,
    highlight: true,
    badge: 'Solução completa',
    features: [
      'CRM simples ajustado ao seu processo',
      'Funil de vendas com etapas e responsáveis',
      'Formulários de captação conectados ao fluxo',
      'Painel básico para acompanhar oportunidades',
    ],
    bonus: 'Organiza atendimento, follow-up e histórico de contatos em um só lugar',
    cta: 'Quero organizar vendas',
  },
  {
    icon: 'Megaphone',
    name: 'Crescimento Digital Mensal',
    tagline: 'Para manter tráfego, conteúdo e acompanhamento rodando todo mês.',
    price: '997',
    period: '/mês + verba',
    highlight: false,
    badge: null,
    features: [
      'Gestão de campanhas de tráfego pago',
      'Posts, carrosséis e artes para anúncios',
      'Ajustes mensais com foco em captação',
      'Relatório com resultados e próximos passos',
    ],
    bonus: 'Une aquisição de clientes, conteúdo profissional e leitura de resultados',
    cta: 'Quero crescer todo mês',
  },
] as const

export const EXTRA_SERVICES = [
  {
    category: 'Entregáveis rápidos',
    items: [
      {
        icon: 'Link',
        name: 'Link de bio personalizado',
        description: 'Página única com todos os seus links: Instagram, WhatsApp, site e cardápio. Substitui o Linktree com identidade visual do seu negócio.',
        price: '297',
        period: null,
        cta: 'Quero meu link de bio',
      },
      {
        icon: 'ForkKnife',
        name: 'Cardápio digital com QR Code',
        description: 'Cardápio bonito acessado por QR code. Perfeito para restaurantes, lanchonetes e bares. Fácil de atualizar quando quiser.',
        price: '697',
        period: null,
        cta: 'Quero cardápio digital',
      },
      {
        icon: 'Funnel',
        name: 'Página de captura de leads',
        description: 'Formulário que coleta WhatsApp ou e-mail do visitante e te notifica em tempo real. Integra no site existente ou funciona standalone.',
        price: '497',
        period: null,
        cta: 'Quero capturar leads',
      },
      {
        icon: 'EnvelopeSimple',
        name: 'E-mail profissional',
        description: 'Configuração de contato@seudominio.com.br via Google Workspace ou Zoho. Você para de usar Gmail para falar com clientes.',
        price: '297',
        period: null,
        cta: 'Quero e-mail profissional',
      },
    ],
  },
  {
    category: 'Serviços mensais',
    items: [
      {
        icon: 'ChartBar',
        name: 'Relatório de presença digital',
        description: 'Todo mês você recebe um relatório com cliques no WhatsApp, visualizações no Google Empresa e posição local. Sabe o que está funcionando.',
        price: '147',
        period: '/mês',
        cta: 'Quero relatório mensal',
      },
      {
        icon: 'Star',
        name: 'Gestão de avaliações Google',
        description: 'Campanha mensal para pedir avaliações dos clientes do seu negócio. Mais reviews = mais visibilidade no Google Maps.',
        price: '197',
        period: '/mês',
        cta: 'Quero mais avaliações',
      },
      {
        icon: 'Wrench',
        name: 'Manutenção de conteúdo',
        description: 'Troca de fotos, promoções sazonais, atualização de horários e serviços. Seu site sempre atualizado sem você precisar mexer.',
        price: '247',
        period: '/mês',
        cta: 'Quero manutenção',
      },
      {
        icon: 'Megaphone',
        name: 'Gestão de tráfego pago',
        description: 'Configuração, acompanhamento e otimização de campanhas no Google ou Meta Ads para gerar visitas, leads e conversas no WhatsApp.',
        price: '697',
        period: '/mês + verba',
        cta: 'Quero tráfego pago',
      },
      {
        icon: 'Images',
        name: 'Mídias digitais para redes sociais',
        description: 'Criação de posts, carrosséis e artes para anúncios com identidade visual profissional para Instagram, Facebook e campanhas pagas.',
        price: '497',
        period: '/mês',
        cta: 'Quero mídias digitais',
      },
    ],
  },
  {
    category: 'Projetos completos',
    items: [
      {
        icon: 'SquaresFour',
        name: 'Site multi-página',
        description: 'Site completo com até 5 páginas: Home, Sobre, Serviços, Blog e Contato. Copy incluso, domínio e hospedagem configurados.',
        price: '3.997',
        period: null,
        cta: 'Quero site completo',
      },
      {
        icon: 'ShoppingCartSimple',
        name: 'Criação de e-commerce',
        description: 'Loja virtual com catálogo, páginas de produto, fluxo de pedido e configuração inicial de pagamento ou orçamento pelo WhatsApp.',
        price: '4.997',
        period: null,
        cta: 'Quero e-commerce',
      },
      {
        icon: 'Kanban',
        name: 'CRM comercial personalizado',
        description: 'Organização de leads, etapas de venda, responsáveis e histórico de contatos para o time parar de perder oportunidades no WhatsApp.',
        price: '2.497',
        period: null,
        cta: 'Quero CRM',
      },
      {
        icon: 'GearSix',
        name: 'Sistema personalizado',
        description: 'Sistema sob medida para automatizar processos internos, cadastros, solicitações, acompanhamento de tarefas ou operação comercial.',
        price: '5.997',
        period: null,
        cta: 'Quero sistema sob medida',
      },
      {
        icon: 'RocketLaunch',
        name: 'Solução SaaS ou MVP digital',
        description: 'Primeira versão funcional de um produto digital, painel ou plataforma SaaS para validar uma ideia com usuários reais.',
        price: '8.997',
        period: null,
        cta: 'Quero criar um SaaS',
      },
      {
        icon: 'CalendarCheck',
        name: 'Integração de agendamento online',
        description: 'Conecta Google Calendar ou Calendly ao seu site. Clientes agendam sozinhos, você recebe notificação. Ideal para clínicas e salões.',
        price: '797',
        period: null,
        cta: 'Quero agendamento online',
      },
      {
        icon: 'Robot',
        name: 'Chatbot de boas-vindas no WhatsApp',
        description: 'Mensagem automática quando alguém te manda WhatsApp fora do horário. Nenhum contato fica sem resposta.',
        price: '997',
        period: null,
        cta: 'Quero chatbot no WhatsApp',
      },
    ],
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

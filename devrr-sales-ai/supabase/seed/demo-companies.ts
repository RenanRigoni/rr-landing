/**
 * Catálogo de empresas do seed de demonstração: nomes comerciais reais de
 * Uberlândia e Patrocínio (MG), levantados em buscadores e guias locais
 * públicos, agrupados pelos nichos que a DevRR prospecta. Só nome fantasia —
 * nenhuma entrada é nome de pessoa física (LGPD). Contatos, telefones e
 * histórico comercial gerados em `demo-data.ts` são fictícios.
 *
 * `CLIENT_COMPANIES` são clientes reais da DevRR (negócios fechados de
 * verdade); o resto do funil é simulado.
 */

export type DemoCity = 'Uberlândia' | 'Patrocínio'

export type DemoNiche =
  | 'estetica'
  | 'odonto'
  | 'moveis'
  | 'climatizacao'
  | 'solar'
  | 'viagens'
  | 'varejo'
  | 'saude'

export interface DemoCompany {
  name: string
  city: DemoCity
  niche: DemoNiche
  /** Site público conhecido; `null` = não levantado (o dossiê marca como não identificado). */
  website: string | null
}

const UDI: DemoCity = 'Uberlândia'
const PTC: DemoCity = 'Patrocínio'

function c(name: string, city: DemoCity, niche: DemoNiche, website: string | null = null): DemoCompany {
  return { name, city, niche, website }
}

export const PROSPECT_COMPANIES: readonly DemoCompany[] = [
  // Uberlândia — estética
  c('NuFace Uberlândia', UDI, 'estetica', 'https://nufaceoficial.com.br'),
  c('Royal Face Uberlândia', UDI, 'estetica', 'https://royalface.com.br'),
  c('GF Estética', UDI, 'estetica', 'https://gfestetica.com.br'),
  c('Skyn Estética Avançada', UDI, 'estetica', 'https://skynestetica.com.br'),
  c('Clínica Stark', UDI, 'estetica', 'https://clinicastark.com.br'),
  c('Sâmara Estética Avançada', UDI, 'estetica', 'https://samaraestetica.com'),
  c('Complexo Felice', UDI, 'estetica', 'https://complexofelice.com.br'),
  c('Lift Bella Estética Avançada', UDI, 'estetica'),
  c('Solaris Clínica', UDI, 'estetica'),
  // Uberlândia — odontologia
  c('Perfil Clínica Odontológica', UDI, 'odonto', 'https://perfilclinica.com.br'),
  c('Be Clinic Odontologia', UDI, 'odonto', 'https://beclinicodontologia.com.br'),
  c('TOP Clínica Odontológica', UDI, 'odonto', 'https://www.topclinicaodontologica.com'),
  c('WIT Odontologia Digital', UDI, 'odonto', 'https://witodontologia.com.br'),
  c('Clinort Care', UDI, 'odonto', 'https://www.clinortcareodonto.com.br'),
  c('CEO Odonto', UDI, 'odonto', 'https://ceoodonto.com'),
  c('OdontoCompany Uberlândia Centro', UDI, 'odonto', 'https://odontocompany.com/uberlandia'),
  c('Odontomed Uberlândia', UDI, 'odonto'),
  // Uberlândia — móveis planejados
  c('JD Móveis Planejados', UDI, 'moveis'),
  c('Todeschini Uberlândia', UDI, 'moveis', 'https://uberlandia.todeschini.com.br'),
  c('Atmosphera Ambientes Planejados', UDI, 'moveis', 'https://atmospheraplanejados.com.br'),
  c('Classe A Móveis Planejados', UDI, 'moveis'),
  c('Dimare Uberlândia', UDI, 'moveis', 'https://dimareudi.com.br'),
  c('Lamoplan Interiores', UDI, 'moveis', 'https://lamoplan.com.br'),
  c('Atalaia Móveis Planejados', UDI, 'moveis'),
  c('Cacique Móveis Planejados', UDI, 'moveis'),
  c('RG Móveis Planejados', UDI, 'moveis'),
  c('Eros Móveis Planejados', UDI, 'moveis'),
  c('Vidal Lux Móveis Planejados', UDI, 'moveis'),
  c('La Maison Móveis Planejados', UDI, 'moveis'),
  // Uberlândia — ar e refrigeração
  c('REA Ar Condicionado', UDI, 'climatizacao', 'https://reaarcondicionado.com.br'),
  c('Cool Ar Condicionados', UDI, 'climatizacao', 'https://coolarcondicionados.com.br'),
  c('Toninho Ar Condicionado', UDI, 'climatizacao', 'https://toninhoarcondicionado.com.br'),
  c('Mega Clima Climatização', UDI, 'climatizacao', 'https://www.megaclimaclimatiza.com'),
  c('Maximus Instalações e Reformas', UDI, 'climatizacao', 'https://www.maximusinstalacoesreformas.com'),
  c('TIS Infraestrutura', UDI, 'climatizacao', 'https://tisinfraestrutura.com.br'),
  c('Climatizar Uberlândia', UDI, 'climatizacao', 'https://www.climatizaruberlandia.com.br'),
  c('FRIOAR Engenharia e Climatização', UDI, 'climatizacao', 'https://www.frioar.net'),
  c('Darlei Ar-Condicionado', UDI, 'climatizacao'),
  // Uberlândia — energia solar
  c('Romasol Engenharia', UDI, 'solar'),
  c('Solazzi Energia Solar', UDI, 'solar', 'https://solazzi.com.br'),
  c('Solar-e Engenharia', UDI, 'solar', 'https://solare.eng.br'),
  c('Ecos Energia Solar', UDI, 'solar', 'https://www.ecosenergiasolar.com.br'),
  c('FM Soluções em Energia', UDI, 'solar', 'https://fmsolucoesemenergia.com.br'),
  c('Solarium Energia Solar', UDI, 'solar', 'https://solariumenergia.com'),
  c('Inovati Energia', UDI, 'solar', 'https://inovatisolar.com.br'),
  c('3MCE Energia Solar', UDI, 'solar', 'https://www.3mcesolar.com.br'),
  c('Reluze Soluções Sustentáveis', UDI, 'solar', 'https://www.reluze.eco.br'),
  // Uberlândia — agências de viagens
  c('Meridianos Agência de Viagens', UDI, 'viagens', 'https://www.meridianosturismo.com.br'),
  c('Taian Viagens', UDI, 'viagens', 'https://taianviagens.com.br'),
  c('World Travel Turismo', UDI, 'viagens', 'https://www.worldtravel.tur.br'),
  c('Home Tour Uberlândia', UDI, 'viagens'),
  c('Casa do Turismo', UDI, 'viagens'),
  c('Link Turismo', UDI, 'viagens'),
  c('Master Turismo', UDI, 'viagens'),
  c('Milenium Turismo', UDI, 'viagens'),
  c('Nova Turismo', UDI, 'viagens'),
  c('Recantos do Brasil Turismo', UDI, 'viagens'),
  c('Sem Fronteiras Turismo', UDI, 'viagens'),
  c('STB Uberlândia', UDI, 'viagens'),
  // Patrocínio — estética
  c('Mais Você Saúde e Estética', PTC, 'estetica'),
  c('Clínica Lumi Estética e Saúde', PTC, 'estetica'),
  c('Dermaclin', PTC, 'estetica'),
  c('Dermah Estética', PTC, 'estetica'),
  c('Domingos Centro de Estética', PTC, 'estetica'),
  c('Levemente Centro de Estética e Bem-Estar', PTC, 'estetica'),
  c('Spazi Clínica de Estética', PTC, 'estetica'),
  c('SAL Estética Corporal e Facial', PTC, 'estetica'),
  c('Beatriz Fisio Estética', PTC, 'estetica'),
  // Patrocínio — odontologia
  c('Inova Odonto Patrocínio', PTC, 'odonto'),
  c('Oral Vert Odontologia', PTC, 'odonto', 'https://oralvert.com.br'),
  c('RC Odontologia Especializada', PTC, 'odonto', 'https://rcodontologiaespecializada.com.br'),
  c('OdontoCompany Patrocínio', PTC, 'odonto', 'https://odontocompany.com/patrocinio'),
  c('Sorria com + Saúde', PTC, 'odonto', 'https://sorriacommaissaude.com.br'),
  c('Vamos Sorrir Patrocínio', PTC, 'odonto', 'https://www.vamossorrirmg.com.br'),
  c('Odonto Vida', PTC, 'odonto'),
  c('MedicMais Clínica Médica e Odontológica', PTC, 'odonto'),
  // Patrocínio — móveis planejados
  c('Lindomar Móveis', PTC, 'moveis'),
  c('Indústria de Móveis Patrocínio', PTC, 'moveis'),
  c('Borges Marcenaria & Interiores', PTC, 'moveis'),
  c('Beca Móveis', PTC, 'moveis'),
  c('Excelência Móveis Planejados', PTC, 'moveis'),
  c('GS Móveis Planejados', PTC, 'moveis'),
  c('Caixeta Móveis Planejados', PTC, 'moveis'),
  c('Decorart Móveis Planejados', PTC, 'moveis'),
  c('Martins Silva Móveis Planejados', PTC, 'moveis'),
  c('Móveis Wenceslau', PTC, 'moveis'),
  c('Estúdio Mendes Lab', PTC, 'moveis'),
  // Patrocínio — ar e refrigeração
  c('Climatiza Ar', PTC, 'climatizacao'),
  c('Macaúba Ar Condicionado', PTC, 'climatizacao'),
  c('Conceito Ar Climatização', PTC, 'climatizacao'),
  // Patrocínio — energia solar
  c('Fly Energy Brasil', PTC, 'solar', 'https://flyenergybrasil.com.br'),
  c('EcoSisters Energia Solar', PTC, 'solar'),
  c('Projetar Energia Solar', PTC, 'solar'),
  // Patrocínio — agências de viagens
  c('Geotour Viagens e Turismo', PTC, 'viagens'),
  c('Giltur Minas', PTC, 'viagens'),
  c('Planeta Turismo', PTC, 'viagens'),
  c('Bravura Viagens e Turismo', PTC, 'viagens'),
  c('Trajetus Turismo', PTC, 'viagens'),
  c('Milhaz Viagens', PTC, 'viagens'),
  c('Disque Passagens Patrocínio', PTC, 'viagens'),
]

export const CLIENT_COMPANIES = {
  socialTernos: c('Social Ternos', PTC, 'varejo', 'https://socialternos.com.br'),
  mariaAmelia: c('Maria Amélia Estética & Bem-Estar', PTC, 'estetica', 'https://mariaameliaestetica.com.br'),
  alicerce: c('Alicerce Centro Terapêutico', PTC, 'saude'),
  madri: c('Madri Perfumaria', PTC, 'varejo', 'https://madriperfumaria.com.br'),
} as const

export type ClientKey = keyof typeof CLIENT_COMPANIES

export interface NicheService {
  title: string
  interest: string
  /** Faixa em reais inteiros. */
  min: number
  max: number
}

/** Serviços que a DevRR oferece em cada nicho prospectado. Tabela da DevRR: landing page a partir de R$ 1.200, sistemas a partir de R$ 3.000. */
export const NICHE_SERVICES: Record<Exclude<DemoNiche, 'varejo' | 'saude'>, readonly NicheService[]> = {
  estetica: [
    { title: 'Landing page de procedimentos', interest: 'Landing page', min: 1200, max: 2200 },
    { title: 'Site com agendamento online', interest: 'Sistema de agendamento', min: 3000, max: 5000 },
    { title: 'Google Meu Negócio + SEO local', interest: 'SEO local', min: 900, max: 1500 },
  ],
  odonto: [
    { title: 'Site com página por tratamento', interest: 'Website', min: 1800, max: 3200 },
    { title: 'Landing page de implantes e lentes', interest: 'Landing page', min: 1200, max: 2200 },
    { title: 'Agendamento online de avaliações', interest: 'Sistema de agendamento', min: 3000, max: 5500 },
  ],
  moveis: [
    { title: 'Catálogo digital de projetos', interest: 'Website', min: 1800, max: 3000 },
    { title: 'Landing page de captação de orçamentos', interest: 'Landing page', min: 1200, max: 2000 },
    { title: 'CRM próprio de orçamentos e obras', interest: 'CRM próprio', min: 3500, max: 7000 },
  ],
  climatizacao: [
    { title: 'Site com orçamento via WhatsApp', interest: 'Website', min: 1500, max: 2600 },
    { title: 'Agenda de instalação e manutenção (PMOC)', interest: 'Sistema de agendamento', min: 3000, max: 5000 },
    { title: 'Google Meu Negócio + SEO local', interest: 'SEO local', min: 900, max: 1500 },
  ],
  solar: [
    { title: 'Simulador de economia na conta de luz', interest: 'Landing page', min: 1800, max: 3000 },
    { title: 'CRM próprio de propostas solares', interest: 'CRM próprio', min: 3500, max: 7500 },
    { title: 'Site institucional com cases de usinas', interest: 'Website', min: 2000, max: 3500 },
  ],
  viagens: [
    { title: 'Vitrine de pacotes com WhatsApp', interest: 'Website', min: 1800, max: 3200 },
    { title: 'Landing page de pacote temático', interest: 'Landing page', min: 1200, max: 1800 },
    { title: 'Automação de atendimento no WhatsApp', interest: 'Automação', min: 3000, max: 4500 },
  ],
}

/** Gargalo digital típico do nicho — usado na abordagem, no diagnóstico e no dossiê. */
export const NICHE_GAP: Record<DemoNiche, string> = {
  estetica: 'agendamento só por direct, sem página por procedimento',
  odonto: 'sem página específica para implantes e lentes',
  moveis: 'portfólio só no Instagram, sem captação de orçamento',
  climatizacao: 'orçamento depende de ligação, WhatsApp escondido',
  solar: 'sem simulador de economia; proposta montada em planilha',
  viagens: 'pacotes espalhados em posts, sem vitrine navegável',
  varejo: 'catálogo sem filtro nem link direto de compra',
  saude: 'agenda controlada em papel e WhatsApp',
}

/** Termo de busca usado na prospecção (origem do dossiê). */
export const NICHE_SEARCH_QUERY: Record<DemoNiche, string> = {
  estetica: 'clínica de estética',
  odonto: 'dentista',
  moveis: 'móveis planejados',
  climatizacao: 'instalação de ar condicionado',
  solar: 'energia solar',
  viagens: 'agência de viagens',
  varejo: 'loja',
  saude: 'clínica',
}

export interface NavItem {
  label: string
  href: string
}

export interface NavGroup {
  label: string
  items: NavItem[]
}

export const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Operação',
    items: [
      { label: 'Meu Dia', href: '/my-day' },
      { label: 'Pipeline', href: '/pipeline' },
      { label: 'Empresas', href: '/companies' },
      { label: 'Contatos', href: '/contacts' },
    ],
  },
  {
    label: 'Análise',
    items: [
      { label: 'Dashboard', href: '/dashboard' },
      { label: 'SQL Learning', href: '/analytics/sql-learning' },
    ],
  },
  {
    label: 'IA',
    items: [
      { label: 'Qualidade de IA', href: '/ai-quality' },
      { label: 'Prompt Lab', href: '/prompt-lab' },
    ],
  },
  {
    label: 'Conhecimento',
    items: [
      { label: 'Processos', href: '/processes' },
      { label: 'Playbooks', href: '/playbooks' },
      { label: 'Glossário', href: '/glossary' },
    ],
  },
  {
    label: 'Configuração',
    items: [{ label: 'Settings', href: '/settings' }],
  },
]

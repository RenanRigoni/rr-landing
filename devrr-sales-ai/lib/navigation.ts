export interface NavItem {
  label: string
  href: string
}

export interface NavGroup {
  label: string
  items: NavItem[]
}

// Item de menu só aparece quando o módulo existe de verdade (ARCHITECTURE.md
// → Rotas). /leads entrou na tarefa 3.5 — Contatos e Configurações entram
// conforme o resto da Fase 3 for completado.
export const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Operação',
    items: [
      { label: 'Hoje', href: '/today' },
      { label: 'Leads', href: '/leads' },
    ],
  },
]

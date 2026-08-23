export interface NavItem {
  label: string
  href: string
}

export interface NavGroup {
  label: string
  items: NavItem[]
}

// Item de menu só aparece quando o módulo existe de verdade (ARCHITECTURE.md
// → Rotas). Nesta fase só /today existe — Leads, Contatos e Configurações
// entram conforme as Fases 2/3 forem completadas.
export const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Operação',
    items: [{ label: 'Hoje', href: '/today' }],
  },
]

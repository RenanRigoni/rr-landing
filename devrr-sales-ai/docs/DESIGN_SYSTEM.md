# Design System — DevRR Sales AI

Fonte da marca: `../../DESIGN.md` (raiz do repo) e `../../brand-guide.html`.
Logos: `../../logos/`.

**Tokens são herdados. Componentes não são.**

O `DESIGN.md` da raiz descreve a linguagem visual do `rr-landing` — um site de
marketing: hero gigante, glow ambiente, orbs desfocados, fade-up em scroll, cards
com muito respiro. Isso vende. Não é o que o dono da PME quer olhar às 8h da manhã
pra descobrir quem ele precisa responder hoje.

Este produto é uma **ferramenta operacional densa**, referência Linear/Pipedrive:
muita informação por tela, leitura rápida, zero enfeite. Mesma marca, outro registro.

## O que herdar, sem mudar

### Cores

Copiar os tokens de `../../tailwind.config.ts` sem alteração:

| Token | Hex | Uso no produto |
|---|---|---|
| `surface` | `#07070F` | fundo da aplicação |
| `surface-muted` | `#0B0B16` | sidebar, cabeçalho de tabela |
| `surface-elevated` | `#10101E` | cards, linhas de lista, painéis |
| `surface-card` | `#0E1428` | card em destaque (ação vencida, lead quente) |
| `brand-600` | `#2563EB` | ação primária: botão principal, link ativo |
| `brand-500` | `#3B82F6` | hover |
| `brand-400` | `#60A5FA` | ícone ativo, texto em destaque, valor selecionado |
| `content-primary` | `#F1F5F9` | título, nome de lead, valor |
| `content-secondary` | `#94A3B8` | descrição, corpo secundário |
| `content-muted` | `#64748B` | label, metadado, timestamp |
| emerald `#10B981` | | ganho, respondido, WhatsApp, feito |
| red `#F87171` | | perdido, atrasado, erro |
| amber `#FBBF24` | | vence hoje, atenção, aguardando |

### Fontes

| Família | Peso | Onde |
|---|---|---|
| Plus Jakarta Sans | 400/500/600/700 | **tudo** de texto e UI |
| DM Mono | 500 | **todo dado numérico**: valor, data, hora, contagem, telefone, score |
| Bricolage Grotesque | 800 | apenas tela de login e estados vazios grandes |

**DM Mono em todo número é a regra visual mais importante do produto.** É o que
separa "ferramenta de dados" de "site bonito". `R$ 2.500,00`, `há 4 dias`,
`14:30`, `(11) 98888-7777`, `12 leads` — tudo mono, tudo alinhado.

`font-display` (Bricolage) praticamente não aparece. Se você está usando em uma tela
de trabalho, está errado.

### Ícones

Phosphor Icons (`@phosphor-icons/react`), já é dependência do CRM-RR.
`weight="regular"` como padrão na UI operacional — `light` some em densidade alta,
`fill` só em estado ativo/selecionado, `bold` em setas.

### Logo

- Sidebar expandida: `logo-wordmark-color.svg`, altura 20px.
- Sidebar colapsada / favicon 32px+: `logo-icon-color.svg`.
- Favicon 16px: `logo-monogram-color.svg`.
- Tela de login: `logo-primary-color.svg`, largura 180px.
- Sempre sobre fundo escuro. Nunca a variante `-color` em fundo claro.

## O que NÃO herdar

| Da landing | Por quê não |
|---|---|
| `rounded-card` (2rem) em tudo | rem demais em componente denso. Reservado a modal e painel de página. Card de lead usa `rounded-lg`; linha de lista, `rounded-md`. |
| Glow (`shadow-glow-brand`, orbs `blur-[100px]`) | decoração. Custa GPU e não informa nada. **Zero glow no produto.** |
| `animate-fade-up` em scroll | numa lista de 40 leads isso é náusea. Sem animação de entrada. |
| `animate-float` | idem. |
| `py-24` de ritmo de seção | densidade operacional usa `py-4`/`py-6`. |
| Hero com `clamp(2.75rem, 6vw, 5.5rem)` | não existe hero aqui. Maior título de tela: `text-xl`. |
| Glassmorphism | já era anti-pattern na landing. Continua sendo. |

## Escala tipográfica do produto

| Papel | Classe | Fonte |
|---|---|---|
| Título de página | `text-xl font-semibold tracking-tight` | sans |
| Título de seção/card | `text-sm font-semibold` | sans |
| Corpo | `text-sm` | sans |
| Label / metadado | `text-xs text-content-muted` | sans |
| Micro-label (uppercase) | `text-[10px] uppercase tracking-[0.12em] text-content-muted` | sans |
| **Qualquer número** | classe + `font-mono` | **DM Mono** |
| Valor em destaque (KPI) | `text-2xl font-mono font-medium` | DM Mono |

## Componentes-chave do MVP

### Linha de ação (tela Hoje) — o componente mais importante do produto

```
┌──────────────────────────────────────────────────────────────┐
│ [tipo] Carlos Mendes · Landing page loja de móveis           │
│        Follow-up 2 de 3 · proposta enviada há 3 dias         │
│                                    R$ 2.500  09:00  [Abrir]  │
└──────────────────────────────────────────────────────────────┘
```

- Fundo `surface-elevated`, borda `border-white/[0.06]`, `rounded-lg`, `px-4 py-3`.
- Faixa de 2px à esquerda indicando urgência: atrasado `red-400`, hoje `amber-400`,
  futuro `brand-400`.
- Valor e horário em `font-mono`.
- Hover: borda vai para `brand-400/30`, sem escala, sem sombra. `transition-colors`
  com `ease-spring`, 150ms.
- Alvo de toque ≥ 44px de altura.

### Badge de estágio

`rounded-pill px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em]`
com a cor definida em `pipeline_stages.color`. Fallback `bg-white/[0.06]
text-content-secondary`.

### Botão primário

`rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white
hover:bg-brand-500` — **sem** `rounded-pill`, **sem** `hover:scale`, **sem**
`shadow-glow`. Pill e glow ficam na landing.

### Estado vazio

Sem ilustração genérica. Uma frase que diz o que fazer e um botão que faz:

> **Nenhuma ação para hoje.**
> Isso é bom — ou você ainda não cadastrou leads.
> `[Novo lead]`

Título em `font-display` (única aparição legítima dela no produto).

## Acessibilidade

- Contraste mínimo AA. `content-muted` (`#64748B`) sobre `surface` (`#07070F`) dá
  ~6.4:1 — passa em texto normal. Não usar `content-muted` abaixo de `text-xs`.
- Foco visível sempre: `focus-visible:ring-2 focus-visible:ring-brand-400
  focus-visible:ring-offset-2 focus-visible:ring-offset-surface`.
- `prefers-reduced-motion`: override global em `globals.css`, duração `0.01ms`
  (copiar do CRM-RR).
- Cor nunca é o único sinal: "atrasado" tem faixa vermelha **e** o texto "atrasado".
- Navegação por teclado na tela Hoje: seta ↑↓ move entre ações, Enter abre.

## Multi-tenant e white-label (Fase 12+, não implementar agora)

Cada organização vai querer a própria cor. Para isso não virar refatoração geral
depois, **defina as cores como CSS custom properties em `:root` desde a Fase 1** e
consuma via Tailwind:

```css
:root {
  --color-brand-600: 37 99 235;   /* #2563EB — default DevRR */
}
```

```ts
// tailwind.config.ts
brand: { 600: 'rgb(var(--color-brand-600) / <alpha-value>)' }
```

Custo hoje: cinco minutos na config. Custo se deixar pra depois: reescrever todo
componente que tem cor hardcoded. Trocar o tema por organização vira injetar um
`<style>` com as variáveis no layout — e nada mais.

## Checklist antes de fechar qualquer tela

- [ ] Todo número está em `font-mono`
- [ ] Zero glow, zero blur decorativo, zero animação de scroll
- [ ] Estado vazio é honesto e sugere a próxima ação — nada de dado mockado
- [ ] Estado de carregamento existe (skeleton com `surface-elevated`)
- [ ] Estado de erro existe e diz o que fazer
- [ ] Foco de teclado visível em todo elemento interativo
- [ ] Cor não é o único sinal de estado
- [ ] Alvo de toque ≥ 44px
- [ ] Nenhuma cor hardcoded fora dos tokens

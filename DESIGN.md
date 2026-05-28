# Design

## Theme

Dark. Justificativa: o usuário final (dono de negócio) abre o site no celular em ambientes variados, mas o produto *vendido* é tech/dev — a escuridão comunica competência técnica ao alvo. A paleta escura com blue/violet é deliberada, não genérica: evoca terminal, precisão, confiança digital.

## Color Strategy

Committed. O azul `brand-600` (#2563EB) carrega 30–60% da superfície como sinalização ativa (CTAs, badges, ícones, highlights). Violeta como complemento analógico apenas em gradientes de glow/fundo — nunca como cor principal.

## Colors

### Surfaces (do mais escuro ao mais claro)
- `surface` (#07070F) — Background principal
- `surface-footer` (#080E1A) — Rodapé
- `surface-muted` (#0B0B16) — Seções alternadas
- `surface-elevated` (#10101E) — Cards, componentes elevados
- `surface-card` (#0E1428) — Cards de destaque com toque de azul

### Brand
- `brand-400` (#60A5FA) — Ícones, highlights, texto em destaque azul
- `brand-500` (#3B82F6) — Hover states
- `brand-600` (#2563EB) — Cor primária de ação (CTAs, badges)
- `brand-700` (#1D4ED8) — Deep press states

### Content
- `content-primary` (#F1F5F9) — Títulos, texto principal
- `content-secondary` (#94A3B8) — Texto de apoio, descrições
- `content-muted` (#64748B) — Labels, metadata, texto terciário

### Semânticos
- Emerald (#10B981, emerald-400) — Positivo, sucesso, WhatsApp
- Red (#F87171, red-400) — Negativo, problemas, "sem presença"
- Amber (#FBBF24, amber-400) — Estrelas de avaliação

## Typography

### Fontes
- **Display**: Bricolage Grotesque 800 — headlines grandes, H1/H2 principais
- **Sans**: Plus Jakarta Sans 400/500/600/700 — corpo, UI, labels
- **Mono**: DM Mono 500 — números, código, eyebrows terminais, valores de preço

### Escala
- Hero H1: `clamp(2.75rem, 6vw, 5.5rem)`, tracking -0.03em, leading 1.04
- Section H2: `clamp(1.875rem, 4vw, 3rem)`, tracking -0.02em, leading 1.2
- Card H3: `text-lg` (1.125rem) ou `text-base` (1rem)
- Body: `text-lg` (1.125rem) com `leading-[1.7]`
- Small/labels: `text-sm` (0.875rem), `text-xs` (0.75rem), `text-[11px]`

### Regras
- Máximo 65ch em parágrafos de corpo (max-w-[55ch] ou [46ch])
- `text-balance` em headlines
- `font-display` apenas para H1 — H2/H3 usam `font-sans`

## Components

### Cards
- **Highlight card**: `card-border-brand p-px rounded-card` → inner `bg-surface-card rounded-[1.875rem]`
- **Standard card**: `card-border p-px rounded-card` → inner `bg-surface-elevated rounded-[1.875rem]`
- **Sem glassmorphism como default** — usar `bg-surface-elevated` + `border border-white/[0.06]` para itens de lista

### CTAs
- **Primário**: `rounded-pill bg-brand-600 text-white px-6 py-4 font-semibold ease-spring hover:bg-brand-500 hover:scale-[1.02] hover:shadow-glow-brand`
- **Secundário**: `rounded-pill glass text-content-primary hover:border-brand-400/30 hover:text-brand-400`
- **Tamanho mínimo touch**: `py-3.5` ou `py-4` para garantir ≥44px

### Badges / Pills
- `rounded-pill bg-brand-600 text-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.15em]`
- Semânticos: `bg-red-500/15 text-red-400 border border-red-500/20`, `bg-emerald-500/15 text-emerald-400 border border-emerald-500/20`

### Icons
- Phosphor Icons, `weight="light"` para ícones em cards
- `weight="fill"` para ícones em CTAs, ratings, social
- `weight="bold"` para setas e mini-ícones funcionais

### Borders / Dividers
- Global default: `border-color: rgba(255,255,255,0.08)`
- Cards: `border border-white/[0.06]` a `border-white/[0.10]`
- Brand: `border border-brand-400/15` a `border-brand-400/30`

## Layout

### Containers
- Wide: `max-w-6xl mx-auto px-4` (hero, pricing, features, testimonials)
- Standard: `max-w-5xl mx-auto px-4` (how-it-works, benchmark, case-study)
- Narrow: `max-w-4xl` (problem) / `max-w-3xl` (guarantee, faq)

### Section Rhythm
- Vertical: `py-24` padrão, `py-20` para seções menores, `py-28` para CTA final
- Internal gaps: `gap-14` entre header e conteúdo de seção
- Card gaps: `gap-5` (pricing, features), `gap-4` (compact), `gap-3` (lists)

### Breakpoints-chave
- Grid de 3 colunas (pricing): `lg:grid-cols-3` (não md — 3 cards são tight em 768px)
- Grid de 2 colunas: `md:grid-cols-2`
- Hero sidebar card: `hidden lg:block`

## Motion

- Fade-up em scroll: `animate-fade-up` via IntersectionObserver (sem aria-hidden)
- Float passivo: `animate-float` com `will-change: transform`
- Easing padrão: `ease-spring` (cubic-bezier(0.32,0.72,0,1))
- Easing transitions: `ease-out-expo` (cubic-bezier(0.16,1,0.3,1))
- `prefers-reduced-motion`: override global em globals.css, duração 0.01ms
- NUNCA animar propriedades de layout (width, height, top, left)

## Elevation / Shadows

- `shadow-card`: cards standard
- `shadow-card-lg`: cards large/hero
- `shadow-glow-sm`: hover em CTAs secundários
- `shadow-glow-brand`: hover em CTA primário do hero
- Ambient orbs: `blur-[100px]` a `blur-[120px]`, com `contain: 'strict'` no wrapper

## Anti-patterns evitar neste projeto

- Glassmorphism como default (backdrop-blur em cards de lista é lazy)
- Hero-metric template (big number sozinho sem contexto integrado)
- Grade de cards idênticos (icon + title + text repetido N vezes)
- Gradient text (`background-clip: text`)
- Cores hard-coded fora dos tokens (ex: slate-500, slate-600 no footer)

---

## Logo — Variantes e Usabilidade

Arquivos em `/logos/`. Cada variante existe em 3 versões: `-color`, `-white`, `-black`.

### 01 `logo-primary` — Horizontal
**Uso:** Website, banners, materiais impressos, email signature, propostas.  
**Mínimo:** 24px de altura. Abaixo disso usar `logo-wordmark`.

### 02 `logo-stacked` — Empilhado
**Uso:** Stories (9:16), posts quadrados (1:1), cartão de visita centralizado, splash screen, crachá.  
**Proporção:** ~1:1. Símbolo com largura similar ao texto abaixo.

### 03 `logo-icon` — Ícone Isolado
**Uso:** App icon, favicon 32px+, foto de perfil Instagram/WhatsApp, avatar, watermark em vídeo.  
**Exportar:** 1024×1024px, border-radius 22% para app stores. Fundo sempre `#07070F`.

### 04 `logo-wordmark` — Compacto
**Uso:** Espaços estreitos — rodapé de proposta, navbar mobile, cabeçalho de email.  
**Mínimo:** 16px de altura.

### 05 `logo-monogram` — Monograma
**Uso:** Bordado em camiseta/boné, carimbo, selo, favicon 16px.  
**Motivo:** `{/}` tem detalhes demais abaixo de 32px — some em escala mínima.

---

### Versões por cor

| Sufixo | Quando usar |
|--------|-------------|
| `-color` | Fundo escuro — uso padrão |
| `-white` | Fundo escuro quando gradiente não contrasta |
| `-black` | Fundo branco/claro — documentos, papelaria, impressão |

---

### Favicon — escala de ícone

| Tamanho | Usar |
|---------|------|
| 512px → 32px | `logo-icon` — símbolo `{/}` |
| 16px | `logo-monogram` — só `RR` |

---

### Área de respiro

Mínimo de espaço livre ao redor do logo = **altura do logo** em todos os lados. Nenhum elemento invade essa área.

---

### Tamanhos mínimos

| Variante | Digital | Impresso |
|----------|---------|----------|
| Primary | 120px largura | 30mm |
| Stacked | 80px largura | 20mm |
| Icon | 24×24px | 8×8mm |
| Wordmark | 80px largura | 20mm |
| Monogram | 16×16px | 6×6mm |

---

### Regras de contraste

- `-color` somente sobre fundo escuro (`#07070F`, `#0B0B16`, `#10101E`)
- `-white` exige fundo com contraste ≥ 4.5:1 (WCAG AA)
- `-black` somente sobre fundo branco/claro

### Nunca fazer com o logo

- Distorcer proporções
- Aplicar sombra, contorno ou efeito
- Usar `-color` sobre fundo branco
- Usar `-white` sobre fundo branco (some)
- Recriar com fontes ou cores diferentes das oficiais

---

### Referência de cores do logo

| Elemento | Hex |
|----------|-----|
| `{/}` início | `#7C3AED` |
| `{/}` fim | `#4A7FF5` |
| `dev` início | `#4F82F5` |
| `dev` fim | `#60A5FA` |
| Ponto `.` | `#60A5FA` |
| `RR` (sólido) | `#1D4ED8` |
| Fundo padrão | `#07070F` |

# Template Guide — dev.RR Instagram

Mapeamento de tipo de conteúdo → modo visual.
**Consultar antes de criar qualquer imagem do cronograma.**

Referência visual: `../brand-guide.html` → Seção 06 (Templates).
Diretriz estratégica de conteúdo: `DIRETRIZ-CONTEUDO-JULHO-2026.md`.

Antes de escolher o template visual, validar a hierarquia de conteúdo:
dor clara do negócio local → gancho forte → promessa simples → exemplo prático → CTA comercial.

---

## Os 8 Modos Visuais

Derivados dos 11 templates do brand-guide (6 Stories + 5 Feed), com redundâncias mescladas.
**Qualquer modo pode ser aplicado a qualquer formato** (Feed 4:5, Carrossel 4:5, Story 9:16).

| # | Modo | Quando usar | Fundo | Estrutura central |
|---|------|-------------|-------|-------------------|
| 1 | **Hook** | Pergunta provocativa, gancho de atenção, objeção | `tpl-bg-brand` | Eyebrow + divider + headline impactante + copy + CTA |
| 2 | **Dado / Stat** | Estatística isolada, número de impacto único | `surface-elevated` | Número gigante gradient text (80–120px) + eyebrow + corpo pequeno |
| 3 | **Antes / Depois** | Comparação, contraste, objeção vs solução | `surface-elevated` | Grid 2 col — vermelho `#F87171` (Antes) vs verde `#10B981` (Depois) |
| 4 | **Educativo** | Lista, processo, bastidores, conteúdo técnico | `tpl-bg-brand` | Logo-wordmark + badge + eyebrow + headline + lista numerada DM Mono |
| 5 | **Depoimento** | Prova social, resultado real de cliente | `surface-elevated` ou `tpl-bg-brand` | ★★★★★ amber + quote itálico + divider + atribuição + CTA |
| 6 | **Oferta / Serviço** | Plano, preço, pacote, serviço específico | Gradiente `#0D1829→#1E3566` + borda gradient | Eyebrow + headline + preço mono grande + checklist ✓ + CTA |
| 7 | **CTA Brand** | Chamada direta, urgência, conversão | `brand-600` (azul sólido) | Mínimo texto — headline grande + botão branco invertido |
| 8 | **Institucional** | Primeiro post, apresentação de marca, identidade pura | `tpl-bg-brand` | Logo stacked centralizada (52–64px) + tagline + URL mono |

---

## Regras rápidas de decisão

```
Número/dado isolado?                → Dado / Stat
Dois lados opostos?                 → Antes / Depois
Primeiro contato com a marca?       → Institucional
Lista, processo, bastidores?        → Educativo
Prova social de cliente?            → Depoimento
Plano ou preço?                     → Oferta / Serviço
Chamada direta sem rodeio?          → CTA Brand
Pergunta que para o scroll?         → Hook
```

---

## Regra crítica: transições seamless em carrosséis

Para eliminar o "risco preto" visível entre slides no swipe do Instagram:

- **`.carousel-track`** → `background: #07070F` (fundo único sólido) + `position: relative`
- **Slides** → `background: transparent` — NUNCA cor própria por slide
- **Orbs** → ficam dentro do track (não dos slides), posicionados com coordenadas absolutas cruzando as fronteiras entre slides (a cada N×420px)
- **Dot grid** → dentro de cada slide individualmente (não no track)
- **Swipe arrow** → `background: transparent` — NUNCA `rgba(255,255,255,X)`

Track com 4 slides = 1680px. Fronteiras em x=420, 840, 1260. Orbs devem cruzar essas posições.

---

## Regra crítica: CTA sempre em slide próprio

**Slides de conteúdo (Capa, Item, Stat, Educativo) NUNCA devem conter botão CTA ou logo-primary.**

O CTA (botão "Me chama" + logo-primary-color.svg) vai exclusivamente no **último slide dedicado**, com:
- Eyebrow DM Mono: "PRÓXIMO PASSO"
- Divider
- Headline de fechamento contextual (pergunta ou convite relacionado ao tema do carrossel)
- Body: proposta de valor em 1 linha
- Separador 1px `rgba(255,255,255,.08)`
- Botão gradient + logo-primary centralizados lado a lado
- Progress bar 100% com fill gradient (#7C3AED → #60A5FA)
- **Sem swipe arrow**

Isso significa que um carrossel com N slides de conteúdo tem N+1 slides no total (o último sendo o CTA).

---

## Carrossel — sequências de slides

Para carrosséis, o modo visual determina o tipo de slide, não o layout geral.
A sequência de slides segue uma das 5 estruturas abaixo:

| Sequência | Quando usar | Estrutura |
|-----------|-------------|-----------|
| **Listicle** | "N sinais", "N dicas", "N tipos", "N erros" | Capa → Item ×N (deco-num + eyebrow + headline + corpo) → CTA |
| **Tutorial / Processo** | Etapas sequenciais, como funciona | Capa → Passo 1/2/3 → CTA |
| **Checklist** | Autodiagnóstico, perguntas sim/não | Capa → Pergunta ×N (checkbox grande) → Resultado + CTA |
| **Educativo** | Conceitos progressivos, dados por slide | Capa → Conceito 1/2/3 (deco-num) → CTA |
| **Comparação** | Opção A vs B em slides separados | Capa → Opção A → Opção B → Veredicto → CTA |

---

## Mapeamento: Cronograma Junho 2026

| Post | Data | Formato | Modo Visual | Sequência (se carrossel) |
|------|------|---------|-------------|--------------------------|
| 01 | 12/Jun (Sex) | Feed único | Institucional | — |
| 02 | 13/Jun (Sáb) | Carrossel | Hook (capa) + Dado/Stat (slides) | Listicle — Capa + 5 Items + CTA |
| 03 | 14/Jun (Dom) | Feed único | Dado / Stat | — |
| 04 | 16/Jun (Ter) | Carrossel | Hook (capa) + Educativo (slides) | Tutorial / Processo — Capa + 3 Etapas + CTA |
| 05 | 17/Jun (Qua) | Feed único | Antes / Depois | — |
| 06 | 18/Jun (Qui) | Feed único | Dado / Stat | — |
| 07 | 19/Jun (Sex) | Carrossel | Hook (capa) + Educativo (slides) | Listicle — Capa + 3 Items + CTA |
| 08 | 20/Jun (Sáb) | Feed único | Educativo | — |
| 09 | 21/Jun (Dom) | Carrossel | Hook (capa) + Educativo (slides) | Educativo — Capa + 3 Conceitos + CTA |
| 10 | 23/Jun (Ter) | Feed único | Hook | — |
| 11 | 24/Jun (Qua) | Carrossel | Hook (capa) + Educativo (slides) | Checklist — Capa + 3 Perguntas + Resultado CTA |
| 12 | 25/Jun (Qui) | Feed único | Antes / Depois | — |
| 13 | 26/Jun (Sex) | Carrossel | Hook (capa) + Educativo (slides) | Tutorial / Processo — Capa + 3 Etapas + CTA |
| 14 | 27/Jun (Sáb) | Feed único | Hook | — |
| 15 | 28/Jun (Dom) | Carrossel | Hook (capa) + Educativo (slides) | Educativo — Capa + 3 Peças + CTA |
| 16 | 29/Jun (Seg) | Feed único | Educativo | — |
| 17 | 30/Jun (Ter) | Carrossel | Hook (capa) + Educativo (slides) | Tutorial / Processo — Capa + 3 Passos + CTA |

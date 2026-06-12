# Cronograma Instagram — dev.RR — Junho 2026

**Cadência ajustada:** 17 posts entre 12/Jun e 30/Jun, com pausas em 15/Jun e 22/Jun  
**Objetivo do mês:** awareness → educação → primeira conversão → apresentação de serviços digitais  
**Paleta:** `#07070F` (fundo), `#7C3AED` (violeta), `#60A5FA` (azul claro), `#2563EB` (azul deep)  
**Tom:** direto, técnico mas humano, sem papo de agência

> 🎨 **Identidade visual completa:** consulte [`DESIGN.md`](../DESIGN.md) na raiz do projeto.  
> Contém: tokens de cor, tipografia (Bricolage Grotesque / Plus Jakarta Sans / DM Mono), escala tipográfica, regras de componentes, logos por variante e contexto de uso, referência de cores do logo (gradiente `{/}`, `dev`, `RR`), e anti-patterns da marca.

---

## Sistema Visual Base — dev.RR

> **Cole este bloco no início de cada prompt para a skill `/instagram-carousel` ou `/imagegen-frontend-web`.**  
> Ele garante consistência com a identidade visual do brand-guide.

```
BRAND SYSTEM — dev.RR (aplicar em todos os slides/frames):

FUNDO:
- Background: linear-gradient(160deg, #0D1829 0%, #07070F 60%)
- Dot grid overlay em todos os slides:
  background-image: radial-gradient(circle, rgba(255,255,255,.06) 1px, transparent 1px);
  background-size: 18px 18px

AMBIENT ORBS (em cada slide, não só na capa):
- Orb primário: radial-gradient(circle, rgba(37,99,235,.30) 0%, transparent 70%), ~220px, posição variada
- Orb secundário: radial-gradient(circle, rgba(124,58,237,.18) 0%, transparent 70%), ~180px, posição oposta

TIPOGRAFIA:
- Headline / título principal: Bricolage Grotesque, weight 800, letter-spacing -0.02em, cor #F1F5F9
- Corpo / subtítulo: Plus Jakarta Sans, weight 400/500, cor rgba(255,255,255,0.45)
- Eyebrow / label: DM Mono, weight 500, 10px, UPPERCASE, letter-spacing 2.5px, cor #60A5FA
- CTA: Plus Jakarta Sans, weight 700

ELEMENTOS DE MARCA:
- Divider: 24px × 2px, background: linear-gradient(90deg, #7C3AED, #60A5FA), border-radius 2px
- Gradiente de acento: linear-gradient(135deg, #7C3AED 20%, #60A5FA 100%)
- Gradiente profundo: linear-gradient(135deg, #7C3AED 0%, #2563EB 100%)
- CTA button: background linear-gradient(135deg, #7C3AED 0%, #2563EB 100%), border-radius 9999px
- Logo "dev.RR": Bricolage Grotesque 800, gradient text violeta→azul (#7C3AED → #60A5FA)

SOMBRA DO CARD: box-shadow: 0 8px 40px rgba(0,0,0,.7)
BORDER RADIUS: 1.25rem nos slides
```

---

## Post 01 — 12/Jun (Sex) · Feed Único

**Tema:** Apresentação — Quem é a dev.RR  
**Objetivo:** primeiro contato, humanizar a marca  
**Template:** Modo 8 — Institucional  

### Legenda
```
Oi 👋 Eu sou o Renan.

Desenvolvo sites para negócios locais que querem ser encontrados na internet — e não deixar cliente passar porque não tinham um lugar pra apontar.

Nada de template genérico. Nada de site que parece de 2012.

Site rápido, bonito, feito do zero, que representa de verdade o que você construiu.

Sou a dev.RR — e esse é o começo.

Acompanha. Tem muita coisa boa vindo por aí. 👇

#webdesign #sitepronto #devlocal #presençadigital #negóciolocal #desenvolvimentoweb
```

### Prompt para imagem (Feed 4:5 — 1080×1350px)
```
[Aplicar BRAND SYSTEM acima]

Frame 1080×1350px (4:5). Layout centralizado vertical.

Composição:
- Logo "dev.RR" (Bricolage Grotesque 800, gradient #7C3AED→#60A5FA) centralizado no terço superior
- Eyebrow (DM Mono, uppercase, #60A5FA): "DESENVOLVEDOR WEB · NEGÓCIOS LOCAIS"
- Divider 24px × 2px gradient
- Headline (Bricolage 800, 52px, branco): "Olá, eu sou o Renan."
- Corpo (Plus Jakarta Sans, 18px, rgba(255,255,255,0.45)): "Sites profissionais para negócios locais que querem ser encontrados."
- Orb grande azul (#2563EB, 35% opacity) canto inferior direito
- Orb violeta menor (#7C3AED, 20% opacity) canto superior esquerdo
- Dot grid overlay em todo o frame
```

---

## Post 02 — 13/Jun (Sáb) · Carrossel (5 slides)

**Tema:** 5 sinais que seu negócio precisa de um site  
**Objetivo:** educação, identificação com dor do cliente  
**Template:** Carrossel Listicle — capa Hook + slides Dado/Stat + CTA  

### Legenda
```
Se você se identificou com algum desses, a gente precisa conversar. 👆

Pode parecer que "tá funcionando sem site" — mas o que você não vê são os clientes que te procuraram no Google, não te acharam, e foram para o concorrente.

Site não é gasto. É estrutura.

Me chama no WhatsApp 👇
🔗 Link na bio

#sitepronto #negóciolocal #marketingdigital #presençadigital #webdesign #vendasonline
```

### Slides — Estrutura
- **Capa:** "5 sinais que seu negócio precisa de um site" — fundo escuro, texto grande, logo dev.RR no canto
- **Slide 2:** "01 — Você indica WhatsApp quando alguém pergunta onde te achar"
- **Slide 3:** "02 — Seu concorrente aparece no Google. Você não."
- **Slide 4:** "03 — Você perde tempo mandando catálogo no WhatsApp toda semana"
- **Slide 5:** "04 — Clientes novos não sabem o que você faz antes de te ligar"
- **Slide 6 (último):** "05 — Você confia só no Instagram — que pode cair amanhã" + CTA "Me chama" + logo

### Prompt para imagem (Carrossel — 1080×1350px por slide (4:5))
```
[Aplicar BRAND SYSTEM acima — dot grid + orbs em TODOS os slides]

6 slides 1080×1350px com carrossel navegável.

SLIDE 1 — CAPA:
- Número pills (01 02 03 04 05) em linha, estilo badge (border rgba(124,58,237,0.35), bg rgba(124,58,237,0.06))
- Eyebrow DM Mono: "VOCÊ SE IDENTIFICA?"
- Headline Bricolage 800 (~52px): "5 sinais que seu negócio precisa de um site"
- Sub Plus Jakarta: "Swipe para ver cada sinal →"
- Logo dev.RR canto superior direito
- Orb grande violeta superior direito + orb azul inferior esquerdo

SLIDES 2–5 (cada sinal):
- Número do item (01/02/03/04) em tipografia GIGANTE (~160px) gradiente violeta-azul, opacity 0.85, posição absoluta no fundo (top-left), funciona como elemento decorativo
- Eyebrow DM Mono canto: "SINAL 0X"
- Divider 24px × 2px
- Headline Bricolage 800 (~26px): [texto do sinal]
- Corpo Plus Jakarta 14px rgba(255,255,255,0.45): [explicação de uma linha]
- Logo dev.RR pequeno canto superior direito
- Orbs em cada slide em posição diferente dos demais
- Barra de progresso sutil no rodapé (1px, fills percentage)

SLIDE 6 — ÚLTIMO + CTA:
- Número "05" gigante como decoração
- Eyebrow: "SINAL 05 · O MAIS CRÍTICO"
- Divider
- Headline: "Você confia só no Instagram — que pode cair amanhã"
- Linha separadora 1px rgba(255,255,255,0.06)
- CTA button gradient + logo dev.RR lado a lado
- Dois orbs intensos violeta+azul
```

---

## Post 03 — 14/Jun (Dom) · Feed Único

**Tema:** Estatística impactante — mais da metade dos negócios locais sem presença digital efetiva  
**Objetivo:** gerar consciência do problema, urgência  
**Template:** Modo 2 — Dado / Stat  

**Artigo de referência:**  
- [Negócios locais ainda não têm uma presença digital efetiva — AdLocal](https://www.adlocal.com.br/blog/mais-da-metade-dos-negocios-locais-ainda-nao-tem-uma-presenca-digital-efetiva-e-o-seu)  
- [Por que sua empresa precisa de um site em 2026 — ProjetodeSite](https://projetodesite.com.br/blog/por-que-sua-empresa-precisa-de-um-site/)

### Legenda
```
Dado real: mais da metade dos negócios locais ainda não tem presença digital efetiva.

Isso significa: sem site, sem Google, sem onde o cliente te encontrar fora do WhatsApp.

Enquanto você não está na internet, seu concorrente está.

E o cliente que pesquisou "assistência técnica perto de mim" às 22h de domingo foi para quem apareceu.

Não para quem estava disponível. Para quem estava visível.

Isso é o que um site muda.

📎 Artigo nos comentários.

#presençadigital #negóciolocal #sitepronto #marketinglocal #webdesign
```

### Prompt para imagem (Feed 4:5 — 1080×1350px)
```
[Aplicar BRAND SYSTEM acima]

Frame 1080×1350px (4:5). Layout de dado único centralizado.

Composição:
- Eyebrow DM Mono (#60A5FA, uppercase): "DADO REAL · BRASIL"
- Divider
- Número "52%" em Bricolage Grotesque 800, ~120px, gradient text #7C3AED→#60A5FA, glow radial atrás
- Corpo Plus Jakarta 20px branco: "dos negócios locais não têm presença digital efetiva"
- Fonte (DM Mono, 11px, rgba(255,255,255,0.3)): "Fonte: AdLocal.com.br"
- Orb azul intenso (#2563EB, 40% opacity, ~300px) centralizado atrás do número
- Orb violeta (#7C3AED, 15%) canto superior esquerdo
- Dot grid em todo o frame
- Logo dev.RR canto inferior direito
```

---

## Post 04 — 16/Jun (Ter) · Carrossel (4 slides)

**Tema:** Como funciona trabalhar com a dev.RR — o processo em 3 etapas  
**Objetivo:** quebrar objeção de "não sei como funciona / é complicado"  
**Template:** Carrossel Tutorial/Processo — capa Hook + slides Educativo + CTA  

### Legenda
```
Simples. Rápido. Sem complicação.

É assim que funciona ter um site com a dev.RR — do zero até no ar.

Sem aquela história de "mas tem que esperar 3 meses e fazer 47 reuniões".

📲 Me chama e a gente começa essa semana.
🔗 Link na bio

#processo #webdesign #sitepronto #desenvolvimentoweb #negóciolocal
```

### Slides — Estrutura
- **Capa:** "Como ter um site com a dev.RR funciona" — simples, tipografia grande
- **Slide 2:** "01 — Conversa inicial: você me conta o negócio, eu ouço" — ícone de conversa
- **Slide 3:** "02 — Desenvolvimento: eu crio, você acompanha e aprova" — ícone de código/monitor
- **Slide 4:** "03 — Entrega: site no ar, rápido, funcional, seu" + CTA

### Prompt para imagem (Carrossel — 1080×1350px por slide (4:5))
```
[Aplicar BRAND SYSTEM acima — dot grid + orbs em TODOS os slides]

4 slides 1080×1350px.

SLIDE 1 — CAPA:
- Eyebrow DM Mono: "PROCESSO · dev.RR"
- Headline Bricolage 800 (~56px): "Como ter um site com a dev.RR funciona"
- Sub Plus Jakarta: "3 etapas. Do zero ao ar."
- Logo dev.RR centralizado ou canto superior
- Orbs violeta + azul nos cantos opostos

SLIDES 2, 3, 4 (etapas 01/02/03):
- Número gigante decorativo (~140px, gradiente, opacity 0.7) fundo esquerdo/topo
- Eyebrow DM Mono: "ETAPA 0X"
- Divider
- Headline Bricolage 800: [nome da etapa]
- Corpo Plus Jakarta: [descrição curta]
- Logo dev.RR pequeno canto superior direito
- Orbs em posição diferente a cada slide
- Slide 4 (último): adicionar separador + CTA button gradient + logo em destaque
```

---

## Post 05 — 17/Jun (Qua) · Feed Único

**Tema:** "Mas tenho Instagram, preciso de site?" — destruindo o mito  
**Objetivo:** objeção mais comum de clientes, posicionamento  
**Template:** Modo 3 — Antes / Depois  

### Legenda
```
"Mas eu já tenho Instagram, precisa de site?"

Sim. E vou te explicar por quê em uma linha:

Instagram é terreno alugado. Site é propriedade sua.

O algoritmo muda → seu alcance despenca.
A conta é suspensa → você perde tudo.
O WhatsApp cai → você some da internet.

Seu site está sempre no ar. No Google. Disponível 24h.
Sem depender de nenhuma plataforma.

Se o Instagram é a vitrine, o site é a loja.

Me chama. 📲
🔗 Link na bio

#instagram #sitepronto #presençadigital #negóciolocal #marketingdigital #webdesign
```

### Prompt para imagem (Feed 4:5 — 1080×1350px)
```
[Aplicar BRAND SYSTEM acima]

Frame 1080×1350px (4:5). Layout split vertical.

Composição:
- Eyebrow DM Mono (#60A5FA): "INSTAGRAM NÃO É SUFICIENTE"
- Divider
- Headline Bricolage 800 (~44px, branco): "Terreno alugado vs. propriedade sua."
- Split horizontal abaixo: dois blocos lado a lado separados por linha 1px gradient
  - Bloco esquerdo: label DM Mono vermelho suave (#F87171) "INSTAGRAM", sub Plus Jakarta cinza: "Algoritmo muda. Conta cai. Você perde tudo."
  - Bloco direito: label DM Mono azul (#60A5FA) "SEU SITE", sub Plus Jakarta cinza: "Sempre no ar. No Google. Propriedade sua."
- Orb azul canto inferior direito, orb violeta superior esquerdo
- Dot grid
- Logo dev.RR canto inferior direito
```

---

## Post 06 — 18/Jun (Qui) · Feed Único

**Tema:** Dado de impacto — velocidade do site = dinheiro  
**Objetivo:** educação técnica acessível, autoridade  
**Template:** Modo 2 — Dado / Stat  

**Artigo de referência:**  
- [Impacto da velocidade do site nas taxas de conversão — Doisz](https://doisz.com/blog/impacto-da-velocidade-do-site-nas-taxas-de-conversao/)  
- [O impacto do tempo de carregamento do site nas conversões — Multiplica Digital](https://multiplicadigital.com.br/o-impacto-do-tempo-de-carregamento-do-site-nas-conversoes/)

### Legenda
```
Dado real da Amazon:
Cada 100 milissegundos de lentidão = 1% menos em vendas.

Parece pouco? Multiplica pelo volume de visitas.

47% dos consumidores esperam que um site carregue em até 2 segundos.
40% abandonam se demorar mais de 3 segundos.

Site lento não é só feio. É prejuízo.

Todo site que faço passa por otimização de performance. Isso não é opcional — é parte do trabalho.

📎 Artigo completo nos comentários.

#performance #webdesign #sitepronto #velocidade #conversão #negóciodigital
```

### Prompt para imagem (Feed 4:5 — 1080×1350px)
```
[Aplicar BRAND SYSTEM acima]

Frame 1080×1350px (4:5). Layout data-driven.

Composição:
- Eyebrow DM Mono (#60A5FA): "PERFORMANCE · DADOS REAIS"
- Divider
- Headline Bricolage 800 (~48px, branco): "3 segundos de espera ="
- Destaque abaixo em gradient text (#7C3AED→#60A5FA), Bricolage 800, ~56px: "40% abandonam"
- Barra de progresso estilizada (3px, branca parcial) mostrando tempo como indicador visual
- Corpo Plus Jakarta 16px rgba(255,255,255,0.45): "47% dos usuários esperam carregar em até 2s. Todos os sites que entrego são otimizados."
- Orb azul grande centralizado atrás do número (glow efeito)
- Dot grid
- Logo dev.RR canto inferior direito
```

---

## Post 07 — 19/Jun (Sex) · Carrossel (5 slides)

**Tema:** 3 tipos de site que faço + para quem é cada um  
**Objetivo:** segmentar o público, mostrar portfólio de soluções  
**Template:** Carrossel Listicle — capa Hook + slides Educativo + CTA  

### Legenda
```
Não existe "um site serve pra tudo".

Depende do seu negócio, do seu cliente, e do que você quer que o site faça por você.

Swipe pra ver qual faz mais sentido pro seu caso. 👆

Me chama depois. A gente descobre junto qual é o seu.
🔗 Link na bio

#webdesign #sitepronto #landing #negóciolocal #desenvolvimentoweb
```

### Slides — Estrutura
- **Capa:** "Qual tipo de site o seu negócio precisa?"
- **Slide 2:** "01 — Landing Page / Site Institucional" — serviços locais, profissionais liberais, pequenas empresas
- **Slide 3:** "02 — Site com Blog / Conteúdo" — negócios que querem aparecer no Google no longo prazo
- **Slide 4:** "03 — Site de Vendas / Catálogo Online" — lojas, produtos físicos, e-commerce leve
- **Slide 5 (capa final):** "Não sabe qual é o seu? Me chama, a gente descobre juntos." + CTA + logo

### Prompt para imagem (Carrossel — 1080×1350px por slide (4:5))
```
[Aplicar BRAND SYSTEM acima — dot grid + orbs em TODOS os slides]

5 slides 1080×1350px.

SLIDE 1 — CAPA:
- Eyebrow DM Mono: "TIPOS DE SITE · dev.RR"
- Headline Bricolage 800 (~52px): "Qual tipo de site o seu negócio precisa?"
- Sub Plus Jakarta: "Swipe para descobrir →"
- Logo dev.RR

SLIDES 2, 3, 4 (tipos 01/02/03):
- Número gigante decorativo (~150px gradient opacity 0.7) como fundo
- Eyebrow DM Mono: "TIPO 0X"
- Divider
- Headline Bricolage 800 (~28px): [nome do tipo]
- Badge pill (rgba(124,58,237,0.12), border rgba(124,58,237,0.35)): [para quem é]
- Corpo Plus Jakarta: [uma linha de descrição]
- Orb diferente em cada slide

SLIDE 5 — ÚLTIMO + CTA:
- Headline Bricolage: "Não sabe qual é o seu?"
- Corpo: "Me chama. A gente descobre juntos."
- CTA button gradient + logo dev.RR
- Dois orbs intensos
```

---

## Post 08 — 20/Jun (Sáb) · Feed Único

**Tema:** Bastidores — o processo de desenvolvimento  
**Objetivo:** humanizar, mostrar trabalho real, gerar curiosidade  
**Template:** Modo 4 — Educativo  

### Legenda
```
Por trás de cada site, tem muito café e muita atenção a detalhe.

Da conversa inicial até o site no ar:
→ Entendo o seu negócio
→ Defino a estrutura e o fluxo
→ Desenvolvo com foco em velocidade e conversão
→ Ajusto com você até ficar certo
→ Coloco no ar

Não é template. Não é arrastar e soltar.

É código, é identidade, é resultado.

Curioso como fica o seu? Me chama. 📲

#bastidores #webdev #desenvolvimentoweb #sitepronto #codigo #devlife
```

### Prompt para imagem (Feed 4:5 — 1080×1350px)
```
[Aplicar BRAND SYSTEM acima]

Frame 1080×1350px (4:5). Tema: código/terminal.

Composição:
- Fundo principal: gradiente brand + dot grid + orbs
- Elemento central decorativo: bloco estilo terminal/editor de código com linhas de código sintético
  (cores: violeta #7C3AED para keywords, azul #60A5FA para strings, cinza para texto)
  com barra de título de janela minimalista e 3 dots coloridos (vermelho/amarelo/verde) acima
- Overlay semitransparente sobre o bloco de código
- Eyebrow DM Mono: "BASTIDORES"
- Headline Bricolage 800 (~44px, branco): "Aqui começa cada site."
- Corpo Plus Jakarta rgba(255,255,255,0.45): "Código limpo. Performance primeiro. Sem template."
- Logo dev.RR canto inferior direito
- Glow azul (#2563EB) atrás do bloco de código
```

---

## Post 09 — 21/Jun (Dom) · Carrossel (5 slides)

**Tema:** "Seu negócio aparece no Google?" — SEO local explicado  
**Objetivo:** educação sobre SEO, mostrar valor agregado  
**Template:** Carrossel Educativo — capa Hook + slides Educativo/Stat + CTA  

### Legenda
```
Quando alguém digita "chaveiro perto de mim" às 23h…

Quem aparece são os negócios que trabalharam pra aparecer.

SEO local não é mágica. É estrutura. É site rápido. É conteúdo certo.

E isso eu coloco em cada site que entrego.

Swipe pra entender como funciona. 👆

📲 Me chama pra a gente conversar sobre o seu negócio.
🔗 Link na bio

#seolocal #googlenegocios #presençadigital #webdesign #negóciolocal #apareçanogoogle
```

### Slides — Estrutura
- **Capa:** "Seu negócio aparece quando o cliente procura?"
- **Slide 2:** "O que é SEO local" — aparecer em pesquisas da sua cidade/região
- **Slide 3:** "Por que importa" — 46% das buscas no Google têm intenção local
- **Slide 4:** "O que faz diferença" — site rápido + palavras certas + Google Business
- **Slide 5:** "Eu faço isso por você" — CTA + logo

### Prompt para imagem (Carrossel — 1080×1350px por slide (4:5))
```
[Aplicar BRAND SYSTEM acima — dot grid + orbs em TODOS os slides]

5 slides 1080×1350px.

SLIDE 1 — CAPA:
- Eyebrow DM Mono: "SEO LOCAL"
- Headline Bricolage 800 (~48px): "Seu negócio aparece quando o cliente procura?"
- Sub Plus Jakarta: "Swipe para entender →"
- Ícone de lupa SVG simples em gradiente violeta-azul
- Logo dev.RR

SLIDES 2, 3, 4:
- Cada slide tem número decorativo gigante no fundo (opacity 0.5)
- Eyebrow DM Mono: tema do slide em uppercase
- Divider
- Headline Bricolage 800: [conceito]
- Corpo Plus Jakarta: [explicação]
- Slide 3: destaque numérico "46%" em gradient text (46% das buscas têm intenção local)
- Orbs em posições variadas

SLIDE 5 — CTA:
- Eyebrow DM Mono: "EU FAÇO ISSO POR VOCÊ"
- Headline Bricolage 800: "SEO local incluso em todo site que entrego."
- CTA button + logo dev.RR em destaque
- Orbs intensos violeta + azul
```

---

## Post 10 — 23/Jun (Ter) · Feed Único

**Tema:** CTA emocional — o custo invisível de não ter site  
**Objetivo:** criar urgência, conversão  
**Template:** Modo 1 — Hook  

### Legenda
```
Sabe qual é o pior tipo de perda pra um negócio?

A perda invisível.

Aquele cliente que te pesquisou, não te achou, e nunca te ligou.
Aquele pedido que foi pro concorrente sem você nem saber.
Aquela oportunidade que passou às 22h de uma sexta.

Você não perdeu porque é ruim.
Perdeu porque não estava onde precisava estar.

Eu conserto isso.

Site profissional, rápido, que trabalha por você enquanto você dorme.

Me chama. O link tá na bio. 📲

#negóciolocal #presençadigital #sitepronto #webdesign #vendas #oportunidade
```

### Prompt para imagem (Feed 4:5 — 1080×1350px)
```
[Aplicar BRAND SYSTEM acima]

Frame 1080×1350px (4:5). Tom: reflexivo, emocional.

Composição:
- Eyebrow DM Mono (#60A5FA): "O CUSTO INVISÍVEL"
- Divider
- Headline Bricolage 800 (~50px, branco): "A perda que você não vê é a pior."
- Corpo Plus Jakarta 18px rgba(255,255,255,0.45): "Clientes que te procuraram, não te acharam, e foram para o concorrente — em silêncio."
- Elemento visual: dois pontos/nós desconectados estilizados, linha tracejada entre eles, cor rgba(124,58,237,0.4) — metáfora de conexão perdida
- Orbs mais difusos, menos intensos — sensação de algo que some/dispersa
- Dot grid
- Logo dev.RR canto inferior direito
```

---

## Post 11 — 24/Jun (Qua) · Carrossel (5 slides)

**Tema:** Checklist — seu negócio está pronto para o digital?  
**Objetivo:** engajamento (salvar/compartilhar), conversão  
**Template:** Carrossel Checklist — capa Hook + slides Checklist + Resultado CTA  

### Legenda
```
Salva esse post. 📌

É o checklist rápido de presença digital que todo negócio local deveria fazer uma vez por ano.

Se marcou mais "não" do que "sim", eu posso te ajudar.

Me chama via link na bio. 👇

#checklist #presençadigital #negóciolocal #webdesign #sitepronto #marketingdigital
```

### Slides — Estrutura
- **Capa:** "Checklist: seu negócio está no digital do jeito certo?" + ícone de check
- **Slide 2:** ✅ Tenho site próprio (não só Instagram)?
- **Slide 3:** ✅ Meu site abre rápido no celular?
- **Slide 4:** ✅ Alguém que pesquisa meu serviço no Google me encontra?
- **Slide 5:** "Não marcou tudo? É aqui que eu entro." — CTA + logo dev.RR + link

### Prompt para imagem (Carrossel — 1080×1350px por slide (4:5))
```
[Aplicar BRAND SYSTEM acima — dot grid + orbs em TODOS os slides]

5 slides 1080×1350px. Estilo checklist interativo.

SLIDE 1 — CAPA:
- Eyebrow DM Mono: "AUTODIAGNÓSTICO"
- Headline Bricolage 800 (~48px): "Checklist: seu negócio está no digital do jeito certo?"
- Ícone checkbox SVG em gradiente violeta-azul
- Sub Plus Jakarta: "Salva esse post. 📌"
- Logo dev.RR

SLIDES 2, 3, 4 (uma pergunta por slide):
- Checkbox estilizado grande (40px) à esquerda: borda rgba(255,255,255,0.2) — vazio, para o seguidor "marcar mentalmente"
- Pergunta em Bricolage 800 (~32px, branco): [pergunta do checklist]
- Sub Plus Jakarta cinza: [contexto breve]
- Linha divisória 1px rgba(255,255,255,0.06) abaixo
- Orb sutil em cada slide

SLIDE 5 — RESULTADO + CTA:
- Headline Bricolage 800: "Não marcou tudo?"
- Sub Plus Jakarta rgba(255,255,255,0.55): "É aqui que eu entro."
- Separador 1px
- CTA button gradient: "Me chama 📲"
- Logo dev.RR em destaque
- Dois orbs intensos violeta + azul
```

---

## Posts 12–17 — Serviços digitais completos

> **Uso:** sequência de 25/Jun a 30/Jun para apresentar serviços digitais além de sites e landing pages.  
> **Direção:** falar do serviço pela dor do cliente, não como anúncio de expansão da dev.RR.

---

## Post 12 — 25/Jun (Qui) · Feed Único

**Tema:** E-commerce — loja online própria para vender fora do improviso  
**Objetivo:** mostrar quando Instagram/WhatsApp deixam de ser suficientes para vender produtos  
**Template:** Modo 3 — Antes / Depois  

### Legenda
```
Vender pelo Instagram funciona até certo ponto.

Depois começa o improviso:
→ preço perguntado no direct
→ pedido perdido no WhatsApp
→ pagamento combinado manualmente
→ estoque sem controle
→ cliente desistindo porque deu trabalho comprar

E-commerce não é só "colocar produto na internet".

É ter vitrine, pedido, pagamento e organização em um só lugar.

Se você vende produto e ainda fecha tudo manualmente, talvez esteja na hora de ter uma loja online própria.

Me chama. Eu te ajudo a estruturar isso do jeito certo.

#ecommerce #lojaonline #vendasonline #negociodigital #presencadigital #devrr
```

### Prompt para imagem (Feed 4:5 — 1080×1350px)
```
[Aplicar BRAND SYSTEM acima]

Frame 1080×1350px (4:5). Layout Antes / Depois com foco em venda online.

Composição:
- Eyebrow DM Mono (#60A5FA): "E-COMMERCE · VENDA ONLINE"
- Divider
- Headline Bricolage 800 (~46px, branco): "Comprar de você precisa ser simples."
- Split horizontal abaixo:
  - Bloco esquerdo: label DM Mono vermelho suave (#F87171) "NO IMPROVISO", sub Plus Jakarta: "Pedido no direct. Pagamento manual. Cliente esperando resposta."
  - Bloco direito: label DM Mono azul (#60A5FA) "LOJA ONLINE", sub Plus Jakarta: "Produto, pedido e pagamento em um fluxo só."
- Elemento visual: ícone minimalista de carrinho + checkout em linhas gradiente violeta-azul
- Orb azul canto inferior direito, orb violeta superior esquerdo
- Dot grid
- Logo dev.RR canto inferior direito
```

---

## Post 13 — 26/Jun (Sex) · Carrossel (5 slides)

**Tema:** CRM — parar de perder orçamento e follow-up no WhatsApp  
**Objetivo:** educar sobre organização comercial simples para pequenos negócios  
**Template:** Carrossel Listicle — capa Hook + slides Educativo + CTA  

### Legenda
```
Você não perde cliente só por preço.

Às vezes perde porque esqueceu de responder.
Porque não anotou quem pediu orçamento.
Porque não voltou no lead depois de 3 dias.
Porque tudo fica espalhado entre WhatsApp, papel, planilha e memória.

CRM é uma forma simples de organizar quem chegou, em que etapa está e qual é o próximo passo.

Não precisa ser complicado.
Precisa funcionar para sua rotina.

Se seu comercial está bagunçado, eu posso criar uma estrutura sob medida.

#crm #vendas #atendimento #negociolocal #organizacaocomercial #devrr
```

### Slides — Estrutura
- **Capa:** "Você lembra de todo cliente que pediu orçamento?"
- **Slide 2:** "01 — Lead novo" — quem chamou no WhatsApp, formulário ou Instagram
- **Slide 3:** "02 — Orçamento enviado" — quem recebeu proposta e precisa de retorno
- **Slide 4:** "03 — Follow-up" — quem ainda pode fechar se você acompanhar
- **Slide 5:** "CRM simples. Mais controle. Menos cliente esquecido." + CTA + logo

### Prompt para imagem (Carrossel — 1080×1350px por slide (4:5))
```
[Aplicar BRAND SYSTEM acima — dot grid + orbs em TODOS os slides]

5 slides 1080×1350px.

SLIDE 1 — CAPA:
- Eyebrow DM Mono: "CRM · ORGANIZAÇÃO COMERCIAL"
- Headline Bricolage 800 (~50px): "Você lembra de todo cliente que pediu orçamento?"
- Sub Plus Jakarta: "Arraste para ver onde os contatos se perdem →"
- Logo dev.RR canto superior direito

SLIDES 2, 3, 4:
- Número gigante decorativo (01/02/03) em gradient text, opacity 0.75
- Eyebrow DM Mono: "ETAPA 0X"
- Divider
- Headline Bricolage 800: [nome da etapa]
- Corpo Plus Jakarta: [explicação curta sobre o risco de perder o contato nessa fase]
- Elemento visual: pipeline minimalista com 3 colunas pequenas no rodapé
- Logo dev.RR pequeno canto superior direito

SLIDE 5 — CTA:
- Eyebrow DM Mono: "PRÓXIMO PASSO"
- Divider
- Headline Bricolage 800: "Seu atendimento precisa de processo, não de memória."
- Body Plus Jakarta: "Eu crio um CRM simples para seu negócio acompanhar leads e vendas."
- Separador 1px
- CTA button gradient: "Me chama"
- Logo-primary-color.svg ao lado do CTA
```

---

## Post 14 — 27/Jun (Sáb) · Feed Único

**Tema:** Sistemas personalizados — quando a planilha começa a atrapalhar  
**Objetivo:** mostrar valor de sistema sob medida sem linguagem técnica pesada  
**Template:** Modo 1 — Hook  

### Legenda
```
Toda empresa começa controlando alguma coisa em planilha.

Até a planilha virar o problema.

Quando tem muita aba, muita versão, muita informação duplicada e gente perguntando "qual é a planilha certa?", você não precisa de mais organização manual.

Você precisa de um sistema.

Um painel feito para o seu processo:
cadastros, pedidos, clientes, agenda, relatórios, permissões e o que mais fizer sentido para sua operação.

Sistema personalizado é para quando a ferramenta genérica já não acompanha o jeito que sua empresa trabalha.

Me chama e a gente desenha isso juntos.

#sistemas #sistemapersonalizado #automacao #gestao #negociodigital #devrr
```

### Prompt para imagem (Feed 4:5 — 1080×1350px)
```
[Aplicar BRAND SYSTEM acima]

Frame 1080×1350px (4:5). Tom: direto, problema operacional.

Composição:
- Eyebrow DM Mono (#60A5FA): "SISTEMA PERSONALIZADO"
- Divider
- Headline Bricolage 800 (~50px, branco): "Quando a planilha vira o problema."
- Corpo Plus Jakarta 18px rgba(255,255,255,0.45): "Cadastros, pedidos, clientes e relatórios em um painel feito para sua operação."
- Elemento visual: mockup abstrato de dashboard escuro com cards pequenos, tabela e gráfico simples em linhas violeta/azul
- Tag pills pequenas: "clientes", "pedidos", "agenda", "relatórios"
- Orb azul atrás do mockup, orb violeta no canto oposto
- Dot grid
- Logo dev.RR canto inferior direito
```

---

## Post 15 — 28/Jun (Dom) · Carrossel (5 slides)

**Tema:** Tráfego pago — anúncio sem estrutura desperdiça dinheiro  
**Objetivo:** explicar que anúncio precisa de página, oferta e acompanhamento  
**Template:** Carrossel Educativo — capa Hook + slides Educativo/Stat + CTA  

### Legenda
```
Tráfego pago não salva uma estrutura ruim.

Se o anúncio leva para uma página confusa, um WhatsApp sem contexto ou um perfil que não explica nada, você está pagando por clique e perdendo oportunidade.

Antes de colocar dinheiro em anúncio, precisa ter:
→ oferta clara
→ página de destino
→ botão de WhatsApp bem posicionado
→ mensagem inicial pronta
→ acompanhamento dos contatos

Anúncio bom não é só criativo bonito.
É caminho claro até a conversa.

Eu posso te ajudar com a estrutura e com as mídias para campanha.

#trafegopago #anunciosonline #landingpage #captacaodeleads #marketingdigital #devrr
```

### Slides — Estrutura
- **Capa:** "Anúncio sem estrutura só compra clique"
- **Slide 2:** "01 — Oferta clara" — o cliente precisa entender rápido
- **Slide 3:** "02 — Página de destino" — cada campanha precisa de um caminho
- **Slide 4:** "03 — WhatsApp preparado" — mensagem e atendimento sem fricção
- **Slide 5:** "Quer anunciar sem desperdiçar verba?" + CTA + logo

### Prompt para imagem (Carrossel — 1080×1350px por slide (4:5))
```
[Aplicar BRAND SYSTEM acima — dot grid + orbs em TODOS os slides]

5 slides 1080×1350px.

SLIDE 1 — CAPA:
- Eyebrow DM Mono: "TRÁFEGO PAGO · ESTRUTURA"
- Headline Bricolage 800 (~52px): "Anúncio sem estrutura só compra clique"
- Sub Plus Jakarta: "Arraste para ver o caminho certo →"
- Elemento visual: cursor/click + linha indo para WhatsApp
- Logo dev.RR

SLIDES 2, 3, 4:
- Número gigante decorativo (01/02/03) gradient
- Eyebrow DM Mono: "PEÇA 0X"
- Divider
- Headline Bricolage 800: [Oferta clara / Página de destino / WhatsApp preparado]
- Corpo Plus Jakarta: [explicação de uma linha]
- Mini fluxo visual no rodapé: "Anúncio → Página → WhatsApp"
- Logo dev.RR pequeno

SLIDE 5 — CTA:
- Eyebrow DM Mono: "PRÓXIMO PASSO"
- Divider
- Headline Bricolage 800: "Quer anunciar sem desperdiçar verba?"
- Body Plus Jakarta: "Eu estruturo campanha, página e criativos para virar clique em conversa."
- Separador 1px
- CTA button gradient: "Me chama"
- Logo-primary-color.svg ao lado
```

---

## Post 16 — 29/Jun (Seg) · Feed Único

**Tema:** Mídias digitais — posts, carrosséis e artes para anúncios com objetivo  
**Objetivo:** posicionar criação de conteúdo como peça de venda e confiança  
**Template:** Modo 4 — Educativo  

### Legenda
```
Post bonito ajuda.

Mas post bonito sem objetivo vira só enfeite no feed.

Uma boa mídia digital precisa responder:
→ quem precisa ver isso?
→ qual dor ela ativa?
→ qual serviço ela apresenta?
→ qual ação a pessoa deve tomar depois?

Eu crio posts, carrosséis e artes para anúncios pensando em clareza, identidade e conversão.

Conteúdo profissional não é só estética.
É comunicação que ajuda o cliente a entender por que deve falar com você.

#midiasdigitais #socialmedia #carrossel #criativos #designpararedessociais #devrr
```

### Prompt para imagem (Feed 4:5 — 1080×1350px)
```
[Aplicar BRAND SYSTEM acima]

Frame 1080×1350px (4:5). Layout educativo com lista numerada.

Composição:
- Eyebrow DM Mono (#60A5FA): "MÍDIAS DIGITAIS"
- Divider
- Headline Bricolage 800 (~46px, branco): "Post bonito não basta."
- Lista numerada DM Mono + Plus Jakarta:
  01 — dor certa
  02 — mensagem clara
  03 — identidade consistente
  04 — próximo passo
- Corpo Plus Jakarta 16px rgba(255,255,255,0.45): "Posts, carrosséis e artes para anúncios com objetivo de negócio."
- Elemento visual: 3 mini-cards sobrepostos simulando feed/carrossel/anúncio
- Orb azul canto inferior, orb violeta superior
- Dot grid
- Logo dev.RR canto inferior direito
```

---

## Post 17 — 30/Jun (Ter) · Carrossel (5 slides)

**Tema:** SaaS / MVP — transformar ideia ou processo em produto digital  
**Objetivo:** abrir conversa com empresas que precisam de produto, portal ou ferramenta própria  
**Template:** Carrossel Tutorial/Processo — capa Hook + slides Educativo + CTA  

### Legenda
```
Às vezes o que sua empresa precisa não é só um site.

É uma ferramenta.

Um portal para cliente.
Um painel interno.
Um sistema de assinatura.
Um MVP para testar uma ideia.
Um SaaS simples para vender uma solução recorrente.

O ponto não é começar gigante.
É começar com a primeira versão certa: o mínimo que resolve uma dor real e pode evoluir.

Eu ajudo a transformar ideia, processo ou serviço em produto digital.

Me chama e a gente desenha o primeiro passo.

#saas #mvp #produtodigital #sistemapersonalizado #startupbrasil #devrr
```

### Slides — Estrutura
- **Capa:** "Sua ideia precisa virar um produto digital?"
- **Slide 2:** "01 — Dor clara" — qual problema o produto resolve
- **Slide 3:** "02 — Primeira versão" — MVP simples, testável e útil
- **Slide 4:** "03 — Evolução" — melhorias a partir de uso real
- **Slide 5:** "Comece pequeno. Construa certo." + CTA + logo

### Prompt para imagem (Carrossel — 1080×1350px por slide (4:5))
```
[Aplicar BRAND SYSTEM acima — dot grid + orbs em TODOS os slides]

5 slides 1080×1350px.

SLIDE 1 — CAPA:
- Eyebrow DM Mono: "SAAS · MVP · PRODUTO DIGITAL"
- Headline Bricolage 800 (~50px): "Sua ideia precisa virar um produto digital?"
- Sub Plus Jakarta: "Comece pela primeira versão certa →"
- Elemento visual: wireframe minimalista de app com módulos conectados
- Logo dev.RR canto superior direito

SLIDES 2, 3, 4:
- Número gigante decorativo (01/02/03) gradient
- Eyebrow DM Mono: "PASSO 0X"
- Divider
- Headline Bricolage 800: [Dor clara / Primeira versão / Evolução]
- Corpo Plus Jakarta: [explicação objetiva]
- Elemento visual: linha de evolução "ideia → MVP → produto"
- Logo dev.RR pequeno

SLIDE 5 — CTA:
- Eyebrow DM Mono: "PRÓXIMO PASSO"
- Divider
- Headline Bricolage 800: "Comece pequeno. Construa certo."
- Body Plus Jakarta: "Eu te ajudo a tirar a ideia do papel com uma primeira versão funcional."
- Separador 1px
- CTA button gradient: "Me chama"
- Logo-primary-color.svg ao lado
```

---

## Resumo do mês

| # | Data | Formato | Tema | Artigo |
|---|------|---------|------|--------|
| 01 | 12/Jun (Sex) | Feed único | Apresentação dev.RR | — |
| 02 | 13/Jun (Sáb) | Carrossel 5 slides | 5 sinais que seu negócio precisa de site | — |
| 03 | 14/Jun (Dom) | Feed único | Estatística: negócios sem presença digital | [AdLocal](https://www.adlocal.com.br/blog/mais-da-metade-dos-negocios-locais-ainda-nao-tem-uma-presenca-digital-efetiva-e-o-seu) |
| 04 | 16/Jun (Ter) | Carrossel 4 slides | Processo: como funciona com a dev.RR | — |
| 05 | 17/Jun (Qua) | Feed único | "Mas tenho Instagram, preciso de site?" | — |
| 06 | 18/Jun (Qui) | Feed único | Velocidade do site = dinheiro | [Doisz](https://doisz.com/blog/impacto-da-velocidade-do-site-nas-taxas-de-conversao/) |
| 07 | 19/Jun (Sex) | Carrossel 5 slides | 3 tipos de site + para quem é cada um | — |
| 08 | 20/Jun (Sáb) | Feed único | Bastidores do desenvolvimento | — |
| 09 | 21/Jun (Dom) | Carrossel 5 slides | SEO local explicado | — |
| 10 | 23/Jun (Ter) | Feed único | CTA emocional — o custo invisível | — |
| 11 | 24/Jun (Qua) | Carrossel 5 slides | Checklist: pronto para o digital? | — |
| 12 | 25/Jun (Qui) | Feed único | E-commerce: loja online própria | — |
| 13 | 26/Jun (Sex) | Carrossel 5 slides | CRM: organizar leads e follow-up | — |
| 14 | 27/Jun (Sáb) | Feed único | Sistemas personalizados: além da planilha | — |
| 15 | 28/Jun (Dom) | Carrossel 5 slides | Tráfego pago: anúncio com estrutura | — |
| 16 | 29/Jun (Seg) | Feed único | Mídias digitais para posts e anúncios | — |
| 17 | 30/Jun (Ter) | Carrossel 5 slides | SaaS/MVP: produto digital sob medida | — |

**Total:** 17 posts · 8 carrosséis · 9 feeds únicos  
**Pausas planejadas:** 15/Jun (Seg) e 22/Jun (Seg)  
**Artigos com link real:** posts 03 e 06

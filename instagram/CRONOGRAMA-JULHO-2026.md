# Cronograma Instagram — dev.RR — Julho 2026

**Cadência ajustada:** 12 posts entre 3/Jul e 29/Jul, pausas naturais nos domingos  
**Objetivo do mês:** converter awareness de junho em confiança e conversas — dor clara → hook forte → CTA  
**Paleta:** `#07070F` (fundo), `#7C3AED` (violeta), `#60A5FA` (azul claro), `#2563EB` (azul deep)  
**Tom:** direto, técnico mas humano, sem papo de agência

> 🎯 Posts com **🎯 Campanha Alcance** → rodar `criar_campanhas.py` assim que publicar. R$8/dia × 7 dias. Targeting Triângulo MG (Patrocínio / Patos de Minas / Uberlândia, 17km). Objetivo: REACH.

> **Aprendizados de junho aplicados:**
> - Post pessoal (Post 01) foi o maior do mês sem ad — humanização primeiro
> - Campanha Alcance: CPM R$1,54 (4× mais barato) — único objetivo que vale manter
> - 17 posts = queda de qualidade na segunda quinzena; 12 posts com mais espaçamento
> - Ad em conteúdo fraco = alcance inflado sem engajamento — ad só em posts com hook forte
> - Segunda quinzena morre sem campanha ativa — mínimo 1 sempre rodando
> - Serviço-first = posts mais fracos; empacotar serviço sempre em ângulo de dor

---

## Sistema Visual Base — dev.RR

> **Cole este bloco no início de cada prompt para a skill `/instagram-carousel` ou `/imagegen-frontend-web`.**

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

## Post 01 — 19h — 3/Jul (Qui) · Feed Único

**Tema:** Por que escolhi trabalhar com negócios locais — história pessoal  
**Objetivo:** conexão emocional, humanização mais profunda que o Post 01 de junho  
**Template:** Modo 8 — Institucional / pessoal  
**Base:** Post 01 de junho foi o maior orgânico do mês (640 reach, 70 eng, 9 comentários) sem nenhum ad → repetir o ângulo pessoal com profundidade maior

### Legenda
```
Não escolhi trabalhar com negócios locais por acaso.

Cresci vendo negócios bons — o tipo de negócio que cuida bem do cliente, que tem história, que faz a diferença na cidade — serem invisíveis na internet.

Não por falta de qualidade.
Por falta de estrutura digital.

Enquanto isso, negócios mediocres com site bonito apareciam na frente no Google.
E o cliente escolhia quem aparecia, não necessariamente quem era melhor.

Isso me incomodou.

Eu quero que o negócio que merece cliente encontre cliente.
Não que o negócio que tem mais verba de marketing ganhe por padrão.

Por isso a dev.RR existe. Por isso atendo negócios locais no Triângulo Mineiro e região.

Se você tem um negócio bom que ainda não está sendo encontrado — é exatamente isso que eu resolvo.

Me chama. 📲
🔗 Link na bio

#devlocal #negóciolocal #webdesign #sitepronto #triângulomineiro #presençadigital #desenvolvimentoweb
```

### Prompt para imagem (Feed 4:5 — 1080×1350px)
```
[Aplicar BRAND SYSTEM acima]

Frame 1080×1350px (4:5). Layout institucional pessoal — centrado, denso em tipografia, quase sem elementos decorativos extras.

Composição:
- Logo "dev.RR" (Bricolage Grotesque 800, gradient #7C3AED→#60A5FA) centralizado no terço superior
- Eyebrow DM Mono (#60A5FA, uppercase): "POR QUE FAÇO ISSO"
- Divider 24px × 2px gradient
- Headline Bricolage 800 (~48px, branco): "Negócio bom merece ser encontrado."
- Corpo Plus Jakarta Sans 17px rgba(255,255,255,0.45):
  "Negócios locais com qualidade e sem estrutura digital perdem para medíocres com site bonito.
  Isso é o que a dev.RR muda."
- Linha divisória 1px rgba(255,255,255,0.06) abaixo
- Handle DM Mono 10px rgba(255,255,255,0.28): "@devrigoni · Triângulo Mineiro"
- Orb azul grande (#2563EB, 28% opacity, ~280px) centralizado atrás do texto
- Orb violeta (#7C3AED, 15%) canto superior direito difuso
- Dot grid overlay em todo o frame
```

---

## Post 02 — 20h30 — 5/Jul (Sáb) · Carrossel (5 slides) 🎯 Campanha Alcance

**Tema:** Pesquisei negócios locais no Google — o resultado foi surpreendente  
**Objetivo:** dado experiencial, prova de expertise, identificação com dor de invisibilidade  
**Template:** Carrossel Listicle — capa Hook + slides Stat + CTA  
**Destaque:** gancho de dado vivido > dado genérico (aprendizado de junho: Post 03 com "52%" teve reach 92 vs Post 09 com cena cotidiana teve reach 191)

### Legenda
```
Fiz um teste essa semana.

Pesquisei 10 tipos de negócio no Google — o tipo de serviço que qualquer um contrata: mecânica, dentista, advogado, salão, assistência técnica.

Resultado:

A maioria era invisível.

Não porque eram ruins. Porque simplesmente não existiam na internet do jeito que o Google entende.

E enquanto eles não aparecem, o concorrente — que pode ser pior — aparece na frente.

Swipe pra ver o que encontrei. 👆

Se você é um desses negócios, me chama. A gente muda isso.
🔗 Link na bio

#seolocal #googlenegocios #negóciolocal #presençadigital #webdesign #apareçanogoogle
```

### Slides — Estrutura
- **Capa:** "Pesquisei 10 negócios locais no Google. O resultado me preocupou."
- **Slide 2:** "01 — A maioria não tinha site próprio" — só perfis de redes sociais e nada mais
- **Slide 3:** "02 — Metade não aparecia no Google Maps" — sem Google Meu Negócio ou ficha desatualizada
- **Slide 4:** "03 — Vários tinham informações erradas ou antigas" — telefone desatualizado, horário errado, fotos de 2018
- **Slide 5 (CTA):** "Se é assim em toda cidade do interior, talvez seja assim com o seu negócio também." + CTA "Me chama" + logo

### Prompt para imagem (Carrossel — 1080×1350px por slide)
```
[Aplicar BRAND SYSTEM acima — dot grid + orbs em TODOS os slides]

5 slides 1080×1350px. Estilo dado experiencial + listicle.

SLIDE 1 — CAPA:
- Eyebrow DM Mono: "TESTE REAL · NEGÓCIOS LOCAIS"
- Headline Bricolage 800 (~50px): "Pesquisei 10 negócios locais no Google."
- Sub Plus Jakarta 18px rgba(255,255,255,0.45): "O resultado me preocupou."
- Logo dev.RR canto superior direito
- Dois orbs intensos — azul superior direito, violeta inferior esquerdo

SLIDES 2, 3, 4 (cada descoberta):
- Número decorativo gigante (01/02/03) gradient violeta-azul, opacity 0.85, posição absoluta fundo
- Eyebrow DM Mono: "DESCOBERTA 0X"
- Divider 24px × 2px
- Headline Bricolage 800 (~28px, branco): [título da descoberta]
- Corpo Plus Jakarta 14px rgba(255,255,255,0.45): [contexto em 1–2 linhas]
- Logo dev.RR pequeno canto superior direito
- Orbs em posição diferente em cada slide

SLIDE 5 — CTA:
- Eyebrow DM Mono: "PRÓXIMO PASSO"
- Divider
- Headline Bricolage 800 (~40px): "Se é assim em toda cidade, talvez seja assim com o seu negócio também."
- Separador 1px rgba(255,255,255,0.06)
- CTA button gradient: "Me chama 📲"
- Logo-primary-color.svg ao lado
- Dois orbs intensos violeta + azul
```

---

## Post 03 — 19h — 8/Jul (Ter) · Feed Único

**Tema:** "Mas é caro demais pra mim" — destruindo a objeção de preço  
**Objetivo:** quebrar a principal objeção antes do prospect chegar — posicionar site como investimento, não gasto  
**Template:** Modo 1 — Hook / contraste

### Legenda
```
"Mas é caro demais pra mim."

Essa é a frase que mais ouço.

E entendo. Faz sentido questionar qualquer gasto no negócio.

Mas deixa eu virar a lógica:

Quanto você perde por mês com cliente que pesquisou seu serviço no Google, não te achou, e foi para o concorrente?

Se for 1 cliente por semana com ticket médio de R$200 → são R$800/mês.
São R$9.600 por ano.
Em silêncio. Sem você saber.

Um site profissional custa uma fração disso.
E ele trabalha 24h por dia, 7 dias por semana, sem férias e sem reclamação.

O que é caro, mesmo?

Me chama. Vamos ver o que faz sentido pro seu negócio.
🔗 Link na bio

#sitepronto #investimento #negóciolocal #presençadigital #webdesign #marketingdigital
```

### Prompt para imagem (Feed 4:5 — 1080×1350px)
```
[Aplicar BRAND SYSTEM acima]

Frame 1080×1350px (4:5). Tom: inversão de lógica, contraste forte.

Composição:
- Eyebrow DM Mono (#60A5FA): "A CONTA QUE NINGUÉM FAZ"
- Divider
- Headline Bricolage 800 (~50px, branco): "O que é caro, mesmo?"
- Grid 2×2 simples: 4 pills em DM Mono mostrando:
  "1 cliente/semana perdido" → "R$800/mês"
  "12 meses" → "R$9.600 invisíveis"
  Estilo: border 1px rgba(124,58,237,0.3), bg rgba(124,58,237,0.06), border-radius 8px
- Corpo Plus Jakarta 16px rgba(255,255,255,0.45):
  "Site profissional custa uma fração disso. E trabalha 24h."
- Orb azul grande canto inferior direito, orb violeta superior esquerdo
- Dot grid
- Logo dev.RR canto inferior direito
```

---

## Post 04 — 20h30 — 10/Jul (Qui) · Carrossel (5 slides) 🎯 Campanha Alcance

**Tema:** Um dia na vida do seu negócio — com site vs sem site  
**Objetivo:** comparação cotidiana, identificação com situações reais, mostrar impacto prático  
**Template:** Modo 5 — Antes / Depois expandido (um cenário por slide)

### Legenda
```
Mesmo dia. Mesmo serviço. Mesmo preço.

A única diferença: um tem site. O outro não.

Swipe pra ver como esse dia termina diferente para cada um. 👆

Se você se identificou com o lado esquerdo — me chama.
🔗 Link na bio

#sitepronto #negóciolocal #presençadigital #webdesign #googlenegocios #marketinglocal
```

### Slides — Estrutura
- **Capa:** "Mesmo negócio. Mesmo serviço. Resultados completamente diferentes." — dois lados implícitos
- **Slide 2 — Cena 1: O cliente pesquisa:** Sem site → "não encontrou, ligou para o concorrente" / Com site → "encontrou, leu sobre o serviço, mandou WhatsApp"
- **Slide 3 — Cena 2: A noite de sexta:** Sem site → "cliente sumiu, você não sabe por quê" / Com site → "formulário recebido às 23h, você responde segunda"
- **Slide 4 — Cena 3: A reunião de segunda:** Sem site → "passa 20 min explicando o que faz no WhatsApp" / Com site → "cliente já chegou sabendo tudo, quer fechar"
- **Slide 5 (CTA):** "Qual lado você quer estar?" + CTA + logo

### Prompt para imagem (Carrossel — 1080×1350px por slide)
```
[Aplicar BRAND SYSTEM acima — dot grid + orbs em TODOS os slides]

5 slides 1080×1350px. Estilo comparação cotidiana.

SLIDE 1 — CAPA:
- Eyebrow DM Mono: "COM SITE vs SEM SITE"
- Headline Bricolage 800 (~50px): "Mesmo negócio. Resultados completamente diferentes."
- Sub Plus Jakarta: "Deslize para ver →"
- Logo dev.RR canto superior direito
- Dois orbs — azul superior direito, violeta inferior esquerdo

SLIDES 2, 3, 4 (cada cena):
- Topo: eyebrow DM Mono "CENA 0X" + nome da cena
- Divider
- Split horizontal (2 colunas separadas por linha 1px rgba(255,255,255,0.06)):
  - Col esquerda: label DM Mono (#F87171) "SEM SITE" + situação negativa em Plus Jakarta cinza
  - Col direita: label DM Mono (#60A5FA) "COM SITE" + situação positiva em Plus Jakarta branco
- Logo dev.RR pequeno canto superior direito
- Orb alternado por slide

SLIDE 5 — CTA:
- Eyebrow DM Mono: "QUAL LADO VOCÊ QUER ESTAR?"
- Divider
- Headline Bricolage 800 (~44px): "O site não é gasto. É o lado certo da história."
- Separador 1px
- CTA button gradient: "Me chama 📲"
- Logo-primary-color.svg ao lado
- Dois orbs intensos
```

---

## Post 05 — 9h — 12/Jul (Sáb) · Feed Único

**Tema:** "Às 2h da manhã, alguém pesquisou seu serviço." — urgência emocional noturna  
**Objetivo:** cena cotidiana de alto impacto, mostrar o site como canal que nunca fecha  
**Template:** Modo 1 — Hook emocional

### Legenda
```
Às 2h da manhã de uma quinta, alguém no seu bairro pesquisou no Google:

"[seu serviço] perto de mim"

O que apareceu?

Se você não tem site, não apareceu nada seu.
A pessoa escolheu quem apareceu.
E você nem ficou sabendo que ela existia.

Não foi o concorrente que ganhou por ser melhor.
Ganhou por estar disponível onde o cliente foi procurar.

Às 2h. Em um celular. Sem você precisar estar acordado.

É isso que um site faz.

Me chama. A gente coloca você onde o cliente procura.
🔗 Link na bio

#sitepronto #negóciolocal #presençadigital #seolocal #apareçanogoogle #webdesign
```

### Prompt para imagem (Feed 4:5 — 1080×1350px)
```
[Aplicar BRAND SYSTEM acima]

Frame 1080×1350px (4:5). Tom: noturno, atmosférico, urgência silenciosa.

Composição:
- Eyebrow DM Mono (#60A5FA): "02:00 · QUINTA-FEIRA"
- Divider
- Headline Bricolage 800 (~50px, branco): "Alguém pesquisou seu serviço agora."
- Corpo Plus Jakarta 18px rgba(255,255,255,0.45):
  "O que apareceu quando digitou o seu tipo de serviço + 'perto de mim'?"
- Elemento visual decorativo: barra de pesquisa estilizada (border 1px rgba(255,255,255,0.1), bg rgba(255,255,255,0.04), border-radius 8px) com texto DM Mono "#60A5FA": "[ seu serviço ] perto de mim 🔍"
- Orbs mais intensos e concentrados no centro — sensação de luz na escuridão
- Dot grid
- Logo dev.RR canto inferior direito
```

---

## Post 06 — 19h — 15/Jul (Ter) · Feed Único

**Tema:** Google Meu Negócio — "Antes de contratar qualquer coisa, faça isso. É gratuito."  
**Objetivo:** entregar valor gratuito imediato, posicionar Renan como especialista confiável, atrair leads qualificados  
**Template:** Modo 4 — Educativo com lista numerada

### Legenda
```
Antes de falar em site, tem uma coisa que todo negócio local precisa fazer agora.

É gratuito. Leva 15 minutos. E já melhora sua visibilidade no Google amanhã.

Chama Google Meu Negócio (ou Google Business Profile).

É a ficha que aparece quando alguém pesquisa seu nome ou sua categoria perto de você — com endereço, horário, telefone, fotos e avaliações.

Para criar ou verificar a sua:
→ acesse business.google.com
→ pesquise o nome do seu negócio
→ se não existir, crie do zero
→ preencha tudo: horário, telefone, fotos reais, descrição clara
→ peça para clientes deixarem avaliação

Simples assim.

Feito isso, site vem depois.
E quando vem, o Google já sabe que você existe.

Dúvida sobre como configurar? Me chama — explico de graça.
🔗 Link na bio

#googlenegocios #googlebusiness #seolocal #negóciolocal #presençadigital #apareçanogoogle
```

### Prompt para imagem (Feed 4:5 — 1080×1350px)
```
[Aplicar BRAND SYSTEM acima]

Frame 1080×1350px (4:5). Layout educativo com lista numerada. Tom: tutorial direto.

Composição:
- Eyebrow DM Mono (#60A5FA): "ANTES DO SITE · GRATUITO"
- Divider
- Headline Bricolage 800 (~46px, branco): "Configure isso agora. Leva 15 minutos."
- Lista numerada em DM Mono + Plus Jakarta:
  01 — Acesse business.google.com
  02 — Crie ou reivindique seu negócio
  03 — Preencha tudo: horário, fotos, telefone
  04 — Peça avaliações para clientes
  (cada item: DM Mono "#60A5FA" para número, Plus Jakarta rgba branco para texto)
- Badge pill inferior: "Google Meu Negócio · Gratuito" — border rgba(96,165,250,0.3), bg rgba(96,165,250,0.06)
- Orb azul canto inferior direito (#2563EB, 30%), orb violeta superior esquerdo (#7C3AED, 18%)
- Dot grid
- Logo dev.RR canto inferior direito
```

---

## Post 07 — 20h30 — 17/Jul (Qui) · Carrossel (5 slides) 🎯 Campanha Alcance

**Tema:** FAQ — as 4 perguntas que recebo antes de todo projeto  
**Objetivo:** quebrar objeção de forma leve, mostrar transparência, reduzir fricção do primeiro contato  
**Template:** Carrossel FAQ — capa Hook + slides Pergunta/Resposta + CTA

### Legenda
```
Antes de fechar qualquer projeto, todo cliente me pergunta basicamente a mesma coisa.

Então vou responder aqui de uma vez.

Swipe para ver as 4 perguntas que sempre aparecem — e minhas respostas diretas. 👆

Tem uma pergunta que não está aqui? Me manda no WhatsApp.
🔗 Link na bio

#webdesign #sitepronto #desenvolvimentoweb #negóciolocal #faq #presençadigital
```

### Slides — Estrutura
- **Capa:** "As 4 perguntas que recebo antes de todo projeto" + sub "e minhas respostas diretas"
- **Slide 2 — P1:** "Quanto tempo leva para ficar pronto?" → "Depende da complexidade, mas a maioria dos sites fica pronto entre 2 e 4 semanas. Do briefing ao ar."
- **Slide 3 — P2:** "Quanto custa?" → "Cada projeto é orçado individualmente. Me conta o que você precisa e eu te passo um valor justo. Sem taxa de consulta."
- **Slide 4 — P3:** "Preciso entender de tecnologia para trabalhar com você?" → "Não. Meu trabalho é exatamente traduzir o seu negócio para a internet. Você me conta, eu cuido do resto."
- **Slide 5 — P4 + CTA:** "E se eu não gostar do resultado?" → "Você acompanha e aprova cada etapa antes de ir ao ar. Sem surpresa no final." + CTA "Mais perguntas? Me chama" + logo

### Prompt para imagem (Carrossel — 1080×1350px por slide)
```
[Aplicar BRAND SYSTEM acima — dot grid + orbs em TODOS os slides]

5 slides 1080×1350px. Estilo FAQ direto.

SLIDE 1 — CAPA:
- Eyebrow DM Mono: "FAQ · PERGUNTAS DIRETAS"
- Headline Bricolage 800 (~50px): "As 4 perguntas que recebo antes de todo projeto."
- Sub Plus Jakarta: "Respostas diretas. Deslize →"
- Logo dev.RR canto superior direito
- Orbs violeta + azul cantos opostos

SLIDES 2, 3, 4 (cada pergunta):
- Número decorativo gigante (01/02/03) gradient opacity 0.75 fundo
- Eyebrow DM Mono: "PERGUNTA 0X"
- Divider
- Headline Bricolage 800 (~26px, branco): [a pergunta em itálico ou aspas]
- Linha sutil 1px rgba(255,255,255,0.06) abaixo
- Corpo Plus Jakarta 16px rgba(255,255,255,0.55): [resposta direta]
- Logo dev.RR pequeno canto superior direito
- Orb alternado por slide

SLIDE 5 — P4 + CTA:
- Número "04" decorativo gigante
- Eyebrow DM Mono: "PERGUNTA 04 · PRÓXIMO PASSO"
- Divider
- Headline Bricolage 800 (~22px): "E se eu não gostar do resultado?"
- Corpo Plus Jakarta: "Você acompanha e aprova cada etapa antes de ir ao ar."
- Separador 1px
- CTA button gradient: "Mais perguntas? Me chama 📲"
- Logo-primary-color.svg ao lado
- Dois orbs intensos
```

---

## Post 08 — 9h — 19/Jul (Sáb) · Feed Único

**Tema:** Quanto custa NÃO ter site — ROI invertido  
**Objetivo:** complementar Post 03 (objeção de preço) com abordagem mais visual e calculável  
**Template:** Modo 3 — Dado / Stat com cálculo visual

### Legenda
```
A conta que a maioria dos donos de negócio nunca faz:

Quantos clientes potenciais você perde por mês por não aparecer no Google?

Não vou inventar número. Mas pensa comigo:

Se sua cidade tem 50.000 pessoas...
E 3% busca por serviços como o seu por mês...
São 1.500 buscas.

Se você não aparece, fica com 0% disso.
Seu concorrente que aparece pega uma fatia.

Você não perdeu porque era pior.
Perdeu porque estava invisível.

Invisibilidade tem custo. Só não aparece na conta do banco como "prejuízo".

Aparece como oportunidade que simplesmente não chegou.

Me chama. Vamos calcular o que faz sentido pro seu negócio especificamente.
🔗 Link na bio

#presençadigital #negóciolocal #sitepronto #marketinglocal #seolocal #webdesign
```

### Prompt para imagem (Feed 4:5 — 1080×1350px)
```
[Aplicar BRAND SYSTEM acima]

Frame 1080×1350px (4:5). Layout stat com cálculo visual.

Composição:
- Eyebrow DM Mono (#60A5FA): "A CONTA QUE VOCÊ NÃO VÊ"
- Divider
- Destaque central: Bricolage 800 ~100px gradient text #7C3AED→#60A5FA: "0%"
- Corpo Plus Jakarta 18px branco abaixo: "das buscas chegam até você quando você é invisível"
- Linha 1px rgba(255,255,255,0.06) separando
- Mini funil visual em 3 linhas DM Mono + Plus Jakarta:
  "50.000 pessoas na cidade"
  "→ 3% buscam seu serviço = 1.500 buscas/mês"
  "→ sem site = 0 chegam até você"
- Corpo Plus Jakarta 14px rgba(255,255,255,0.35): "Invisibilidade tem custo. Só não aparece na conta."
- Orb azul grande centralizado atrás do "0%" (glow radial intenso)
- Dot grid
- Logo dev.RR canto inferior direito
```

---

## Post 09 — 19h — 22/Jul (Ter) · Carrossel (5 slides)

**Tema:** Para qual tipo de negócio faço o quê — segmentação direta  
**Objetivo:** fazer cada seguidor se identificar com seu tipo de negócio, gerar pergunta/contato  
**Template:** Carrossel Listicle — capa + slides por tipo de negócio + CTA

### Legenda
```
Não atendo todo mundo do mesmo jeito.

Porque uma loja local tem necessidade diferente de um profissional liberal.
Que tem necessidade diferente de um prestador de serviço.
Que tem necessidade diferente de quem quer vender online.

Swipe para ver qual tipo se parece com o seu — e o que eu recomendo em cada caso. 👆

Não se encaixou em nenhum? Me conta como é o seu negócio.
🔗 Link na bio

#negóciolocal #sitepronto #webdesign #presençadigital #lojalocal #prestadordeserviços
```

### Slides — Estrutura
- **Capa:** "Qual é o seu tipo de negócio? O que você precisa muda muito."
- **Slide 2 — Prestador de serviço:** advogado, dentista, arquiteto, contador, oficina, clínica → precisa de: site institucional com portfólio/serviços + Google Maps + WhatsApp direto
- **Slide 3 — Comércio local:** loja, restaurante, pet shop, farmácia → precisa de: site com cardápio/catálogo + horário + mapa + avaliações
- **Slide 4 — Profissional autônomo:** fotógrafo, designer, personal, coach → precisa de: landing page focada + portfólio + CTA de contato
- **Slide 5 (CTA):** "Qual é o seu? Me conta no WhatsApp que te digo o que faz mais sentido." + CTA + logo

### Prompt para imagem (Carrossel — 1080×1350px por slide)
```
[Aplicar BRAND SYSTEM acima — dot grid + orbs em TODOS os slides]

5 slides 1080×1350px. Estilo segmentação por perfil.

SLIDE 1 — CAPA:
- Eyebrow DM Mono: "QUAL TIPO DE NEGÓCIO É O SEU?"
- Headline Bricolage 800 (~50px): "O que você precisa muda muito."
- Sub Plus Jakarta: "Deslize para se identificar →"
- Pills horizontais: "Serviços", "Comércio", "Autônomo" — estilo badge violeta
- Logo dev.RR canto superior direito

SLIDES 2, 3, 4 (cada tipo):
- Número decorativo gigante (01/02/03) gradient fundo
- Eyebrow DM Mono: "TIPO 0X"
- Divider
- Headline Bricolage 800 (~28px): [nome do tipo]
- Badge pills de exemplos: "advogado", "dentista", "oficina" (border rgba(96,165,250,0.3))
- Linha sutil 1px
- Sub Plus Jakarta 14px rgba(255,255,255,0.45): "O que geralmente faz mais sentido:"
- Lista simples DM Mono: "→ [item 1]" / "→ [item 2]" / "→ [item 3]"
- Orb alternado por slide
- Logo dev.RR pequeno

SLIDE 5 — CTA:
- Eyebrow DM Mono: "PRÓXIMO PASSO"
- Divider
- Headline Bricolage 800 (~40px): "Qual é o seu? Me conta."
- Corpo Plus Jakarta: "Te digo o que faz mais sentido para o seu caso — sem enrolação."
- Separador 1px
- CTA button gradient: "Me chama no WhatsApp 📲"
- Logo-primary-color.svg ao lado
- Dois orbs intensos
```

---

## Post 10 — 19h — 24/Jul (Qui) · Feed Único 🎯 Campanha Alcance

**Tema:** Vagas abertas em julho — CTA direto com urgência real  
**Objetivo:** converter awareness acumulado em contato, urgência sem exagero  
**Template:** Modo 1 — Hook com CTA direto

### Legenda
```
Julho ainda tem espaço na agenda.

Agosto pode não ter — dependendo de quantos projetos entrar essa semana.

Se você está pensando em ter um site profissional, ou em melhorar o que já tem, esse é o momento de me chamar.

Não porque é oferta especial.
Porque é simplesmente quando tenho tempo pra sentar, entender seu negócio e entregar com atenção.

Quando está cheio, o prazo de entrega aumenta.
Quando está na medida, você começa a semana que vem.

Me chama agora pelo link na bio. Respondo hoje.

🔗 Link na bio

#sitepronto #webdesign #desenvolvimentoweb #negóciolocal #devlocal #triângulomineiro
```

### Prompt para imagem (Feed 4:5 — 1080×1350px)
```
[Aplicar BRAND SYSTEM acima]

Frame 1080×1350px (4:5). Tom: direto, CTA central, sem exagero.

Composição:
- Eyebrow DM Mono (#60A5FA): "JULHO · VAGAS ABERTAS"
- Divider
- Headline Bricolage 800 (~56px, branco): "Ainda dá tempo de começar em julho."
- Corpo Plus Jakarta 17px rgba(255,255,255,0.45):
  "Agosto depende de quantos projetos entrarem essa semana.
  Me chama agora — respondo hoje."
- CTA button gradient (mais proeminente que nos outros posts, centralizado):
  "Me chama 📲 · Link na bio"
  (Plus Jakarta 700, 15px, border-radius 9999px)
- Handle DM Mono 10px rgba(255,255,255,0.28): "@devrigoni"
- Orb azul grande centralizado atrás do botão (glow suave)
- Orb violeta canto superior direito
- Dot grid
- Logo dev.RR canto superior esquerdo
```

---

## Post 11 — 20h30 — 26/Jul (Sáb) · Carrossel (5 slides)

**Tema:** Do brief ao site: o que acontece depois do "sim" — bastidores 2.0  
**Objetivo:** humanizar o processo técnico, eliminar medo do desconhecido, prova de competência  
**Template:** Carrossel Tutorial — mais concreto que o Post 04 de junho (que foi genérico)  
**Diferencial vs junho:** Post 08 de junho foi superficial; este vai com detalhe em cada etapa + tom de "você vai saber exatamente o que esperar"

### Legenda
```
O que acontece depois que você fala "vamos lá"?

Muita gente hesita em contratar porque não sabe o que espera.

Eu prefiro deixar tudo às claras.

Swipe para ver cada etapa — do primeiro contato até o site no ar. 👆

Qualquer dúvida, me chama antes mesmo de decidir.
🔗 Link na bio

#webdesign #desenvolvimentoweb #sitepronto #processo #negóciolocal #bastidores
```

### Slides — Estrutura
- **Capa:** "O que acontece depois do 'sim'? Cada etapa do seu projeto, sem surpresa."
- **Slide 2 — Etapa 1: Briefing:** "Você me conta tudo sobre o negócio. Eu ouço mais do que falo." — o que pergunto, quanto tempo leva, o que você não precisa preparar
- **Slide 3 — Etapa 2: Estrutura:** "Antes de qualquer design, organizo o que vai existir no site." — mapa de páginas, textos, hierarquia de informação
- **Slide 4 — Etapa 3: Desenvolvimento:** "Código, design e velocidade ao mesmo tempo." — o que você acompanha, como aprova, quando pede ajuste
- **Slide 5 — Etapa 4 + CTA:** "Entrega + pós-entrega: não some depois que vai ao ar." + o que fica incluso + CTA

### Prompt para imagem (Carrossel — 1080×1350px por slide)
```
[Aplicar BRAND SYSTEM acima — dot grid + orbs em TODOS os slides]

5 slides 1080×1350px. Estilo processo/tutorial técnico mas humano.

SLIDE 1 — CAPA:
- Eyebrow DM Mono: "DO BRIEF AO SITE · BASTIDORES"
- Headline Bricolage 800 (~48px): "O que acontece depois do 'sim'."
- Sub Plus Jakarta: "Cada etapa do seu projeto. Sem surpresa. →"
- Linha de progresso visual (4 pontos conectados) em gradiente violeta-azul
- Logo dev.RR canto superior direito

SLIDES 2, 3, 4 (cada etapa):
- Número decorativo gigante (01/02/03) gradient opacity 0.8 fundo
- Eyebrow DM Mono: "ETAPA 0X"
- Divider
- Headline Bricolage 800 (~28px): [nome da etapa]
- Corpo Plus Jakarta 15px rgba(255,255,255,0.50): [descrição concreta]
- Pills com detalhes: "~X horas", "você aprova", "você não precisa de..." — estilo DM Mono pequeno
- Logo dev.RR pequeno
- Orb alternado por slide

SLIDE 5 — ETAPA 4 + CTA:
- Número "04" decorativo
- Eyebrow DM Mono: "ETAPA 04 · ENTREGA"
- Divider
- Headline Bricolage 800: "Não some depois que vai ao ar."
- Corpo Plus Jakarta: "Treinamento, ajustes pós-entrega e suporte incluso."
- Separador 1px
- CTA button gradient: "Quer saber mais? Me chama 📲"
- Logo-primary-color.svg ao lado
- Dois orbs intensos violeta + azul
```

---

## Post 12 — 19h — 29/Jul (Ter) · Feed Único

**Tema:** Encerramento de julho — convite para agosto  
**Objetivo:** criar continuidade, gerar antecipação, CTA suave para quem ainda não agiu  
**Template:** Modo 8 — Institucional / reflexão

### Legenda
```
Julho acabou rápido.

Pra quem acompanhou desde o começo do mês: obrigado. Espero que o conteúdo tenha ajudado a entender alguma coisa sobre presença digital, Google, site, e o que faz diferença de verdade pra um negócio local.

Pra quem está chegando agora:

Sou o Renan, da dev.RR.
Faço sites profissionais para negócios locais no Triângulo Mineiro.
Do zero. Com código. Sem template genérico.

Em agosto tem mais conteúdo vindo.
E se você quiser conversar antes disso, o link está na bio.

Até lá. 👋

#devlocal #webdesign #sitepronto #negóciolocal #presençadigital #triângulomineiro
```

### Prompt para imagem (Feed 4:5 — 1080×1350px)
```
[Aplicar BRAND SYSTEM acima]

Frame 1080×1350px (4:5). Tom: encerramento, reflexivo, simples.

Composição:
- Logo "dev.RR" (Bricolage Grotesque 800, gradient #7C3AED→#60A5FA) centralizado, tamanho maior (~80px)
- Eyebrow DM Mono (#60A5FA, uppercase): "JULHO 2026 · ATÉ LOGO"
- Divider
- Headline Bricolage 800 (~44px, branco): "Agosto tem mais coisa vindo."
- Corpo Plus Jakarta 17px rgba(255,255,255,0.45):
  "Sites para negócios locais no Triângulo Mineiro.
  Feito do zero. Com atenção. Sem template."
- Handle DM Mono 11px rgba(255,255,255,0.28): "@devrigoni"
- Orbs difusos e suaves — menos intensidade que outros posts (tom de encerramento)
- Dot grid mais sutil
```

---

## Resumo do mês

| # | Data | Horário | Formato | Tema | Ad |
|---|------|---------|---------|------|----|
| 01 | 3/Jul (Qui) | 19h | Feed único | Por que escolhi negócios locais — humanização | — |
| 02 | 5/Jul (Sáb) | 20h30 | Carrossel 5 slides | Pesquisei 10 negócios no Google — dado experiencial | 🎯 Alcance |
| 03 | 8/Jul (Ter) | 19h | Feed único | "Mas é caro" — objeção de preço destruída | — |
| 04 | 10/Jul (Qui) | 20h30 | Carrossel 5 slides | Com site vs sem site — comparação cotidiana | 🎯 Alcance |
| 05 | 12/Jul (Sáb) | 9h | Feed único | "Às 2h da manhã..." — urgência emocional noturna | — |
| 06 | 15/Jul (Ter) | 19h | Feed único | Google Meu Negócio — gratuito, faça agora | — |
| 07 | 17/Jul (Qui) | 20h30 | Carrossel 5 slides | FAQ — 4 perguntas antes de todo projeto | 🎯 Alcance |
| 08 | 19/Jul (Sáb) | 9h | Feed único | Quanto custa NÃO ter site — ROI invertido | — |
| 09 | 22/Jul (Ter) | 19h | Carrossel 5 slides | Para qual negócio faço o quê — segmentação | — |
| 10 | 24/Jul (Qui) | 19h | Feed único | Vagas abertas em julho — CTA direto | 🎯 Alcance |
| 11 | 26/Jul (Sáb) | 20h30 | Carrossel 5 slides | Do brief ao site — bastidores 2.0 | — |
| 12 | 29/Jul (Ter) | 19h | Feed único | Encerramento de julho — convite para agosto | — |

**Total:** 12 posts · 5 carrosséis · 7 feeds únicos  
**Campanhas Alcance:** posts 02, 04, 07, 10 · R$8/dia × 7 dias = ~R$224 orçamento total  
**Pausas naturais:** domingos (6, 13, 20, 27/Jul)  
**Pilares por distribuição:** 42% educação/dor · 25% processo/bastidores · 17% comparação · 8% CTA · 8% humanização

---

## Checklist antes de publicar (da DIRETRIZ-CONTEUDO-JULHO-2026.md)

Antes de publicar qualquer post:
- [ ] A primeira frase/imagem segura o scroll?
- [ ] O dono de negócio local entende sem conhecimento técnico?
- [ ] O post fala de uma dor, não só de um serviço?
- [ ] Existe um exemplo prático ou cenário real?
- [ ] O CTA combina com o objetivo?
- [ ] O visual deixa a mensagem mais rápida?
- [ ] A legenda reforça o problema e conduz para WhatsApp/link?
- [ ] Posts 02, 04, 07, 10: campanha criada via `criar_campanhas.py`?

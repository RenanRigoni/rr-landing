# RR.dev — Setup e Deploy

## 1. Instalar dependências

```bash
npx create-next-app@latest . --typescript --tailwind --app --no-src-dir --import-alias "@/*"
npm install @phosphor-icons/react
npm install -D @types/node
```

> Se scaffoldando do zero na pasta RR, execute create-next-app e depois copie os arquivos gerados.

## 2. Preencher placeholders em lib/constants.ts

```ts
url: 'https://rr.dev',          // sua URL final
city: 'São Paulo',               // sua cidade
state: 'SP',                     // sigla do estado
phone: '11999999999',            // só números, sem +55
email: 'contato@rr.dev',
lat: '-23.5505',                 // latitude da sua cidade
lng: '-46.6333',                 // longitude
```

## 3. Adicionar imagem OG

Coloque `og-image.jpg` (1200×630px) em `/public/og-image.jpg`.

## 4. Deploy na Vercel

```bash
npm i -g vercel
vercel
```

Ou conecte o repositório GitHub em vercel.com/new.

### Variáveis de ambiente (opcional)

Se quiser mover dados sensíveis para env vars no futuro:
```
NEXT_PUBLIC_PHONE=11999999999
NEXT_PUBLIC_EMAIL=contato@rr.dev
```

## 5. Checklist pós-deploy

- [ ] Acessar https://validator.schema.org/ com a URL do site
- [ ] Verificar Google Search Console (adicionar propriedade)
- [ ] Criar Google Empresa da própria RR.dev
- [ ] Substituir depoimentos fictícios por reais
- [ ] Preencher study case com projeto real
- [ ] Trocar [CIDADE] no texto do Features section (components/sections/features.tsx linha do h2)
- [ ] Testar WhatsApp float no mobile
- [ ] Verificar Core Web Vitals no PageSpeed Insights

## Estrutura de arquivos

```
rr-dev/
├── app/
│   ├── layout.tsx        ← SEO, fontes, JSON-LD
│   ├── page.tsx          ← montagem das seções
│   └── globals.css
├── components/
│   ├── sections/
│   │   ├── navbar.tsx
│   │   ├── hero.tsx
│   │   ├── problem.tsx
│   │   ├── features.tsx
│   │   ├── how-it-works.tsx
│   │   ├── pricing.tsx
│   │   ├── testimonials.tsx
│   │   ├── case-study.tsx
│   │   ├── guarantee.tsx
│   │   ├── faq.tsx
│   │   ├── cta-final.tsx
│   │   └── footer.tsx
│   └── ui/
│       └── whatsapp-float.tsx
├── lib/
│   └── constants.ts      ← EDITAR AQUI: cidade, telefone, email, URL
├── public/
│   ├── robots.txt
│   └── og-image.jpg      ← ADICIONAR: 1200x630px
├── tailwind.config.ts
└── next.config.ts
```

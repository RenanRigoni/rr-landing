import type { Metadata } from 'next'
import { Bricolage_Grotesque, Plus_Jakarta_Sans, DM_Mono } from 'next/font/google'
import './globals.css'
import { SITE_CONFIG, FAQ_ITEMS } from '@/lib/constants'

const bricolage = Bricolage_Grotesque({
  subsets: ['latin'],
  weight: ['800'],
  variable: '--font-bricolage',
  display: 'swap',
})

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-jakarta',
  display: 'swap',
})

const dmMono = DM_Mono({
  subsets: ['latin'],
  weight: ['500'],
  variable: '--font-dm-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: `Sites e Landing Pages para Negócios Locais em ${SITE_CONFIG.city} | RR.dev`,
  description: SITE_CONFIG.description,
  metadataBase: new URL(SITE_CONFIG.url),
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    url: SITE_CONFIG.url,
    title: `Sites e Landing Pages para Negócios Locais em ${SITE_CONFIG.city} | RR.dev`,
    description: SITE_CONFIG.description,
    images: [{ url: '/og-image.jpg', width: 1200, height: 630, alt: 'RR.dev' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: `Sites e Landing Pages para Negócios Locais em ${SITE_CONFIG.city} | RR.dev`,
    description: SITE_CONFIG.description,
    images: ['/og-image.jpg'],
  },
  other: {
    'geo.region': `BR-${SITE_CONFIG.state}`,
    'geo.placename': `${SITE_CONFIG.city}, ${SITE_CONFIG.state}, Brasil`,
    'geo.position': `${SITE_CONFIG.lat};${SITE_CONFIG.lng}`,
    ICBM: `${SITE_CONFIG.lat}, ${SITE_CONFIG.lng}`,
  },
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'ProfessionalService',
      '@id': `${SITE_CONFIG.url}/#organization`,
      name: 'RR.dev',
      image: `${SITE_CONFIG.url}/og-image.jpg`,
      description: SITE_CONFIG.description,
      url: SITE_CONFIG.url,
      telephone: `+55-${SITE_CONFIG.phone}`,
      email: SITE_CONFIG.email,
      priceRange: '$$',
      address: {
        '@type': 'PostalAddress',
        addressLocality: SITE_CONFIG.city,
        addressRegion: SITE_CONFIG.state,
        addressCountry: 'BR',
      },
      areaServed: [{ '@type': 'City', name: SITE_CONFIG.city }],
    },
    {
      '@type': 'FAQPage',
      mainEntity: FAQ_ITEMS.map((item) => ({
        '@type': 'Question',
        name: item.question,
        acceptedAnswer: { '@type': 'Answer', text: item.answer },
      })),
    },
  ],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="pt-BR"
      className={`${bricolage.variable} ${jakarta.variable} ${dmMono.variable}`}
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body>{children}</body>
    </html>
  )
}

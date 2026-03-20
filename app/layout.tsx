import type { Metadata, Viewport } from 'next'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

export const metadata: Metadata = {
  title: 'ContratBox — Tous vos contrats au même endroit',
  description: 'Assurances, abonnements, hypothèques, leasing, internet, énergie: ContratBox centralise, explique et vous rappelle les échéances importantes.',
  generator: 'v0.app',
  keywords: ['contrats', 'assurance', 'ménage', 'suisse', 'gestion', 'contratbox'],
  authors: [{ name: 'ContratBox' }],
  openGraph: {
    title: 'ContratBox — Tous vos contrats au même endroit',
    description: 'Gérez tous vos contrats familiaux depuis une seule interface premium.',
    type: 'website',
  },
}

export const viewport: Viewport = {
  themeColor: '#0f1a3d',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="fr">
      <body className="font-sans antialiased" suppressHydrationWarning>
        {children}
        <Analytics />
      </body>
    </html>
  )
}

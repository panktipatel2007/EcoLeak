import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Libre_Franklin, IBM_Plex_Mono } from 'next/font/google'
import './globals.css'

const libreFranklin = Libre_Franklin({
  subsets: ['latin'],
  variable: '--font-libre-franklin',
  display: 'swap',
})

const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-plex-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'EcoLeak — Carbon Leak Detection for Factories',
  description:
    'Upload your operational data and instantly see which input is responsible for the most CO₂ emissions.',
  generator: 'v0.app',
}

export const viewport: Viewport = {
  colorScheme: 'light',
  themeColor: '#f7f6f1',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className={`${libreFranklin.variable} ${plexMono.variable} bg-background`}
    >
      <body className="font-sans antialiased">
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}

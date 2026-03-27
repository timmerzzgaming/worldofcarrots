import type { Metadata } from 'next'
import { Plus_Jakarta_Sans, Be_Vietnam_Pro } from 'next/font/google'
import Providers from '@/components/Providers'
import TopBar from '@/components/TopBar'
import ErrorBoundary from '@/components/ErrorBoundary'
import './globals.css'

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-jakarta',
  weight: ['400', '500', '600', '700', '800'],
})

const vietnam = Be_Vietnam_Pro({
  subsets: ['latin'],
  variable: '--font-vietnam',
  weight: ['300', '400', '500', '600', '700'],
})

export const metadata: Metadata = {
  title: 'World Of Carrots — Geography Games',
  description: 'Test your geography knowledge with beautiful interactive maps',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${jakarta.variable} ${vietnam.variable} font-body bg-geo-bg text-geo-on-surface antialiased`}>
        <Providers>
          <ErrorBoundary>
            <TopBar />
            {children}
          </ErrorBoundary>
        </Providers>
      </body>
    </html>
  )
}

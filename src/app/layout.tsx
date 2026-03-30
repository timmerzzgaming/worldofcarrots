import type { Metadata } from 'next'
import { Fredoka, Nunito } from 'next/font/google'
import Providers from '@/components/Providers'
import TopBar from '@/components/TopBar'
import ErrorBoundary from '@/components/ErrorBoundary'
import './globals.css'

const fredoka = Fredoka({
  subsets: ['latin'],
  variable: '--font-fredoka',
  weight: ['400', '500', '600', '700'],
})

const nunito = Nunito({
  subsets: ['latin'],
  variable: '--font-nunito',
  weight: ['400', '500', '600', '700', '800'],
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
      <body className={`${fredoka.variable} ${nunito.variable} font-body bg-geo-bg text-geo-on-surface antialiased`}>
        <Providers>
          <ErrorBoundary>
            <div className="fixed top-0 left-0 right-0 z-[100] bg-geo-primary text-white text-center text-[10px] sm:text-xs font-headline font-bold py-0.5 sm:py-1">
              Game under development — you WILL encounter bugs!
            </div>
            <div className="pt-5 sm:pt-6">
              <TopBar />
              {children}
            </div>
          </ErrorBoundary>
        </Providers>
      </body>
    </html>
  )
}

import type { Metadata } from 'next'
import { ClerkProvider } from '@/lib/auth-stub'
import { RefineProvider } from '@/components/refine-provider'
import { ServiceWorkerRegistration } from '@/components/service-worker-registration'
import { PWAInstallPrompt } from '@/components/pwa-install-prompt'
import { Agentation } from 'agentation'
import { Toaster } from 'sonner'
import { DisplayProvider } from '@/contexts/display-context'
import './globals.css'

export const metadata: Metadata = {
  title: 'YARIKIRU - Business Management Dashboard',
  description: 'Business management and analytics dashboard',
  manifest: '/manifest.json',
  themeColor: '#3b82f6',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'YARIKIRU',
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider
      // Improve mobile compatibility with proper session handling
      appearance={{
        variables: {
          colorPrimary: '#6366f1',
        },
      }}
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      signInFallbackRedirectUrl="/dashboard"
      signUpFallbackRedirectUrl="/dashboard"
    >
      <html lang="ja">
        <head>
          <link rel="manifest" href="/manifest.json" />
          <link rel="apple-touch-icon" href="/logo.png" />
          <link rel="icon" type="image/png" sizes="32x32" href="/logo.png" />
          <link rel="icon" type="image/png" sizes="16x16" href="/logo.png" />
          <meta name="theme-color" content="#3b82f6" />
          <meta name="mobile-web-app-capable" content="yes" />
          <meta name="apple-mobile-web-app-capable" content="yes" />
          <meta name="apple-mobile-web-app-status-bar-style" content="default" />
          <meta name="apple-mobile-web-app-title" content="YARIKIRU" />
        </head>
        <body>
          <ServiceWorkerRegistration />
          <DisplayProvider>
            <RefineProvider>{children}</RefineProvider>
            <PWAInstallPrompt />
            {process.env.NODE_ENV === 'development' && <Agentation />}
            <Toaster richColors position="top-right" />
          </DisplayProvider>
        </body>
      </html>
    </ClerkProvider>
  )
}

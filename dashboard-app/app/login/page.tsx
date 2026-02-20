'use client'

import { useState, useEffect, useMemo } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import AuthForm from '@/components/AuthForm'

const callbackUrl = '/dashboard'

const ERROR_MESSAGES: Record<string, string> = {
  AccessDenied: 'Giriş reddedildi. Hesap veya izin sorunu olabilir.',
  Configuration: 'Sunucu yapılandırma hatası. Vercel → Settings → Environment Variables içinde GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET ve NEXTAUTH_URL kontrol edin. NEXTAUTH_URL: https://autoclaude.vercel.app olmalı.',
  Verification: 'Doğrulama hatası. E-posta adresi kullanılamıyor olabilir.',
  OAuthSignin: 'Google yönlendirme hatası.',
  OAuthCallback: 'Google geri dönüş hatası. Google Cloud Console\'da Authorized Redirect URI: https://autoclaude.vercel.app/api/auth/callback/google olmalı.',
  OAuthCreateAccount: 'Hesap oluşturulamadı.',
  Callback: 'Giriş geri çağrı hatası.',
  Default: 'Google ile giriş sırasında bir hata oluştu.',
}

/**
 * Login Page
 *
 * Provides three authentication methods:
 * 1. Google OAuth - Direct link to /api/auth/signin/google (server redirects to Google)
 * 2. (Apple Sign-In hidden in UI)
 * 3. Email/Password - Validates against database
 *
 * OAuth uses direct links so the browser does a full navigation; no client-side fetch that can fail silently.
 */
export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [googleConfigured, setGoogleConfigured] = useState<boolean | null>(null)

  const oauthError = useMemo(() => {
    const err = searchParams.get('error')
    if (!err) return null
    return ERROR_MESSAGES[err] || ERROR_MESSAGES.Default
  }, [searchParams])

  useEffect(() => {
    fetch('/api/auth/providers')
      .then((res) => res.ok ? res.json() : {})
      .then((providers) => {
        setGoogleConfigured(!!(providers && providers.google))
      })
      .catch(() => setGoogleConfigured(false))
  }, [])

  /**
   * Handle Google sign-in via NextAuth client (reliable redirect)
   */
  const handleGoogleSignIn = async () => {
    if (googleLoading || googleConfigured === false) return
    setGoogleLoading(true)
    setError('')
    try {
      const result = await signIn('google', {
        callbackUrl,
        redirect: true,
      })
      if (result?.error) {
        setError(result.error === 'Configuration' ? 'Google girişi yapılandırılmamış.' : result.error)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google ile giriş başarısız.')
    } finally {
      setGoogleLoading(false)
    }
  }

  /**
   * Handle email/password sign-in
   */
  const handleCredentialsSignIn = async (email: string, password: string) => {
    try {
      setIsLoading(true)

      const result = await signIn('credentials', {
        email,
        password,
        callbackUrl: '/dashboard',
        redirect: false,
      })

      if (result?.error) {
        setError('Invalid email or password. Please try again.')
        setIsLoading(false)
      } else if (result?.ok) {
        router.push('/dashboard')
        router.refresh()
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.')
      setIsLoading(false)
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Welcome Back
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Sign in to access your takeaway dashboard
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-6 sm:p-8">
          {oauthError && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
              <p className="text-sm font-medium text-red-800 dark:text-red-200">{oauthError}</p>
              {searchParams.get('error') === 'Configuration' && (
                <div className="mt-2 text-xs text-red-700 dark:text-red-300 space-y-1">
                  <p><strong>Kontrol listesi:</strong></p>
                  <ul className="list-disc list-inside ml-2 space-y-0.5">
                    <li>Vercel → Settings → Environment Variables → <code className="bg-black/10 px-1 rounded">NEXTAUTH_URL</code> = <code className="bg-black/10 px-1 rounded">https://autoclaude.vercel.app</code></li>
                    <li>Vercel → Settings → Environment Variables → <code className="bg-black/10 px-1 rounded">GOOGLE_CLIENT_ID</code> ve <code className="bg-black/10 px-1 rounded">GOOGLE_CLIENT_SECRET</code> var mı?</li>
                    <li>Google Cloud Console → Credentials → Authorized Redirect URIs → <code className="bg-black/10 px-1 rounded">https://autoclaude.vercel.app/api/auth/callback/google</code> ekli mi?</li>
                  </ul>
                  <p className="mt-2">Vercel loglarında &quot;[NextAuth]&quot; ile arayarak detay görebilirsin.</p>
                </div>
              )}
            </div>
          )}
          {googleConfigured === false && !oauthError && (
            <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                Google ile giriş şu an yapılandırılmamış. Vercel → Settings → Environment Variables içinde <strong>GOOGLE_CLIENT_ID</strong> ve <strong>GOOGLE_CLIENT_SECRET</strong> tanımlı olmalı. Sadece e-posta ile giriş yapabilirsin.
              </p>
            </div>
          )}
          {/* OAuth: signIn() ile yönlendirme (link yerine) */}
          <div className="space-y-3 mb-6">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={googleLoading || googleConfigured === false}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-60 disabled:cursor-not-allowed text-gray-900 dark:text-gray-100"
            >
              <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              <span className="text-sm font-medium">
                {googleLoading ? 'Yönlendiriliyor…' : 'Sign in with Google'}
              </span>
            </button>
          </div>

          {/* Divider */}
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                Or continue with email
              </span>
            </div>
          </div>

          {/* Email/Password Form */}
          <AuthForm
            onSubmit={handleCredentialsSignIn}
            isLoading={isLoading}
            error={error}
            submitButtonText="Sign in"
            mode="login"
          />

          {/* Footer Links */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Don't have an account?{' '}
              <a href="/signup" className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300">
                Sign up
              </a>
            </p>
          </div>
        </div>

        {/* Back to Home */}
        <div className="mt-4 text-center">
          <a
            href="/"
            className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
          >
            ← Back to home
          </a>
        </div>
      </div>
    </main>
  )
}

'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import AuthForm from '@/components/AuthForm'

/**
 * Sign Up Page
 *
 * Email/password registration. On success, creates user and signs in,
 * then redirects to dashboard.
 */
export default function SignUpPage() {
  const router = useRouter()
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSignUp = async (email: string, password: string) => {
    try {
      setError('')
      setIsLoading(true)

      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        setError(data.error || 'Registration failed. Please try again.')
        setIsLoading(false)
        return
      }

      const result = await signIn('credentials', {
        email: email.trim().toLowerCase(),
        password,
        callbackUrl: '/dashboard',
        redirect: false,
      })

      if (result?.error) {
        setError('Account created but sign-in failed. Please sign in from the login page.')
        setIsLoading(false)
        return
      }
      if (result?.ok) {
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
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Create account
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Sign up to access your takeaway dashboard
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-6 sm:p-8">
          <AuthForm
            onSubmit={handleSignUp}
            isLoading={isLoading}
            error={error}
            submitButtonText="Sign up"
            mode="signup"
          />

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Already have an account?{' '}
              <Link
                href="/login"
                className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>

        <div className="mt-4 text-center">
          <Link
            href="/"
            className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
          >
            ← Back to home
          </Link>
        </div>
      </div>
    </main>
  )
}

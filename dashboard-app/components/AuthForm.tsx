'use client'

import { useState, FormEvent } from 'react'

/**
 * AuthForm Props
 *
 * @param onSubmit - Callback function called when form is submitted with valid credentials
 * @param isLoading - Whether the form is in a loading state (disable inputs and show loading text)
 * @param error - Error message to display (e.g., from failed authentication)
 * @param submitButtonText - Text to display on the submit button (default: "Sign in")
 * @param showRememberMe - Whether to show "Remember me" checkbox (default: false)
 * @param mode - Form mode: "login" or "signup" (affects validation and labels)
 */
export interface AuthFormProps {
  onSubmit: (email: string, password: string, rememberMe?: boolean) => Promise<void>
  isLoading?: boolean
  error?: string
  submitButtonText?: string
  showRememberMe?: boolean
  mode?: 'login' | 'signup'
}

/**
 * Validation error types
 */
interface ValidationError {
  email?: string
  password?: string
}

/**
 * AuthForm Component
 *
 * A reusable authentication form with client-side validation and error handling.
 * Supports both login and signup modes with email/password authentication.
 *
 * Features:
 * - Real-time email format validation
 * - Password strength validation (signup mode)
 * - Field-level error messages
 * - Disabled submit button when form is invalid
 * - Loading state with visual feedback
 * - "Remember me" option (optional)
 * - Dark mode support
 * - Full accessibility (labels, focus states, semantic HTML)
 *
 * @example
 * ```tsx
 * <AuthForm
 *   onSubmit={async (email, password) => {
 *     await signIn('credentials', { email, password })
 *   }}
 *   isLoading={isLoading}
 *   error={error}
 *   submitButtonText="Sign in"
 *   mode="login"
 * />
 * ```
 */
export default function AuthForm({
  onSubmit,
  isLoading = false,
  error = '',
  submitButtonText = 'Sign in',
  showRememberMe = false,
  mode = 'login',
}: AuthFormProps) {
  // Form state
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [validationErrors, setValidationErrors] = useState<ValidationError>({})
  const [touched, setTouched] = useState<{ email: boolean; password: boolean }>({
    email: false,
    password: false,
  })

  /**
   * Validate email format using a comprehensive regex pattern
   */
  const validateEmail = (emailToValidate: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(emailToValidate)
  }

  /**
   * Validate password strength (for signup mode)
   * Requires at least 8 characters
   */
  const validatePassword = (passwordToValidate: string): boolean => {
    return passwordToValidate.length >= 8
  }

  /**
   * Run all validations and update error state
   */
  const validateForm = (): boolean => {
    const errors: ValidationError = {}

    // Validate email
    if (!email) {
      errors.email = 'Email address is required'
    } else if (!validateEmail(email)) {
      errors.email = 'Please enter a valid email address'
    }

    // Validate password
    if (!password) {
      errors.password = 'Password is required'
    } else if (mode === 'signup' && !validatePassword(password)) {
      errors.password = 'Password must be at least 8 characters long'
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  /**
   * Handle email input change with real-time validation
   */
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value)

    // Validate email after user has touched the field
    if (touched.email) {
      const errors: ValidationError = { ...validationErrors }

      if (!e.target.value) {
        errors.email = 'Email address is required'
      } else if (!validateEmail(e.target.value)) {
        errors.email = 'Please enter a valid email address'
      } else {
        delete errors.email
      }

      setValidationErrors(errors)
    }
  }

  /**
   * Handle password input change with real-time validation
   */
  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value)

    // Validate password after user has touched the field
    if (touched.password) {
      const errors: ValidationError = { ...validationErrors }

      if (!e.target.value) {
        errors.password = 'Password is required'
      } else if (mode === 'signup' && !validatePassword(e.target.value)) {
        errors.password = 'Password must be at least 8 characters long'
      } else {
        delete errors.password
      }

      setValidationErrors(errors)
    }
  }

  /**
   * Handle input blur to mark field as touched
   */
  const handleBlur = (field: 'email' | 'password') => {
    setTouched((prev) => ({ ...prev, [field]: true }))

    // Run validation for the blurred field
    const errors: ValidationError = { ...validationErrors }

    if (field === 'email') {
      if (!email) {
        errors.email = 'Email address is required'
      } else if (!validateEmail(email)) {
        errors.email = 'Please enter a valid email address'
      } else {
        delete errors.email
      }
    } else if (field === 'password') {
      if (!password) {
        errors.password = 'Password is required'
      } else if (mode === 'signup' && !validatePassword(password)) {
        errors.password = 'Password must be at least 8 characters long'
      } else {
        delete errors.password
      }
    }

    setValidationErrors(errors)
  }

  /**
   * Handle form submission
   */
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    // Mark all fields as touched
    setTouched({ email: true, password: true })

    // Validate form
    const isValid = validateForm()

    if (!isValid) {
      return
    }

    // Call onSubmit callback
    try {
      if (showRememberMe) {
        await onSubmit(email, password, rememberMe)
      } else {
        await onSubmit(email, password)
      }
    } catch (err) {
      // Error is handled by parent component via error prop
    }
  }

  /**
   * Check if form is valid (for submit button disabled state)
   */
  const isFormValid = email && password && validateEmail(email) && (mode === 'login' || validatePassword(password))

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {/* General Error Message */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Email Input */}
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Email address
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete={mode === 'login' ? 'email' : 'username'}
          required
          value={email}
          onChange={handleEmailChange}
          onBlur={() => handleBlur('email')}
          disabled={isLoading}
          aria-invalid={!!validationErrors.email}
          aria-describedby={validationErrors.email ? 'email-error' : undefined}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          placeholder="you@example.com"
        />
        {validationErrors.email && (
          <p id="email-error" className="mt-1 text-sm text-red-600 dark:text-red-400" role="alert">
            {validationErrors.email}
          </p>
        )}
      </div>

      {/* Password Input */}
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          required
          value={password}
          onChange={handlePasswordChange}
          onBlur={() => handleBlur('password')}
          disabled={isLoading}
          aria-invalid={!!validationErrors.password}
          aria-describedby={validationErrors.password ? 'password-error' : undefined}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          placeholder={mode === 'signup' ? '••••••••' : 'Enter your password'}
        />
        {validationErrors.password && (
          <p id="password-error" className="mt-1 text-sm text-red-600 dark:text-red-400" role="alert">
            {validationErrors.password}
          </p>
        )}
        {mode === 'signup' && password && !validationErrors.password && (
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Must be at least 8 characters long
          </p>
        )}
      </div>

      {/* Remember Me Checkbox */}
      {showRememberMe && (
        <div className="flex items-center">
          <input
            id="remember-me"
            name="remember-me"
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            disabled={isLoading}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
            Remember me
          </label>
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isLoading || !isFormValid}
        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isLoading ? 'Processing...' : submitButtonText}
      </button>
    </form>
  )
}

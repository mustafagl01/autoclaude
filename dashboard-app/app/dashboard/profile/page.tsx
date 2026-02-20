/**
 * Profile Page
 * UK Takeaway Phone Order Assistant Dashboard
 *
 * Allows users to view and manage their account information.
 * Protected route requiring authentication.
 *
 * @see https://nextjs.org/docs/app/building-your-application/rendering/server-components
 * @see /lib/db.ts - Database query functions
 * @see /lib/auth.ts - Password hashing utilities
 */

'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Profile form state
 */
interface ProfileFormData {
  name: string;
  email: string;
  retellApiKey: string;
}

/**
 * Password change form state
 */
interface PasswordFormData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

/**
 * OAuth provider info
 */
interface OAuthProvider {
  id: string;
  name: string;
  linked: boolean;
  icon: React.ReactNode;
}

// ============================================================================
// Main Component - Profile Page
// ============================================================================

/**
 * Profile Page Component
 *
 * Client component that displays and manages user profile information.
 * Requires authenticated session via NextAuth.js.
 *
 * Features:
 * - Display user information (name, email, profile picture)
 * - Change password form
 * - Linked OAuth providers display (Google)
 * - Update profile information
 * - Dark mode support
 *
 * @returns Profile page JSX
 */
export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Form states
  const [profileForm, setProfileForm] = useState<ProfileFormData>({
    name: session?.user?.name || '',
    email: session?.user?.email || '',
    retellApiKey: '',
  });
  const [hasRetellKey, setHasRetellKey] = useState(false);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [retellKeyTouched, setRetellKeyTouched] = useState(false);

  const [passwordForm, setPasswordForm] = useState<PasswordFormData>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // UI states
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [profileMessage, setProfileMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Load profile (name, hasRetellKey) once
  useEffect(() => {
    if (status !== 'authenticated' || profileLoaded) return;
    fetch('/api/user/profile')
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.data) {
          setProfileForm((prev) => ({ ...prev, name: data.data.name, email: data.data.email }));
          setHasRetellKey(!!data.data.hasRetellKey);
        }
        setProfileLoaded(true);
      })
      .catch(() => setProfileLoaded(true));
  }, [status, profileLoaded]);

  // Redirect if not authenticated
  if (status === 'unauthenticated') {
    router.push('/login');
    return null;
  }

  // Show loading state
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Determine OAuth provider linkage
  const userImage = session?.user?.image;
  const hasGoogleAuth = userImage?.includes('google') || userImage?.includes('lh3.googleusercontent.com');

  const oauthProviders: OAuthProvider[] = [
    {
      id: 'google',
      name: 'Google',
      linked: hasGoogleAuth,
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24">
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
      ),
    },
  ];

  /**
   * Handle profile update form submission
   */
  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingProfile(true);
    setProfileMessage(null);

    try {
      const body: { name: string; retell_api_key?: string | null } = { name: profileForm.name };
      if (retellKeyTouched) {
        const key = profileForm.retellApiKey.replace(/\r\n|\r|\n/g, '').trim();
        body.retell_api_key = key || null;
      }

      const response = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const text = await response.text();
      let data: { success?: boolean; error?: string } = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        setProfileMessage({
          type: 'error',
          text: response.ok ? 'An error occurred while updating profile' : 'Server error. Please try again.',
        });
        return;
      }

      if (response.ok) {
        setProfileMessage({ type: 'success', text: 'Profile updated successfully' });
        if (retellKeyTouched) {
          setHasRetellKey(!!body.retell_api_key);
          setProfileForm((prev) => ({ ...prev, retellApiKey: '' }));
          setRetellKeyTouched(false);
        }
      } else {
        setProfileMessage({ type: 'error', text: data.error || 'Failed to update profile' });
      }
    } catch (error) {
      setProfileMessage({ type: 'error', text: 'An error occurred while updating profile' });
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  /**
   * Handle password change form submission
   */
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsChangingPassword(true);
    setPasswordMessage(null);

    // Client-side validation
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'New passwords do not match' });
      setIsChangingPassword(false);
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      setPasswordMessage({ type: 'error', text: 'New password must be at least 8 characters long' });
      setIsChangingPassword(false);
      return;
    }

    try {
      const response = await fetch('/api/user/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setPasswordMessage({ type: 'success', text: 'Password changed successfully' });
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        setPasswordMessage({ type: 'error', text: data.error || 'Failed to change password' });
      }
    } catch (error) {
      setPasswordMessage({ type: 'error', text: 'An error occurred while changing password' });
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Profile
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Manage your account settings and preferences
          </p>
        </div>

        {/* Profile Information Section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Profile Information
          </h2>

          {/* User Avatar and Info */}
          <div className="flex items-center gap-6 mb-6">
            <div className="flex-shrink-0">
              {session?.user?.image ? (
                <img
                  src={session.user.image}
                  alt={session.user.name || 'User'}
                  className="w-20 h-20 rounded-full object-cover border-2 border-gray-200 dark:border-gray-700"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center border-2 border-gray-200 dark:border-gray-700">
                  <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {session?.user?.name?.charAt(0).toUpperCase() || session?.user?.email?.charAt(0).toUpperCase() || 'U'}
                  </span>
                </div>
              )}
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                {session?.user?.name || 'User'}
              </h3>
              <p className="text-gray-600 dark:text-gray-400">{session?.user?.email}</p>
            </div>
          </div>

          {/* Profile Update Form */}
          <form onSubmit={handleProfileUpdate}>
            <div className="mb-4">
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Name
              </label>
              <input
                type="text"
                id="name"
                value={profileForm.name}
                onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                required
              />
            </div>

            <div className="mb-4">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Email
              </label>
              <input
                type="email"
                id="email"
                value={profileForm.email}
                disabled
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                title="Email cannot be changed"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Email cannot be changed</p>
            </div>

            <div className="mb-4">
              <label htmlFor="retellApiKey" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Retell API Key
              </label>
              <input
                type="password"
                id="retellApiKey"
                value={profileForm.retellApiKey}
                onChange={(e) => {
                  setProfileForm((prev) => ({ ...prev, retellApiKey: e.target.value }));
                  setRetellKeyTouched(true);
                }}
                placeholder={hasRetellKey ? '•••••••• (enter new key to change)' : 'Paste your Retell API key to sync calls'}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                autoComplete="off"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {hasRetellKey ? 'Key saved. Enter a new value to replace, or leave blank when updating to keep it.' : 'Required to sync calls from Retell on the Phone Calls page. Get it from your Retell dashboard.'}
              </p>
            </div>

            {profileMessage && (
              <div
                className={`mb-4 p-3 rounded-lg ${
                  profileMessage.type === 'success'
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400'
                    : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400'
                }`}
              >
                {profileMessage.text}
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isUpdatingProfile}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUpdatingProfile ? 'Updating...' : 'Update Profile'}
              </button>
            </div>
          </form>
        </div>

        {/* Linked OAuth Providers Section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Linked Accounts
          </h2>

          <div className="space-y-4">
            {oauthProviders.map((provider) => (
              <div
                key={provider.id}
                className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0">{provider.icon}</div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{provider.name}</p>
                    <p className={`text-sm ${provider.linked ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>
                      {provider.linked ? 'Connected' : 'Not connected'}
                    </p>
                  </div>
                </div>
                {provider.linked && (
                  <span className="px-3 py-1 text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 rounded-full">
                    Linked
                  </span>
                )}
              </div>
            ))}
          </div>

          <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
            OAuth providers are linked when you sign in with them. To link a new provider, sign out and sign in again using the provider.
          </p>
        </div>

        {/* Change Password Section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Change Password
          </h2>

          <form onSubmit={handlePasswordChange}>
            <div className="mb-4">
              <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Current Password
              </label>
              <input
                type="password"
                id="currentPassword"
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                required
              />
            </div>

            <div className="mb-4">
              <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                New Password
              </label>
              <input
                type="password"
                id="newPassword"
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                required
                minLength={8}
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Must be at least 8 characters long</p>
            </div>

            <div className="mb-4">
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Confirm New Password
              </label>
              <input
                type="password"
                id="confirmPassword"
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                required
                minLength={8}
              />
            </div>

            {passwordMessage && (
              <div
                className={`mb-4 p-3 rounded-lg ${
                  passwordMessage.type === 'success'
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400'
                    : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400'
                }`}
              >
                {passwordMessage.text}
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isChangingPassword}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isChangingPassword ? 'Changing Password...' : 'Change Password'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

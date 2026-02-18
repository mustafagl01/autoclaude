/**
 * Calls List Page
 * UK Takeaway Phone Order Assistant Dashboard
 *
 * Displays a paginated list of phone calls with filtering and search capabilities.
 * Protected route requiring authentication.
 *
 * @see https://nextjs.org/docs/app/building-your-application/rendering/server-components
 * @see /lib/db.ts - Database query functions
 * @see /components/CallList.tsx - Client component with filters and pagination
 */

import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authConfig } from '@/app/api/auth/[...nextauth]/route';
import { getDb, getCallsByUserId, type Call } from '@/lib/db';
import CallList from '@/components/CallList';

// ============================================================================
// Server Component - Calls List Page
// ============================================================================

/**
 * Calls List Page Component
 *
 * Server component that fetches initial call data and renders the CallList client component.
 * Requires authenticated session via NextAuth.js.
 *
 * Features:
 * - Server-side data fetching for optimal performance
 * - Authentication check with redirect to login
 * - Initial data hydration for CallList component
 * - Client-side filtering and pagination
 * - Dark mode support
 * - Responsive design
 *
 * @returns Calls list page JSX or redirects to login
 *
 * @example
 * // Access at http://localhost:3000/dashboard/calls
 * // Requires valid authentication session
 */
export default async function CallsListPage() {
  // Get current session (authentication check)
  const session = await getServerSession(authConfig);

  // Redirect unauthenticated users to login
  if (!session || !session.user?.id) {
    redirect('/login');
  }

  // Get D1 database instance
  const db = getDb();

  // Fetch initial calls (first page, 25 per page)
  const initialLimit = 25;
  const initialOffset = 0;
  const callsResult = await getCallsByUserId(
    db,
    session.user.id,
    initialLimit,
    initialOffset
  );

  // Extract initial calls with fallback
  const initialCalls: Call[] = callsResult.success && callsResult.data
    ? callsResult.data
    : [];

  // Get total count for pagination
  // Note: In production, you might want to optimize this with a separate count query
  const totalResult = await getCallsByUserId(db, session.user.id, 1000, 0);
  const initialTotal = totalResult.success && totalResult.data
    ? totalResult.data.length
    : initialCalls.length;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Phone Calls
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            View and search your phone call history
          </p>
        </div>

        {/* Call List Component */}
        <CallList
          initialCalls={initialCalls}
          initialTotal={initialTotal}
          userId={session.user.id}
        />
      </div>
    </div>
  );
}

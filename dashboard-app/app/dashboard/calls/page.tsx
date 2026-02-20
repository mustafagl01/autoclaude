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

import { auth } from '@/app/api/auth/[...nextauth]/route';
import { redirect } from 'next/navigation';

import { getCallsByUserId, getTotalCostCents, type Call } from '@/lib/db';
import CallList from '@/components/CallList';
import SyncRetellButton from '@/components/SyncRetellButton';

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
  const session = await auth();

  // Redirect unauthenticated users to login
  if (!session || !session.user?.id) {
    redirect('/login');
  }

  // Fetch initial calls (first page, 25 per page)
  const initialLimit = 25;
  const initialOffset = 0;
  const callsResult = await getCallsByUserId(
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
  const totalResult = await getCallsByUserId(session.user.id, 1000, 0);
  const initialTotal = totalResult.success && totalResult.data
    ? totalResult.data.length
    : initialCalls.length;

  const costResult = await getTotalCostCents(session.user.id);
  const initialTotalCostCents = costResult.success ? costResult.data : 0;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Phone Calls
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              View and search your phone call history. Sync from Retell to pull your latest calls.
            </p>
          </div>
          <SyncRetellButton />
        </div>

        {/* Call List Component */}
        <CallList
          initialCalls={initialCalls}
          initialTotal={initialTotal}
          initialTotalCostCents={initialTotalCostCents}
          userId={session.user.id}
        />
      </div>
    </div>
  );
}

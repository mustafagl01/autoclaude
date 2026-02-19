/**
 * Call Details Page
 * UK Takeaway Phone Order Assistant Dashboard
 *
 * Displays detailed information for a specific phone call including:
 * - Call metadata (date, duration, phone, outcome)
 * - Full conversation transcript with speaker labels
 * - Audio recording playback (if available)
 * - Order details extracted from conversation
 *
 * Protected route requiring authentication.
 *
 * @see https://nextjs.org/docs/app/building-your-application/rendering/server-components
 * @see /lib/db.ts - Database query functions
 * @see /lib/retell.ts - Retell SDK client wrapper
 */

import { auth } from '@/app/api/auth/[...nextauth]/route';
import { redirect } from 'next/navigation';

import { getDb, getCallById, type Call } from '@/lib/db';
import { getCallDetails, type RetellCallDetails } from '@/lib/retell';
import Link from 'next/link';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Call metadata for display
 */
interface CallMetadata {
  id: string;
  phone_number: string;
  call_date: string;
  duration: number | null;
  status: string;
  outcome: string | null;
  recording_url: string | null;
}

/**
 * Transcript segment with speaker label
 */
interface TranscriptSegment {
  speaker: 'agent' | 'customer';
  text: string;
  timestamp?: string;
}

/**
 * Order details extracted from call
 */
interface OrderDetails {
  customer_name?: string;
  order_items?: Array<{
    name: string;
    quantity: number;
    price?: number;
  }>;
  total_amount?: number;
  notes?: string;
}

// ============================================================================
// Server Component - Call Details Page
// ============================================================================

/**
 * Call Details Page Component
 *
 * Server component that fetches and displays detailed information for a specific phone call.
 * Requires authenticated session via NextAuth.js.
 *
 * Data fetching strategy:
 * 1. First, try to get call from D1 cache (for performance)
 * 2. If not found or missing transcript, fetch from Retell API
 * 3. Merge data from both sources for complete information
 *
 * Features:
 * - Server-side data fetching with authentication check
 * - Call metadata display with formatted dates and durations
 * - Full transcript with speaker labels and timestamps
 * - Audio player for call recording (if available)
 * - Order details extraction from conversation
 * - Back button to return to call list
 * - Dark mode support
 * - Responsive design
 *
 * @param props - Page props containing dynamic route parameter (call ID)
 * @returns Call details page JSX or redirects to login
 *
 * @example
 * // Access at http://localhost:3000/dashboard/calls/call_abc123
 * // Requires valid authentication session
 */
export default async function CallDetailsPage({
  params,
}: {
  params: { id: string };
}) {
  // Get current session (authentication check)
  const session = await auth();

  // Redirect unauthenticated users to login
  if (!session || !session.user?.id) {
    redirect('/login');
  }

  const callId = params.id;

  // Get D1 database instance
  const db = getDb();

  // Fetch call from D1 cache first
  const cachedCall = await getCallById(db, callId);

  // Fetch full details from Retell API (for transcript and metadata)
  let retellCallDetails: RetellCallDetails | null = null;
  let transcriptError: string | null = null;

  try {
    const result = await getCallDetails(callId);
    if (result.success && result.data) {
      retellCallDetails = result.data;
    } else {
      transcriptError = result.error || 'Failed to fetch call details from Retell';
    }
  } catch (error) {
    transcriptError = error instanceof Error ? error.message : 'Unknown error fetching call details';
  }

  // Merge data: prioritize Retell data for transcript, use cached data for basic info
  const callMetadata: CallMetadata = {
    id: callId,
    phone_number: retellCallDetails?.phone_number || cachedCall?.phone_number || 'Unknown',
    call_date: retellCallDetails?.start_time || cachedCall?.call_date || new Date().toISOString(),
    duration: retellCallDetails?.duration || cachedCall?.duration || null,
    status: retellCallDetails?.status || cachedCall?.status || 'unknown',
    outcome: retellCallDetails?.outcome || cachedCall?.outcome || null,
    recording_url: retellCallDetails?.recording_url || null,
  };

  // Parse transcript segments
  const transcriptSegments: TranscriptSegment[] = retellCallDetails?.transcript_segments || [];

  // If no segments but we have transcript text, create a single segment
  const hasTranscriptText = retellCallDetails?.transcript || cachedCall?.transcript;
  if (transcriptSegments.length === 0 && hasTranscriptText) {
    const fullTranscript = retellCallDetails?.transcript || cachedCall?.transcript || '';
    // Try to parse transcript if it has speaker labels
    const parsedSegments = parseTranscript(fullTranscript);
    transcriptSegments.push(...parsedSegments);
  }

  // Extract order details
  const orderDetails: OrderDetails = retellCallDetails?.metadata || {};

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header with Back Button */}
        <div className="mb-8">
          <Link
            href="/dashboard/calls"
            className="inline-flex items-center text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4 transition-colors"
          >
            <svg
              className="w-4 h-4 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back to Calls
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Call Details
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            View full transcript and metadata for this phone call
          </p>
        </div>

        {/* Error State */}
        {transcriptError && (
          <div className="mb-6 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <div className="flex">
              <svg
                className="w-5 h-5 text-yellow-400 mr-2 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <div className="flex-1">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  Some information could not be loaded: {transcriptError}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Metadata and Audio */}
          <div className="lg:col-span-1 space-y-6">
            {/* Call Metadata Card */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Call Information
              </h2>
              <dl className="space-y-4">
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Phone Number
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                    {callMetadata.phone_number}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Date & Time
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                    {formatDateTime(callMetadata.call_date)}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Duration
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                    {callMetadata.duration ? formatDuration(callMetadata.duration) : 'N/A'}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Status
                  </dt>
                  <dd className="mt-1">
                    <StatusBadge status={callMetadata.status} />
                  </dd>
                </div>
                {callMetadata.outcome && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Outcome
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                      {callMetadata.outcome.replace('_', ' ')}
                    </dd>
                  </div>
                )}
              </dl>
            </div>

            {/* Audio Player Card */}
            {callMetadata.recording_url && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Call Recording
                </h2>
                <audio
                  controls
                  className="w-full"
                  preload="metadata"
                >
                  <source src={callMetadata.recording_url} type="audio/mpeg" />
                  Your browser does not support the audio element.
                </audio>
              </div>
            )}

            {/* Order Details Card (if available) */}
            {(orderDetails.customer_name ||
              (orderDetails.order_items && orderDetails.order_items.length > 0) ||
              orderDetails.total_amount) && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Order Details
                </h2>
                <dl className="space-y-4">
                  {orderDetails.customer_name && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Customer Name
                      </dt>
                      <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                        {orderDetails.customer_name}
                      </dd>
                    </div>
                  )}
                  {orderDetails.order_items && orderDetails.order_items.length > 0 && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Order Items
                      </dt>
                      <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                        <ul className="list-disc list-inside space-y-1">
                          {orderDetails.order_items.map((item, index) => (
                            <li key={index}>
                              {item.quantity}x {item.name}
                              {item.price && ` - £${item.price.toFixed(2)}`}
                            </li>
                          ))}
                        </ul>
                      </dd>
                    </div>
                  )}
                  {orderDetails.total_amount && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Total Amount
                      </dt>
                      <dd className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">
                        £{orderDetails.total_amount.toFixed(2)}
                      </dd>
                    </div>
                  )}
                  {orderDetails.notes && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Notes
                      </dt>
                      <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                        {orderDetails.notes}
                      </dd>
                    </div>
                  )}
                </dl>
              </div>
            )}
          </div>

          {/* Right Column - Transcript */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Conversation Transcript
              </h2>

              {transcriptSegments.length === 0 ? (
                <div className="text-center py-12">
                  <svg
                    className="mx-auto h-12 w-12 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                    No transcript available for this call
                  </p>
                </div>
              ) : (
                <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                  {transcriptSegments.map((segment, index) => (
                    <TranscriptMessage
                      key={`${segment.speaker}-${index}`}
                      segment={segment}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Helper Components
// ============================================================================

/**
 * Status Badge Props
 */
interface StatusBadgeProps {
  status: string;
}

/**
 * Status Badge Component
 *
 * Displays a colored badge for call status.
 *
 * @param props - Status badge props
 * @returns Status badge JSX
 */
function StatusBadge({ status }: StatusBadgeProps) {
  const statusColors: Record<string, string> = {
    completed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    missed: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    failed: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    in_progress: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    cancelled: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
  };

  const badgeClass = statusColors[status] || statusColors.cancelled;

  return (
    <span className={`px-3 py-1 text-xs font-medium rounded-full ${badgeClass}`}>
      {status.replace('_', ' ')}
    </span>
  );
}

/**
 * Transcript Message Props
 */
interface TranscriptMessageProps {
  segment: TranscriptSegment;
}

/**
 * Transcript Message Component
 *
 * Displays a single message in the transcript with speaker label and text.
 *
 * @param props - Transcript message props
 * @returns Transcript message JSX
 */
function TranscriptMessage({ segment }: TranscriptMessageProps) {
  const isAgent = segment.speaker === 'agent';

  return (
    <div
      className={`flex ${isAgent ? 'justify-start' : 'justify-end'}`}
    >
      <div
        className={`max-w-[80%] rounded-lg px-4 py-3 ${
          isAgent
            ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
            : 'bg-blue-50 dark:bg-blue-900/20 text-gray-900 dark:text-white'
        }`}
      >
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-semibold uppercase">
            {isAgent ? 'Agent' : 'Customer'}
          </span>
          {segment.timestamp && (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {formatTimestamp(segment.timestamp)}
            </span>
          )}
        </div>
        <p className="text-sm whitespace-pre-wrap break-words">
          {segment.text}
        </p>
      </div>
    </div>
  );
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Format date and time for display
 *
 * @param dateString - ISO date string
 * @returns Formatted date and time
 */
function formatDateTime(dateString: string): string {
  const date = new Date(dateString);
  const formattedDate = date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const formattedTime = date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  });
  return `${formattedDate} at ${formattedTime}`;
}

/**
 * Format duration in seconds to human-readable format
 *
 * @param seconds - Duration in seconds
 * @returns Formatted duration (e.g., "5m 30s")
 */
function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}

/**
 * Format timestamp from transcript
 *
 * @param timestampString - ISO timestamp string
 * @returns Formatted time
 */
function formatTimestamp(timestampString: string): string {
  const date = new Date(timestampString);
  return date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

/**
 * Parse transcript text into segments with speaker labels
 *
 * Attempts to parse transcript format like:
 * "Agent: Hello\nCustomer: Hi there"
 *
 * @param transcript - Full transcript text
 * @returns Parsed transcript segments
 */
function parseTranscript(transcript: string): TranscriptSegment[] {
  const segments: TranscriptSegment[] = [];

  // Split by lines and try to identify speaker labels
  const lines = transcript.split('\n');
  let currentSpeaker: 'agent' | 'customer' | null = null;
  let currentText = '';

  for (const line of lines) {
    const trimmedLine = line.trim();

    // Check if line starts with speaker label
    const agentMatch = trimmedLine.match(/^(Agent:|AI:|Bot:)/i);
    const customerMatch = trimmedLine.match(/^(Customer:|User:|Caller:)/i);

    if (agentMatch) {
      // Save previous segment if exists
      if (currentSpeaker && currentText) {
        segments.push({
          speaker: currentSpeaker,
          text: currentText.trim(),
        });
      }
      currentSpeaker = 'agent';
      currentText = trimmedLine.substring(agentMatch[0].length).trim();
    } else if (customerMatch) {
      // Save previous segment if exists
      if (currentSpeaker && currentText) {
        segments.push({
          speaker: currentSpeaker,
          text: currentText.trim(),
        });
      }
      currentSpeaker = 'customer';
      currentText = trimmedLine.substring(customerMatch[0].length).trim();
    } else if (currentSpeaker) {
      // Continue current speaker's message
      currentText += '\n' + trimmedLine;
    } else {
      // No speaker identified yet, treat as agent
      currentSpeaker = 'agent';
      currentText = trimmedLine;
    }
  }

  // Add last segment
  if (currentSpeaker && currentText) {
    segments.push({
      speaker: currentSpeaker,
      text: currentText.trim(),
    });
  }

  // If no segments were created, treat entire transcript as agent
  if (segments.length === 0 && transcript) {
    segments.push({
      speaker: 'agent',
      text: transcript,
    });
  }

  return segments;
}


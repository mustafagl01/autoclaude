/**
 * Retell AI SDK Client Wrapper
 * UK Takeaway Phone Order Assistant Dashboard
 *
 * Provides type-safe functions for fetching phone call data and transcripts from Retell AI.
 * Handles API initialization, error handling, and data transformation.
 *
 * @see https://www.retellai.com/
 */

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Call status from Retell AI
 */
export type CallStatus = 'in_progress' | 'completed' | 'missed' | 'failed' | 'cancelled';

/**
 * Call outcome from Retell AI
 */
export type CallOutcome = 'order_placed' | 'inquiry' | 'complaint' | 'incomplete' | 'unknown';

/**
 * Phone call record from Retell AI
 */
export interface RetellCall {
  call_id: string;
  phone_number: string;
  start_time: string;
  end_time: string | null;
  duration: number | null;
  status: CallStatus;
  outcome: CallOutcome | null;
  transcript: string | null;
  recording_url: string | null;
  call_analysis: {
    sentiment?: 'positive' | 'neutral' | 'negative';
    confidence?: number;
    categories?: string[];
  } | null;
}

/**
 * Detailed call information including full transcript
 */
/** Call cost from Retell (combined_cost in cents) */
export interface RetellCallCost {
  combined_cost: number; // cents
  total_duration_seconds?: number;
  product_costs?: Array<{ product: string; cost: number; unit_price?: number }>;
}

export interface RetellCallDetails extends RetellCall {
  transcript_segments: Array<{
    speaker: 'agent' | 'customer';
    text: string;
    timestamp: string;
    confidence?: number;
  }>;
  metadata: {
    customer_name?: string;
    order_items?: Array<{
      name: string;
      quantity: number;
      price?: number;
    }>;
    total_amount?: number;
    notes?: string;
  };
  /** Cost of the call (from Retell get-call), in cents */
  call_cost?: RetellCallCost | null;
}

/**
 * Result of a Retell API operation
 */
export interface RetellResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Query parameters for fetching calls
 */
export interface CallQueryParams {
  limit?: number;
  offset?: number;
  start_date?: string;
  end_date?: string;
  status?: CallStatus;
  phone_number?: string;
}

// ============================================================================
// Retell Client Initialization
// ============================================================================

/**
 * Retell SDK client instance
 * Lazily initialized on first use
 */
let retellClient: unknown | null = null;

/**
 * Get or create Retell SDK client instance
 *
 * @returns Retell SDK client
 * @throws Error if RETELL_API_KEY is not configured
 *
 * @example
 * const client = getRetellClient();
 * const calls = await client.calls.list();
 */
function getRetellClient(): unknown {
  if (retellClient) {
    return retellClient;
  }

  // Check for API key in environment
  const apiKey = process.env.RETELL_API_KEY;
  if (!apiKey) {
    throw new Error('RETELL_API_KEY environment variable is not configured');
  }

  try {
    // Dynamic import of Retell SDK to avoid build errors if not installed
    // The exact package name may vary - verify in package.json
    // Common options: 'retell-sdk', '@retellai/sdk', or 'retell'
    const RetellSDK = require('retell-sdk');

    retellClient = new RetellSDK({
      apiKey: apiKey,
    });

    return retellClient;
  } catch (error) {
    throw new Error(
      `Failed to initialize Retell SDK: ${error instanceof Error ? error.message : 'Unknown error'}. Ensure 'retell-sdk' package is installed.`
    );
  }
}

// ============================================================================
// Call Data Fetching
// ============================================================================

/**
 * Fetch phone calls from Retell AI with optional filtering
 *
 * @param params - Query parameters for filtering calls
 * @returns Array of call records or error
 *
 * @example
 * // Get all calls (default limit: 100)
 * const result = await getCalls();
 * if (result.success) {
 *   console.log(`Found ${result.data?.calls.length} calls`);
 * }
 *
 * @example
 * // Get calls with filters
 * const result = await getCalls({
 *   limit: 50,
 *   start_date: '2024-01-01T00:00:00Z',
 *   end_date: '2024-01-31T23:59:59Z',
 *   status: 'completed'
 * });
 */
export async function getCalls(params?: CallQueryParams): Promise<RetellResult<{ calls: RetellCall[]; total: number }>> {
  try {
    const client = getRetellClient();

    // Build query parameters for Retell API
    // Note: The exact parameter names may vary based on Retell SDK version
    // Adjust these based on actual SDK documentation
    const queryParams: Record<string, unknown> = {
      limit: params?.limit || 100,
      offset: params?.offset || 0,
    };

    if (params?.start_date) {
      queryParams.start_date = params.start_date;
    }

    if (params?.end_date) {
      queryParams.end_date = params.end_date;
    }

    if (params?.status) {
      queryParams.status = params.status;
    }

    if (params?.phone_number) {
      queryParams.phone_number = params.phone_number;
    }

    // Call Retell API to fetch calls
    // The exact method may vary - adjust based on SDK documentation
    const response = await (client as any).calls.list(queryParams);

    // Transform Retell API response to our interface
    const calls: RetellCall[] = (response.data || []).map((call: unknown) =>
      transformRetellCall(call as Record<string, unknown>)
    );

    return {
      success: true,
      data: {
        calls,
        total: response.total || calls.length,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch calls from Retell AI',
    };
  }
}

/**
 * Get detailed information for a specific call including full transcript
 *
 * @param callId - Unique call identifier from Retell
 * @returns Detailed call information or error
 *
 * @example
 * const result = await getCallDetails('call_abc123');
 * if (result.success && result.data) {
 *   console.log(`Call duration: ${result.data.duration}s`);
 *   console.log(`Transcript: ${result.data.transcript}`);
 * }
 */
export async function getCallDetails(callId: string): Promise<RetellResult<RetellCallDetails>> {
  try {
    // Validate input
    if (!callId || typeof callId !== 'string') {
      return {
        success: false,
        error: 'Call ID must be a non-empty string',
      };
    }

    const client = getRetellClient();

    // Call Retell API to fetch call details
    const response = await (client as any).calls.retrieve(callId);

    // Transform response to our interface
    const callDetails = transformRetellCallDetails(response.data || response);

    return {
      success: true,
      data: callDetails,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch call details from Retell AI',
    };
  }
}

/**
 * Get transcript for a specific call
 *
 * @param callId - Unique call identifier from Retell
 * @returns Transcript text or error
 *
 * @example
 * const result = await getTranscript('call_abc123');
 * if (result.success && result.data) {
 *   console.log(`Full transcript:\n${result.data}`);
 * }
 */
export async function getTranscript(callId: string): Promise<RetellResult<string>> {
  try {
    // Validate input
    if (!callId || typeof callId !== 'string') {
      return {
        success: false,
        error: 'Call ID must be a non-empty string',
      };
    }

    const client = getRetellClient();

    // Call Retell API to fetch transcript
    // The exact method may vary - some SDKs may include transcript in call details
    const response = await (client as any).calls.transcript(callId);

    // Extract transcript from response
    const transcript = response.transcript || response.data?.transcript || '';

    return {
      success: true,
      data: transcript,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch transcript from Retell AI',
    };
  }
}

// ============================================================================
// Data Transformation Helpers
// ============================================================================

/**
 * Fetch calls from Retell using REST API v2 (POST /v2/list-calls).
 * When apiKey is passed (per-user key from DB), use it; else use RETELL_API_KEY env.
 */
export async function listCallsViaApi(
  params?: {
    limit?: number;
    sort_order?: 'ascending' | 'descending';
    pagination_key?: string;
    filter_criteria?: {
      call_status?: string[];
      call_type?: string[];
      start_timestamp?: { lower_threshold?: number; upper_threshold?: number };
    };
  },
  /** Per-user API key from DB; if not set, uses process.env.RETELL_API_KEY */
  apiKey?: string | null
): Promise<RetellResult<RetellCall[]>> {
  const key = apiKey ?? process.env.RETELL_API_KEY;
  if (!key || key.trim() === '') {
    return {
      success: false,
      error: apiKey === undefined
        ? 'RETELL_API_KEY environment variable is not set'
        : 'Add your Retell API key in Profile to sync calls.',
    };
  }

  try {
    const body: Record<string, unknown> = {
      limit: params?.limit ?? 100,
      sort_order: params?.sort_order ?? 'descending',
    };
    if (params?.pagination_key) body.pagination_key = params.pagination_key;
    if (params?.filter_criteria) body.filter_criteria = params.filter_criteria;

    const res = await fetch('https://api.retellai.com/v2/list-calls', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      return {
        success: false,
        error: `Retell API ${res.status}: ${text || res.statusText}`,
      };
    }

    const rawCalls: unknown = await res.json();
    const list = Array.isArray(rawCalls) ? rawCalls : [];
    const calls: RetellCall[] = list.map((c: unknown) =>
      transformRetellCallFromV2(c as Record<string, unknown>)
    );
    return { success: true, data: calls };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch calls from Retell',
    };
  }
}

/**
 * Fetch a single call's full details from Retell v2 (GET /v2/get-call/{call_id}).
 * Uses the given apiKey (user's key from DB). Returns recording_url, transcript, transcript_object as segments.
 */
export async function getCallDetailsViaApi(
  callId: string,
  apiKey: string | null | undefined
): Promise<RetellResult<RetellCallDetails>> {
  const key = apiKey?.trim();
  if (!key) {
    return {
      success: false,
      error: 'Add your Retell API key in Profile to load call details and recording.',
    };
  }
  try {
    const res = await fetch(`https://api.retellai.com/v2/get-call/${encodeURIComponent(callId)}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${key}` },
    });
    if (!res.ok) {
      const text = await res.text();
      return {
        success: false,
        error: `Retell API ${res.status}: ${text || res.statusText}`,
      };
    }
    const raw = (await res.json()) as Record<string, unknown>;
    const details = transformV2CallResponseToDetails(callId, raw);
    return { success: true, data: details };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch call details from Retell',
    };
  }
}

/**
 * Map Retell v2 get-call response (V2CallBase + phone/web) to RetellCallDetails.
 */
function transformV2CallResponseToDetails(callId: string, raw: Record<string, unknown>): RetellCallDetails {
  const startTs = raw.start_timestamp != null ? Number(raw.start_timestamp) : 0;
  const endTs = raw.end_timestamp != null ? Number(raw.end_timestamp) : null;
  const durationMs = raw.duration_ms != null ? Number(raw.duration_ms) : null;
  const direction = String(raw.direction || 'inbound');
  const from = String(raw.from_number || '');
  const to = String(raw.to_number || '');
  const phone = direction === 'inbound' ? from : to;
  const callStatus = String(raw.call_status || '');
  const statusMap: Record<string, CallStatus> = {
    ended: 'completed',
    ongoing: 'in_progress',
    registered: 'in_progress',
    not_connected: 'failed',
    error: 'failed',
  };
  const status = (statusMap[callStatus] || callStatus) as CallStatus;

  const transcript = raw.transcript ? String(raw.transcript) : null;
  const recording_url = raw.recording_url ? String(raw.recording_url) : null;

  const transcript_object = raw.transcript_object;
  const transcript_segments: RetellCallDetails['transcript_segments'] = Array.isArray(transcript_object)
    ? (transcript_object as Array<Record<string, unknown>>).map((u) => ({
        speaker: (u.role === 'agent' ? 'agent' : 'customer') as 'agent' | 'customer',
        text: String(u.content ?? ''),
        timestamp: u.words?.[0] != null ? String((u.words as Array<{ start?: number }>)[0]?.start ?? '') : '',
      }))
    : [];

  const call_analysis = raw.call_analysis ? (raw.call_analysis as RetellCall['call_analysis']) : null;
  const metadata: RetellCallDetails['metadata'] = {};

  let call_cost: RetellCallDetails['call_cost'] = null;
  if (raw.call_cost && typeof raw.call_cost === 'object') {
    const c = raw.call_cost as Record<string, unknown>;
    const combined = c.combined_cost != null ? Number(c.combined_cost) : 0;
    call_cost = {
      combined_cost: combined,
      total_duration_seconds: c.total_duration_seconds != null ? Number(c.total_duration_seconds) : undefined,
      product_costs: Array.isArray(c.product_costs)
        ? (c.product_costs as Array<Record<string, unknown>>).map((p) => ({
            product: String(p.product ?? ''),
            cost: Number(p.cost ?? 0),
            unit_price: p.unit_price != null ? Number(p.unit_price) : undefined,
          }))
        : undefined,
    };
  }

  return {
    call_id: callId,
    phone_number: phone,
    start_time: startTs ? new Date(startTs).toISOString() : '',
    end_time: endTs ? new Date(endTs).toISOString() : null,
    duration: durationMs != null ? Math.round(durationMs / 1000) : null,
    status,
    outcome: null,
    transcript,
    recording_url,
    call_analysis,
    transcript_segments,
    metadata,
    call_cost,
  };
}

/**
 * Map Retell v2 list-calls response item to our RetellCall (and DB-friendly) shape.
 * v2 uses: call_id, from_number, to_number, direction, call_status, start_timestamp, end_timestamp, duration_ms, transcript, recording_url.
 */
function transformRetellCallFromV2(raw: Record<string, unknown>): RetellCall {
  const startTs = raw.start_timestamp != null ? Number(raw.start_timestamp) : 0;
  const endTs = raw.end_timestamp != null ? Number(raw.end_timestamp) : null;
  const durationMs = raw.duration_ms != null ? Number(raw.duration_ms) : null;
  const direction = String(raw.direction || '');
  const from = String(raw.from_number || '');
  const to = String(raw.to_number || '');
  const phone = direction === 'inbound' ? from : to;
  const callStatus = String(raw.call_status || '');
  const statusMap: Record<string, CallStatus> = {
    ended: 'completed',
    ongoing: 'in_progress',
    registered: 'in_progress',
    not_connected: 'failed',
    error: 'failed',
  };
  const status = (statusMap[callStatus] || callStatus) as CallStatus;

  return {
    call_id: String(raw.call_id || raw.id || ''),
    phone_number: phone,
    start_time: startTs ? new Date(startTs).toISOString() : '',
    end_time: endTs ? new Date(endTs).toISOString() : null,
    duration: durationMs != null ? Math.round(durationMs / 1000) : null,
    status,
    outcome: (raw.call_analysis && (raw.call_analysis as Record<string, unknown>).outcome != null)
      ? ((raw.call_analysis as Record<string, unknown>).outcome as CallOutcome)
      : null,
    transcript: raw.transcript ? String(raw.transcript) : null,
    recording_url: raw.recording_url ? String(raw.recording_url) : null,
    call_analysis: raw.call_analysis ? (raw.call_analysis as RetellCall['call_analysis']) : null,
  };
}

/**
 * Transform raw Retell API call data to our interface
 *
 * @param rawCall - Raw call data from Retell API
 * @returns Normalized call record
 */
function transformRetellCall(rawCall: Record<string, unknown>): RetellCall {
  return {
    call_id: String(rawCall.call_id || rawCall.id || ''),
    phone_number: String(rawCall.phone_number || rawCall.from_number || ''),
    start_time: String(rawCall.start_time || rawCall.created_at || ''),
    end_time: rawCall.end_time ? String(rawCall.end_time) : null,
    duration: rawCall.duration ? Number(rawCall.duration) : null,
    status: (rawCall.status as CallStatus) || 'unknown',
    outcome: rawCall.outcome ? (rawCall.outcome as CallOutcome) : null,
    transcript: rawCall.transcript ? String(rawCall.transcript) : null,
    recording_url: rawCall.recording_url ? String(rawCall.recording_url) : null,
    call_analysis: rawCall.call_analysis
      ? (rawCall.call_analysis as RetellCall['call_analysis'])
      : rawCall.analysis
        ? (rawCall.analysis as RetellCall['call_analysis'])
        : null,
  };
}

/**
 * Transform raw Retell API call details to our interface
 *
 * @param rawDetails - Raw call details from Retell API
 * @returns Normalized detailed call record
 */
function transformRetellCallDetails(rawDetails: Record<string, unknown>): RetellCallDetails {
  const baseCall = transformRetellCall(rawDetails);

  // Extract transcript segments if available
  const segments = Array.isArray(rawDetails.transcript_segments)
    ? rawDetails.transcript_segments.map((seg: unknown) => ({
        speaker: (seg as Record<string, unknown>).speaker === 'agent' ? 'agent' : 'customer',
        text: String((seg as Record<string, unknown>).text || ''),
        timestamp: String((seg as Record<string, unknown>).timestamp || ''),
        confidence: (seg as Record<string, unknown>).confidence
          ? Number((seg as Record<string, unknown>).confidence)
          : undefined,
      }))
    : [];

  // Extract metadata if available
  const metadata = rawDetails.metadata
    ? {
        customer_name: (rawDetails.metadata as Record<string, unknown>).customer_name
          ? String((rawDetails.metadata as Record<string, unknown>).customer_name)
          : undefined,
        order_items: Array.isArray((rawDetails.metadata as Record<string, unknown>).order_items)
          ? (rawDetails.metadata as Record<string, unknown>).order_items.map((item: unknown) => ({
              name: String((item as Record<string, unknown>).name || ''),
              quantity: Number((item as Record<string, unknown>).quantity || 0),
              price: (item as Record<string, unknown>).price
                ? Number((item as Record<string, unknown>).price)
                : undefined,
            }))
          : undefined,
        total_amount: (rawDetails.metadata as Record<string, unknown>).total_amount
          ? Number((rawDetails.metadata as Record<string, unknown>).total_amount)
          : undefined,
        notes: (rawDetails.metadata as Record<string, unknown>).notes
          ? String((rawDetails.metadata as Record<string, unknown>).notes)
          : undefined,
      }
    : {};

  return {
    ...baseCall,
    transcript_segments: segments,
    metadata,
  };
}

// ============================================================================
// Analytics & Metrics
// ============================================================================

/**
 * Get call analytics for a time period
 *
 * @param startDate - Start date (ISO string)
 * @param endDate - End date (ISO string)
 * @returns Call analytics metrics or error
 *
 * @example
 * const result = await getCallAnalytics(
 *   '2024-01-01T00:00:00Z',
 *   '2024-01-31T23:59:59Z'
 * );
 * if (result.success && result.data) {
 *   console.log(`Total calls: ${result.data.total_calls}`);
 *   console.log(`Completion rate: ${result.data.completion_rate}%`);
 * }
 */
export async function getCallAnalytics(
  startDate: string,
  endDate: string
): Promise<
  RetellResult<{
    total_calls: number;
    completed_calls: number;
    missed_calls: number;
    failed_calls: number;
    avg_duration: number;
    completion_rate: number;
  }>
> {
  try {
    // Validate inputs
    if (!startDate || !endDate) {
      return {
        success: false,
        error: 'Start date and end date are required',
      };
    }

    // Fetch all calls in date range
    const callsResult = await getCalls({
      start_date: startDate,
      end_date: endDate,
      limit: 10000, // Large limit to get all calls for analytics
    });

    if (!callsResult.success || !callsResult.data) {
      return {
        success: false,
        error: callsResult.error || 'Failed to fetch calls for analytics',
      };
    }

    const calls = callsResult.data.calls;

    // Calculate metrics
    const totalCalls = calls.length;
    const completedCalls = calls.filter((c) => c.status === 'completed').length;
    const missedCalls = calls.filter((c) => c.status === 'missed').length;
    const failedCalls = calls.filter((c) => c.status === 'failed').length;

    const durations = calls.filter((c) => c.duration !== null).map((c) => c.duration as number);
    const avgDuration = durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;

    const completionRate = totalCalls > 0 ? (completedCalls / totalCalls) * 100 : 0;

    return {
      success: true,
      data: {
        total_calls: totalCalls,
        completed_calls: completedCalls,
        missed_calls: missedCalls,
        failed_calls: failedCalls,
        avg_duration: Math.round(avgDuration),
        completion_rate: Math.round(completionRate * 100) / 100,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to calculate call analytics',
    };
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Check if Retell API is accessible and credentials are valid
 *
 * @returns true if Retell API is accessible
 *
 * @example
 * const isHealthy = await checkRetellHealth();
 * if (!isHealthy) {
 *   console.error('Retell API is not accessible');
 * }
 */
export async function checkRetellHealth(): Promise<boolean> {
  try {
    const client = getRetellClient();
    // Try to fetch a single call to verify credentials
    await (client as any).calls.list({ limit: 1 });
    return true;
  } catch {
    return false;
  }
}

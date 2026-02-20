import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/api/auth/[...nextauth]/route';
import { getCallsByUserId, getCallsByDateRange, getCallsByStatus, getCallsByPhoneNumber, getTotalCostCents, getUserById, updateCallCost, type Call } from '@/lib/db';
import { getCallDetailsViaApi } from '@/lib/retell';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || !session.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    const limitParam = searchParams.get('limit');
    const offsetParam = searchParams.get('offset');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const status = searchParams.get('status');
    const phoneNumber = searchParams.get('phoneNumber');

    if (!userId) {
      return NextResponse.json({ success: false, error: 'userId parameter is required' }, { status: 400 });
    }

    if (userId !== session.user.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized: User ID mismatch' }, { status: 403 });
    }

    const limit = limitParam ? parseInt(limitParam, 10) : 25;
    const offset = offsetParam ? parseInt(offsetParam, 10) : 0;

    if (isNaN(limit) || limit < 1 || limit > 100) {
      return NextResponse.json({ success: false, error: 'limit must be between 1 and 100' }, { status: 400 });
    }

    if (isNaN(offset) || offset < 0) {
      return NextResponse.json({ success: false, error: 'offset must be >= 0' }, { status: 400 });
    }

    let callsResult: { success: boolean; data?: Call[]; error?: string };

    if (startDate && endDate) {
      callsResult = await getCallsByDateRange(userId, startDate, endDate, limit, offset);
    } else if (status) {
      callsResult = await getCallsByStatus(userId, status, limit, offset);
    } else if (phoneNumber) {
      callsResult = await getCallsByPhoneNumber(userId, phoneNumber, limit, offset);
    } else {
      callsResult = await getCallsByUserId(userId, limit, offset);
    }

    if (!callsResult.success || !callsResult.data) {
      throw new Error(callsResult.error || 'Failed to fetch calls');
    }

    const totalResult = await getCallsByUserId(userId, 1000, 0);
    const total = totalResult.success && totalResult.data ? totalResult.data.length : callsResult.data.length;

    const costResult = await getTotalCostCents(userId, {
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      status: status || undefined,
      phoneNumber: phoneNumber || undefined,
    });
    const totalCostCents = costResult.success ? costResult.data : 0;

    // Fetch costs for calls that don't have cost yet
    // Only fetch for first 5 calls to avoid rate limits and keep response fast
    const callsWithoutCost = callsResult.data
      .filter((call) => call.call_cost_cents == null)
      .slice(0, 5);

    if (callsWithoutCost.length > 0) {
      const user = await getUserById(userId);
      const apiKey = user?.retell_api_key?.trim();

      if (apiKey) {
        // Fetch costs in parallel with 2 second total timeout (don't block response too long)
        const costFetchPromises = callsWithoutCost.map(async (call) => {
          try {
            const result = await Promise.race([
              getCallDetailsViaApi(call.id, apiKey),
              new Promise<{ success: false; error: string }>((resolve) =>
                setTimeout(() => resolve({ success: false, error: 'Timeout' }), 2000)
              ),
            ]);

            if (result.success && result.data?.call_cost?.combined_cost != null) {
              const costCents = Math.round(result.data.call_cost.combined_cost);
              if (costCents > 0) {
                await updateCallCost(call.id, costCents);
                // Update the call object in the response so cost appears immediately
                const callIndex = callsResult.data.findIndex((c) => c.id === call.id);
                if (callIndex >= 0) {
                  callsResult.data[callIndex].call_cost_cents = costCents;
                }
              }
            }
          } catch (error) {
            // Silently fail - cost will be fetched when user views details
            console.error(`Failed to fetch cost for call ${call.id}:`, error);
          }
        });

        // Wait for all cost fetches with a total timeout of 3 seconds
        await Promise.race([
          Promise.all(costFetchPromises),
          new Promise((resolve) => setTimeout(resolve, 3000)),
        ]);
      }
    }

    return NextResponse.json({
      success: true,
      data: { calls: callsResult.data, total, totalCostCents },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An error occurred';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}

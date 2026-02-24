/**
 * Orders API - Single Order (Vercel Postgres)
 * GET /api/orders/[id] - Get a single order
 * PATCH /api/orders/[id] - Update order status
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { sql } from '@vercel/postgres';
import { getHubRiseClient } from '@/lib/hubrise-client';

interface RouteContext {
  params: {
    id: string;
  };
}

function centsToPounds(cents: number): string {
  return `£${(cents / 100).toFixed(2)}`;
}

// GET - Single order
export async function GET(req: NextRequest, { params }: RouteContext) {
  try {
    // Check session
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const orderId = params.id;

    // Get order from database (try hubrise_order_id first, then local id)
    const result = await sql`
      SELECT * FROM orders
      WHERE user_id = ${session.user.id}
        AND (hubrise_order_id = ${orderId} OR id::text = ${orderId})
      LIMIT 1
    `;

    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const order = result.rows[0];

    // Format response
    return NextResponse.json({
      id: order.hubrise_order_id,
      localId: order.id,
      platform: order.platform_source,
      status: order.status,
      customer: {
        name: order.customer_name,
        phone: order.customer_phone,
        address: order.customer_address,
        postcode: order.customer_postcode,
        city: order.customer_city,
      },
      total: {
        amount: centsToPounds(order.total_cents),
        cents: order.total_cents,
        tax: centsToPounds(order.total_cents_tax),
        currency: order.currency,
      },
      items: order.items || [], // JSONB array
      timestamps: {
        created: order.order_created_at,
        updated: order.order_updated_at,
      },
    });
  } catch (error) {
    console.error('Order GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch order' },
      { status: 500 }
    );
  }
}

// PATCH - Update order status
export async function PATCH(req: NextRequest, { params }: RouteContext) {
  try {
    // Check session
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const orderId = params.id;
    const body = await req.json();
    const { status } = body;

    if (!status) {
      return NextResponse.json({ error: 'Status is required' }, { status: 400 });
    }

    // Get order with location_id
    const orderResult = await sql`
      SELECT hubrise_order_id, location_id FROM orders
      WHERE user_id = ${session.user.id}
        AND (hubrise_order_id = ${orderId} OR id::text = ${orderId})
      LIMIT 1
    `;

    if (orderResult.rowCount === 0) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const order = orderResult.rows[0];

    // Get HubRise connection
    const connectionResult = await sql`
      SELECT access_token FROM hubrise_connections
      WHERE user_id = ${session.user.id}
        AND location_id = ${order.location_id}
        AND is_active = true
      LIMIT 1
    `;

    if (connectionResult.rowCount === 0) {
      return NextResponse.json(
        { error: 'No active HubRise connection' },
        { status: 400 }
      );
    }

    const accessToken = connectionResult.rows[0].access_token;

    // Update status in HubRise
    const hubRiseClient = getHubRiseClient();
    try {
      await hubRiseClient.updateOrderStatus(
        order.location_id,
        order.hubrise_order_id,
        status,
        accessToken
      );
    } catch (hubriseError) {
      console.error('Failed to update HubRise order:', hubriseError);
      // Continue to update local database anyway
    }

    // Update status in local database
    await sql`
      UPDATE orders
      SET status = ${status},
          order_updated_at = NOW()
      WHERE user_id = ${session.user.id} AND hubrise_order_id = ${order.hubrise_order_id}
    `;

    return NextResponse.json({
      success: true,
      status,
      orderId: order.hubrise_order_id,
    });
  } catch (error) {
    console.error('Order PATCH error:', error);
    return NextResponse.json(
      { error: 'Failed to update order' },
      { status: 500 }
    );
  }
}

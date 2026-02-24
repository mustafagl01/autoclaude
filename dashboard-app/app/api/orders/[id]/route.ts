/**
 * Orders API - Single Order
 * GET /api/orders/[id] - Get a single order
 * PATCH /api/orders/[id] - Update order status
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { parseItems, centsToPounds } from '@/lib/order-normalizer';
import { getHubRiseClient } from '@/lib/hubrise-client';

interface RouteContext {
  params: {
    id: string;
  };
}

// GET - Single order
export async function GET(req: NextRequest, { params }: RouteContext) {
  try {
    // Check session
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const orderId = params.id;

    // Get order from database
    const db = getDb();
    const order = db.prepare(`
      SELECT * FROM orders
      WHERE user_id = ? AND (hubrise_order_id = ? OR id = ?)
    `).get(session.user.id, orderId, orderId) as {
      id: number;
      hubrise_order_id: string;
      user_id: string;
      location_id: string;
      platform_source: string;
      status: string;
      customer_name: string;
      customer_phone: string;
      customer_address: string;
      customer_postcode: string;
      customer_city: string;
      total_cents: number;
      total_cents_tax: number;
      currency: string;
      items: string;
      order_created_at: string;
      order_updated_at: string;
      created_at: string;
    } | undefined;

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Format response
    const formattedOrder = {
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
      items: parseItems(order.items),
      timestamps: {
        created: order.order_created_at,
        updated: order.order_updated_at,
      },
    };

    return NextResponse.json(formattedOrder);
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
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const orderId = params.id;
    const body = await req.json();
    const { status } = body;

    if (!status) {
      return NextResponse.json({ error: 'Status is required' }, { status: 400 });
    }

    const db = getDb();

    // Get order with location_id
    const order = db.prepare(`
      SELECT hubrise_order_id, location_id FROM orders
      WHERE user_id = ? AND (hubrise_order_id = ? OR id = ?)
    `).get(session.user.id, orderId, orderId) as {
      hubrise_order_id: string;
      location_id: string;
    } | undefined;

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Get HubRise connection
    const connection = db.prepare(`
      SELECT access_token FROM hubrise_connections
      WHERE user_id = ? AND location_id = ? AND is_active = 1
    `).get(session.user.id, order.location_id) as {
      access_token: string;
    } | undefined;

    if (!connection) {
      return NextResponse.json(
        { error: 'No active HubRise connection' },
        { status: 400 }
      );
    }

    // Update status in HubRise
    const hubRiseClient = getHubRiseClient();
    try {
      await hubRiseClient.updateOrderStatus(
        order.location_id,
        order.hubrise_order_id,
        status,
        connection.access_token
      );
    } catch (hubriseError) {
      console.error('Failed to update HubRise order:', hubriseError);
      // Continue to update local database anyway
    }

    // Update status in local database
    db.prepare(`
      UPDATE orders
      SET status = ?,
          order_updated_at = datetime('now')
      WHERE user_id = ? AND hubrise_order_id = ?
    `).run(status, session.user.id, order.hubrise_order_id);

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

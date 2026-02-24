/**
 * Orders API - List Orders
 * GET /api/orders - List all orders for the authenticated user
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { parseItems, centsToPounds } from '@/lib/order-normalizer';

export async function GET(req: NextRequest) {
  try {
    // Check session
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse query parameters
    const searchParams = req.nextUrl.searchParams;
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const platform = searchParams.get('platform');

    // Build query
    let query = `
      SELECT * FROM orders
      WHERE user_id = ?
    `;
    const params: any[] = [session.user.id];

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    if (platform) {
      query += ' AND platform_source = ?';
      params.push(platform);
    }

    query += ' ORDER BY order_created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    // Get orders from database
    const db = getDb();
    const orders = db.prepare(query).all(...params) as Array<{
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
    }>;

    // Parse items and format response
    const formattedOrders = orders.map(order => ({
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
    }));

    // Get total count
    let countQuery = 'SELECT COUNT(*) as count FROM orders WHERE user_id = ?';
    const countParams: any[] = [session.user.id];

    if (status) {
      countQuery += ' AND status = ?';
      countParams.push(status);
    }

    if (platform) {
      countQuery += ' AND platform_source = ?';
      countParams.push(platform);
    }

    const { count } = db.prepare(countQuery).get(...countParams) as { count: number };

    return NextResponse.json({
      orders: formattedOrders,
      pagination: {
        total: count,
        limit,
        offset,
        hasMore: offset + limit < count,
      },
    });
  } catch (error) {
    console.error('Orders API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    );
  }
}

/**
 * Orders API - List Orders (Vercel Postgres)
 * GET /api/orders - List all orders for the authenticated user
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { sql } from '@vercel/postgres';

function centsToPounds(cents: number): string {
  return `£${(cents / 100).toFixed(2)}`;
}

export async function GET(req: NextRequest) {
  try {
    // Check session
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse query parameters
    const searchParams = req.nextUrl.searchParams;
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const platform = searchParams.get('platform');

    // Build query dynamically
    let query = `
      SELECT * FROM orders
      WHERE user_id = ${session.user.id}
    `;

    if (status) {
      query += ` AND status = ${status}`;
    }
    if (platform) {
      query += ` AND platform_source = ${platform}`;
    }

    query += ` ORDER BY order_created_at DESC LIMIT ${limit} OFFSET ${offset}`;

    // Get orders from database
    const result = await sql.query(query);

    // Format response
    const formattedOrders = result.rows.map((order: any) => ({
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
    }));

    // Get total count
    let countQuery = `SELECT COUNT(*) as count FROM orders WHERE user_id = ${session.user.id}`;
    if (status) countQuery += ` AND status = ${status}`;
    if (platform) countQuery += ` AND platform_source = ${platform}`;

    const countResult = await sql.query(countQuery);
    const count = parseInt(countResult.rows[0].count);

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

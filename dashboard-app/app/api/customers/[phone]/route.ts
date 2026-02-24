/**
 * Customer CRM API
 * GET /api/customers/[phone] - Get customer info and recent orders
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { normalizePhoneNumber, centsToPounds, parseItems } from '@/lib/order-normalizer';

interface RouteContext {
  params: {
    phone: string;
  };
}

export async function GET(req: NextRequest, { params }: RouteContext) {
  try {
    // Check session
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Normalize phone number
    const normalizedPhone = normalizePhoneNumber(params.phone);

    // Get customer from database
    const db = getDb();
    const customer = db.prepare(`
      SELECT * FROM customers
      WHERE user_id = ? AND phone = ?
    `).get(session.user.id, normalizedPhone) as {
      id: number;
      user_id: string;
      phone: string;
      name: string;
      address: string;
      postcode: string;
      city: string;
      total_orders: number;
      total_spent_cents: number;
      last_order_date: string;
      created_at: string;
    } | undefined;

    if (!customer) {
      return NextResponse.json({
        found: false,
        message: 'Customer not found',
      });
    }

    // Get recent orders for this customer
    const recentOrders = db.prepare(`
      SELECT hubrise_order_id, platform_source, status,
             total_cents, currency, items, order_created_at
      FROM orders
      WHERE user_id = ? AND customer_phone = ?
      ORDER BY order_created_at DESC
      LIMIT 5
    `).all(session.user.id, normalizedPhone) as Array<{
      hubrise_order_id: string;
      platform_source: string;
      status: string;
      total_cents: number;
      currency: string;
      items: string;
      order_created_at: string;
    }>;

    // Format recent orders
    const formattedOrders = recentOrders.map(order => ({
      id: order.hubrise_order_id,
      platform: order.platform_source,
      status: order.status,
      total: {
        amount: centsToPounds(order.total_cents),
        currency: order.currency,
      },
      items: parseItems(order.items),
      date: order.order_created_at,
    }));

    return NextResponse.json({
      found: true,
      customer: {
        phone: customer.phone,
        name: customer.name,
        address: customer.address,
        postcode: customer.postcode,
        city: customer.city,
        stats: {
          totalOrders: customer.total_orders,
          totalSpent: centsToPounds(customer.total_spent_cents),
          averageOrderValue: centsToPounds(
            customer.total_orders > 0
              ? Math.round(customer.total_spent_cents / customer.total_orders)
              : 0
          ),
          lastOrderDate: customer.last_order_date,
        },
      },
      recentOrders: formattedOrders,
    });
  } catch (error) {
    console.error('Customer API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch customer' },
      { status: 500 }
    );
  }
}

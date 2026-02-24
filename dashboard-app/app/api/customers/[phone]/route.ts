/**
 * Customer CRM API (Vercel Postgres)
 * GET /api/customers/[phone] - Get customer info and recent orders
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { sql } from '@vercel/postgres';

interface RouteContext {
  params: {
    phone: string;
  };
}

function normalizePhoneNumber(phone: string): string {
  if (!phone) return '';
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '44' + cleaned.substring(1);
  }
  if (!cleaned.startsWith('44')) {
    cleaned = '44' + cleaned;
  }
  return '+' + cleaned;
}

function centsToPounds(cents: number): string {
  return `£${(cents / 100).toFixed(2)}`;
}

export async function GET(req: NextRequest, { params }: RouteContext) {
  try {
    // Check session
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Normalize phone number
    const normalizedPhone = normalizePhoneNumber(params.phone);

    // Get customer from database
    const customerResult = await sql`
      SELECT * FROM customers
      WHERE user_id = ${session.user.id} AND phone = ${normalizedPhone}
    `;

    if (customerResult.rowCount === 0) {
      return NextResponse.json({
        found: false,
        message: 'Customer not found',
      });
    }

    const customer = customerResult.rows[0];

    // Get recent orders for this customer
    const ordersResult = await sql`
      SELECT hubrise_order_id, platform_source, status,
             total_cents, currency, items, order_created_at
      FROM orders
      WHERE user_id = ${session.user.id} AND customer_phone = ${normalizedPhone}
      ORDER BY order_created_at DESC
      LIMIT 5
    `;

    // Format recent orders
    const recentOrders = ordersResult.rows.map((order: any) => ({
      id: order.hubrise_order_id,
      platform: order.platform_source,
      status: order.status,
      total: {
        amount: centsToPounds(order.total_cents),
        currency: order.currency,
      },
      items: order.items || [], // JSONB array
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
      recentOrders,
    });
  } catch (error) {
    console.error('Customer API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch customer' },
      { status: 500 }
    );
  }
}

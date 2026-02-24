/**
 * HubRise Webhook Receiver (Vercel Postgres)
 * Handles order.create and order.update events from HubRise
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { detectPlatform } from '@/lib/order-normalizer';

interface HubRiseWebhookPayload {
  event_type: 'order.create' | 'order.update';
  location_id: string;
  account_id: string;
  data: {
    order: {
      id: string;
      status: string;
      customer?: {
        name?: string;
        phone_number?: string;
        address?: {
          street?: string;
          postcode?: string;
          city?: string;
        };
      };
      total_price: number;
      total_tax?: number;
      currency?: string;
      items?: Array<{
        name: string;
        quantity: number;
        price: number;
      }>;
      created_at: string;
      updated_at?: string;
      service_type_ref?: string;
    };
  };
  timestamp: string;
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

export async function POST(req: NextRequest) {
  try {
    // Parse webhook payload
    const payload: HubRiseWebhookPayload = await req.json();

    // Validate event type
    if (payload.event_type !== 'order.create' && payload.event_type !== 'order.update') {
      return NextResponse.json({ received: true }, { status: 200 });
    }

    const { event_type, location_id, data } = payload;
    const order = data.order;

    // Find user_id from location_id
    const connectionResult = await sql`
      SELECT user_id, access_token
      FROM hubrise_connections
      WHERE location_id = ${location_id} AND is_active = true
      LIMIT 1
    `;

    if (connectionResult.rowCount === 0) {
      console.error(`No active connection found for location: ${location_id}`);
      return NextResponse.json({ received: true }, { status: 200 });
    }

    const connection = connectionResult.rows[0];
    const userId = connection.user_id;

    if (event_type === 'order.create') {
      // Check for duplicate order
      const existingOrder = await sql`
        SELECT id FROM orders WHERE hubrise_order_id = ${order.id}
      `;

      if (existingOrder.rowCount > 0) {
        console.log(`Order ${order.id} already exists, skipping`);
        return NextResponse.json({ received: true, duplicate: true }, { status: 200 });
      }

      // Normalize phone
      const customerPhone = normalizePhoneNumber(order.customer?.phone_number || '');
      const platformSource = detectPlatform(order.service_type_ref || '');
      const totalCents = Math.round(order.total_price * 100);
      const totalCentsTax = Math.round((order.total_tax || 0) * 100);

      // Insert order into database
      await sql`
        INSERT INTO orders
        (hubrise_order_id, user_id, location_id, platform_source, status,
         customer_name, customer_phone, customer_address, customer_postcode, customer_city,
         total_cents, total_cents_tax, currency, items, order_created_at, order_updated_at)
        VALUES (${order.id}, ${userId}, ${location_id}, ${platformSource}, ${order.status},
                ${order.customer?.name || ''}, ${customerPhone},
                ${order.customer?.address?.street || ''}, ${order.customer?.address?.postcode || ''}, ${order.customer?.address?.city || ''},
                ${totalCents}, ${totalCentsTax}, ${order.currency || 'GBP'},
                ${JSON.stringify(order.items || [])}::jsonb,
                ${order.created_at}::timestamp with time zone,
                ${(order.updated_at || order.created_at)}::timestamp with time zone)
      `;

      // Upsert customer
      const existingCustomer = await sql`
        SELECT id, total_orders, total_spent_cents
        FROM customers
        WHERE user_id = ${userId} AND phone = ${customerPhone}
      `;

      if (existingCustomer.rowCount > 0) {
        const cust = existingCustomer.rows[0];
        // Update existing customer
        await sql`
          UPDATE customers
          SET name = COALESCE(${order.customer?.name || ''}, name),
              address = COALESCE(${order.customer?.address?.street || ''}, address),
              postcode = COALESCE(${order.customer?.address?.postcode || ''}, postcode),
              city = COALESCE(${order.customer?.address?.city || ''}, city),
              total_orders = total_orders + 1,
              total_spent_cents = total_spent_cents + ${totalCents},
              last_order_date = ${order.created_at}::timestamp with time zone,
              updated_at = NOW()
          WHERE id = ${cust.id}
        `;
      } else {
        // Insert new customer
        await sql`
          INSERT INTO customers
          (user_id, phone, name, address, postcode, city, total_orders, total_spent_cents, last_order_date, created_at, updated_at)
          VALUES (${userId}, ${customerPhone}, ${order.customer?.name || ''},
                  ${order.customer?.address?.street || ''}, ${order.customer?.address?.postcode || ''}, ${order.customer?.address?.city || ''},
                  1, ${totalCents}, ${order.created_at}::timestamp with time zone, NOW(), NOW())
        `;
      }

      console.log(`Order ${order.id} created successfully`);
    } else if (event_type === 'order.update') {
      // Update existing order status
      await sql`
        UPDATE orders
        SET status = ${order.status},
            order_updated_at = ${(order.updated_at || new Date().toISOString())}::timestamp with time zone
        WHERE hubrise_order_id = ${order.id}
      `;

      console.log(`Order ${order.id} status updated to ${order.status}`);
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error('HubRise webhook error:', error);
    // Always return 200 to HubRise to avoid retry loops
    return NextResponse.json({ received: true, error: 'processing_failed' }, { status: 200 });
  }
}

// HubRise sends a GET request to verify webhook
export async function GET(req: NextRequest) {
  return NextResponse.json({ status: 'webhook_active' }, { status: 200 });
}

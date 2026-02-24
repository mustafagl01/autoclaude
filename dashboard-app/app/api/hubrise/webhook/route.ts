/**
 * HubRise Webhook Receiver
 * Handles order.create and order.update events from HubRise
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { normalizeOrder, extractCustomer, detectPlatform } from '@/lib/order-normalizer';

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
    const db = getDb();
    const connection = db.prepare(`
      SELECT user_id, access_token
      FROM hubrise_connections
      WHERE location_id = ? AND is_active = 1
      LIMIT 1
    `).get(location_id) as { user_id: string; access_token: string } | undefined;

    if (!connection) {
      console.error(`No active connection found for location: ${location_id}`);
      return NextResponse.json({ received: true }, { status: 200 });
    }

    const userId = connection.user_id;

    if (event_type === 'order.create') {
      // Check for duplicate order
      const existing = db.prepare(`
        SELECT id FROM orders WHERE hubrise_order_id = ?
      `).get(order.id);

      if (existing) {
        console.log(`Order ${order.id} already exists, skipping`);
        return NextResponse.json({ received: true, duplicate: true }, { status: 200 });
      }

      // Normalize order
      const normalizedOrder = normalizeOrder(
        {
          id: order.id,
          status: order.status,
          customer: order.customer || {},
          total_price: order.total_price,
          total_tax: order.total_tax || 0,
          currency: order.currency || 'GBP',
          items: order.items || [],
          created_at: order.created_at,
          updated_at: order.updated_at || order.created_at,
          service_type_ref: order.service_type_ref || '',
        },
        userId,
        location_id
      );

      // Insert order into database
      db.prepare(`
        INSERT INTO orders
        (hubrise_order_id, user_id, location_id, platform_source, status,
         customer_name, customer_phone, customer_address, customer_postcode, customer_city,
         total_cents, total_cents_tax, currency, items, order_created_at, order_updated_at, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `).run(
        normalizedOrder.hubrise_order_id,
        normalizedOrder.user_id,
        normalizedOrder.location_id,
        normalizedOrder.platform_source,
        normalizedOrder.status,
        normalizedOrder.customer_name,
        normalizedOrder.customer_phone,
        normalizedOrder.customer_address,
        normalizedOrder.customer_postcode,
        normalizedOrder.customer_city,
        normalizedOrder.total_cents,
        normalizedOrder.total_cents_tax,
        normalizedOrder.currency,
        normalizedOrder.items,
        normalizedOrder.order_created_at,
        normalizedOrder.order_updated_at
      );

      // Extract customer data
      const customerData = extractCustomer(
        {
          id: order.id,
          status: order.status,
          customer: order.customer || {},
          total_price: order.total_price,
          total_tax: order.total_tax || 0,
          currency: order.currency || 'GBP',
          items: order.items || [],
          created_at: order.created_at,
          updated_at: order.updated_at || order.created_at,
          service_type_ref: order.service_type_ref || '',
        },
        userId
      );

      // Upsert customer
      const existingCustomer = db.prepare(`
        SELECT id, total_orders, total_spent_cents
        FROM customers
        WHERE user_id = ? AND phone = ?
      `).get(userId, customerData.phone) as {
        id: number;
        total_orders: number;
        total_spent_cents: number;
      } | undefined;

      if (existingCustomer) {
        // Update existing customer
        db.prepare(`
          UPDATE customers
          SET name = ?,
              address = ?,
              postcode = ?,
              city = ?,
              total_orders = total_orders + 1,
              total_spent_cents = total_spent_cents + ?,
              last_order_date = ?,
              updated_at = datetime('now')
          WHERE id = ?
        `).run(
          customerData.name || existingCustomer.name,
          customerData.address || existingCustomer.address,
          customerData.postcode || existingCustomer.postcode,
          customerData.city || existingCustomer.city,
          normalizedOrder.total_cents,
          order.created_at,
          existingCustomer.id
        );
      } else {
        // Insert new customer
        db.prepare(`
          INSERT INTO customers
          (user_id, phone, name, address, postcode, city, total_orders, total_spent_cents, last_order_date, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, datetime('now'), datetime('now'))
        `).run(
          userId,
          customerData.phone,
          customerData.name,
          customerData.address,
          customerData.postcode,
          customerData.city,
          normalizedOrder.total_cents,
          order.created_at
        );
      }

      console.log(`Order ${order.id} created successfully`);
    } else if (event_type === 'order.update') {
      // Update existing order status
      db.prepare(`
        UPDATE orders
        SET status = ?,
            order_updated_at = ?
        WHERE hubrise_order_id = ?
      `).run(order.status, order.updated_at || new Date().toISOString(), order.id);

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

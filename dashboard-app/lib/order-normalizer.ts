/**
 * Order Normalizer
 * Converts HubRise order payloads into normalized database format
 */

import type { HubRiseOrder } from './hubrise-client';

export type PlatformSource = 'uber_eats' | 'just_eat' | 'deliveroo' | 'foodhub' | 'phone' | 'unknown';

export interface NormalizedOrder {
  hubrise_order_id: string;
  user_id: string;
  location_id: string;
  platform_source: PlatformSource;
  status: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  customer_postcode: string;
  customer_city: string;
  total_cents: number;
  total_cents_tax: number;
  currency: string;
  items: string; // JSON string
  order_created_at: string;
  order_updated_at: string;
}

export interface NormalizedCustomer {
  user_id: string;
  phone: string;
  name: string;
  address: string;
  postcode: string;
  city: string;
}

/**
 * Detect platform from service_type_ref
 * HubRise uses specific identifiers for each platform
 */
export function detectPlatform(serviceTypeRef: string): PlatformSource {
  if (!serviceTypeRef) return 'phone';

  const ref = serviceTypeRef.toLowerCase();

  // Uber Eats patterns
  if (ref.includes('uber') || ref.includes('ubereats')) {
    return 'uber_eats';
  }

  // Just Eat patterns
  if (ref.includes('just_eat') || ref.includes('justeat') || ref.includes('je')) {
    return 'just_eat';
  }

  // Deliveroo patterns
  if (ref.includes('deliveroo') || ref.includes('roo')) {
    return 'deliveroo';
  }

  // Foodhub patterns
  if (ref.includes('foodhub') || ref.includes('food_hub')) {
    return 'foodhub';
  }

  // Default to phone for direct orders
  return 'phone';
}

/**
 * Normalize phone number to UK format
 * Converts various formats to +44...
 */
export function normalizePhoneNumber(phone: string): string {
  if (!phone) return '';

  // Remove all non-numeric characters
  let cleaned = phone.replace(/\D/g, '');

  // If starts with 0, replace with +44
  if (cleaned.startsWith('0')) {
    cleaned = '44' + cleaned.substring(1);
  }

  // If doesn't start with 44, add it
  if (!cleaned.startsWith('44')) {
    cleaned = '44' + cleaned;
  }

  return '+' + cleaned;
}

/**
 * Normalize HubRise order to database format
 */
export function normalizeOrder(
  hubriseOrder: HubRiseOrder,
  userId: string,
  locationId: string
): NormalizedOrder {
  const customer = hubriseOrder.customer || {};
  const address = customer.address || {};

  return {
    hubrise_order_id: hubriseOrder.id,
    user_id: userId,
    location_id: locationId,
    platform_source: detectPlatform(hubriseOrder.service_type_ref),
    status: hubriseOrder.status || 'new',
    customer_name: customer.name || '',
    customer_phone: normalizePhoneNumber(customer.phone_number || ''),
    customer_address: address.street || '',
    customer_postcode: address.postcode || '',
    customer_city: address.city || '',
    total_cents: Math.round(hubriseOrder.total_price * 100), // Convert to cents
    total_cents_tax: Math.round((hubriseOrder.total_tax || 0) * 100),
    currency: hubriseOrder.currency || 'GBP',
    items: JSON.stringify(hubriseOrder.items || []),
    order_created_at: hubriseOrder.created_at,
    order_updated_at: hubriseOrder.updated_at,
  };
}

/**
 * Extract customer data from order
 */
export function extractCustomer(hubriseOrder: HubRiseOrder, userId: string): NormalizedCustomer {
  const customer = hubriseOrder.customer || {};
  const address = customer.address || {};

  return {
    user_id: userId,
    phone: normalizePhoneNumber(customer.phone_number || ''),
    name: customer.name || '',
    address: address.street || '',
    postcode: address.postcode || '',
    city: address.city || '',
  };
}

/**
 * Format cents to currency display (GBP)
 */
export function centsToPounds(cents: number): string {
  return `£${(cents / 100).toFixed(2)}`;
}

/**
 * Parse items JSON safely
 */
export function parseItems(itemsJson: string): Array<{
  name: string;
  quantity: number;
  price: number;
}> {
  try {
    return JSON.parse(itemsJson);
  } catch {
    return [];
  }
}

/**
 * Calculate order total for display
 */
export function calculateOrderTotal(itemsJson: string): number {
  const items = parseItems(itemsJson);
  return items.reduce((total, item) => {
    return total + (item.price * item.quantity * 100); // Convert to cents
  }, 0);
}

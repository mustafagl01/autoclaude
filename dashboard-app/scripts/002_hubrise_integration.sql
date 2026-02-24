-- Migration: 002_hubrise_integration
-- Description: HubRise integration tables for order aggregation and CRM
-- Database: Vercel Postgres (PostgreSQL)

-- HubRise OAuth connections
CREATE TABLE IF NOT EXISTS hubrise_connections (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  location_id TEXT NOT NULL,
  location_name TEXT,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, location_id)
);

CREATE INDEX IF NOT EXISTS idx_hubrise_connections_user_id ON hubrise_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_hubrise_connections_location_id ON hubrise_connections(location_id);
CREATE INDEX IF NOT EXISTS idx_hubrise_connections_is_active ON hubrise_connections(is_active);

-- Orders from all platforms (via HubRise)
CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  hubrise_order_id TEXT UNIQUE NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  location_id TEXT NOT NULL,
  platform_source TEXT NOT NULL, -- uber_eats, just_eat, deliveroo, foodhub, phone
  status TEXT NOT NULL DEFAULT 'new', -- new, accepted, rejected, preparing, ready, delivered, cancelled
  customer_name TEXT,
  customer_phone TEXT,
  customer_address TEXT,
  customer_postcode TEXT,
  customer_city TEXT,
  total_cents INTEGER NOT NULL, -- Store in pence/cents
  total_cents_tax INTEGER DEFAULT 0,
  currency TEXT DEFAULT 'GBP',
  items JSONB NOT NULL, -- JSON array of order items (PostgreSQL JSONB for better performance)
  order_created_at TIMESTAMP WITH TIME ZONE NOT NULL,
  order_updated_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_location_id ON orders(location_id);
CREATE INDEX IF NOT EXISTS idx_orders_hubrise_order_id ON orders(hubrise_order_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_platform_source ON orders(platform_source);
CREATE INDEX IF NOT EXISTS idx_orders_customer_phone ON orders(customer_phone);
CREATE INDEX IF NOT EXISTS idx_orders_order_created_at ON orders(order_created_at);

-- Customers for CRM
CREATE TABLE IF NOT EXISTS customers (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  name TEXT,
  address TEXT,
  postcode TEXT,
  city TEXT,
  total_orders INTEGER DEFAULT 0,
  total_spent_cents INTEGER DEFAULT 0,
  last_order_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, phone)
);

CREATE INDEX IF NOT EXISTS idx_customers_user_id ON customers(user_id);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_total_orders ON customers(total_orders);
CREATE INDEX IF NOT EXISTS idx_customers_last_order_date ON customers(last_order_date);

-- Migration tracking
INSERT INTO migrations (name, applied_at) VALUES ('002_hubrise_integration', NOW())
ON CONFLICT (name) DO NOTHING;

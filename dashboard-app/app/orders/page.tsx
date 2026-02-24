/**
 * Orders Dashboard
 * Real-time order management with platform badges
 */

'use client';

import { useEffect, useState } from 'react';

interface OrderItem {
  name: string;
  quantity: number;
  price: number;
}

interface Order {
  id: string;
  localId: number;
  platform: string;
  status: string;
  customer: {
    name: string;
    phone: string;
    address: string;
    postcode: string;
    city: string;
  };
  total: {
    amount: string;
    cents: number;
    tax: string;
    currency: string;
  };
  items: OrderItem[];
  timestamps: {
    created: string;
    updated: string;
  };
}

type FilterType = 'all' | 'new' | 'accepted' | 'preparing' | 'ready' | 'delivered';

const PLATFORM_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  uber_eats: { bg: 'bg-green-100', text: 'text-green-800', label: 'Uber Eats' },
  just_eat: { bg: 'bg-orange-100', text: 'text-orange-800', label: 'Just Eat' },
  deliveroo: { bg: 'bg-teal-100', text: 'text-teal-800', label: 'Deliveroo' },
  foodhub: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Foodhub' },
  phone: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Telefon' },
  unknown: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Bilinmeyen' },
};

const STATUS_LABELS: Record<string, string> = {
  new: 'Yeni',
  accepted: 'Kabul Edildi',
  rejected: 'Reddedildi',
  preparing: 'Hazırlanıyor',
  ready: 'Hazır',
  delivered: 'Teslim Edildi',
  cancelled: 'İptal',
};

export default function OrdersDashboardPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState<FilterType>('new');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch orders
  const fetchOrders = async () => {
    try {
      const status = filter === 'all' ? '' : filter;
      const res = await fetch(`/api/orders?status=${status}&limit=50`);

      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders || []);
      } else {
        setError('Siparişler yüklenirken hata oluştu');
      }
    } catch (err) {
      setError('Siparişler yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchOrders();
  }, [filter]);

  // Poll every 5 seconds
  useEffect(() => {
    const interval = setInterval(fetchOrders, 5000);
    return () => clearInterval(interval);
  }, [filter]);

  // Update order status
  const updateStatus = async (orderId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        fetchOrders();
      } else {
        setError('Durum güncellenirken hata oluştu');
      }
    } catch (err) {
      setError('Durum güncellenirken hata oluştu');
    }
  };

  const platformConfig = PLATFORM_COLORS[orders[0]?.platform] || PLATFORM_COLORS.unknown;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-3xl font-bold text-gray-900">Siparişler</h1>
          <p className="mt-2 text-gray-600">
            Tüm platformlardan gelen siparişleri buradan yönetin.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800">{error}</p>
            <button
              onClick={() => setError(null)}
              className="mt-2 text-sm text-red-600 hover:text-red-800"
            >
              Kapat
            </button>
          </div>
        )}

        {/* Filter Tabs */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="flex space-x-8">
            {[
              { key: 'new', label: 'Yeni' },
              { key: 'accepted', label: 'Kabul Edildi' },
              { key: 'preparing', label: 'Hazırlanıyor' },
              { key: 'ready', label: 'Hazır' },
              { key: 'delivered', label: 'Teslim Edildi' },
              { key: 'all', label: 'Tümü' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key as FilterType)}
                className={`${
                  filter === tab.key
                    ? 'border-orange-500 text-orange-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Orders Grid */}
        {orders.length === 0 ? (
          <div className="text-center py-12">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">Henüz sipariş yok</h3>
            <p className="mt-1 text-sm text-gray-500">
              {filter === 'new'
                ? 'Yeni siparişler burada görünecek.'
                : 'Bu filtrede sipariş bulunmuyor.'}
            </p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {orders.map((order) => {
              const platformConfig = PLATFORM_COLORS[order.platform] || PLATFORM_COLORS.unknown;

              return (
                <div
                  key={order.id}
                  className="bg-white shadow rounded-lg overflow-hidden hover:shadow-md transition-shadow"
                >
                  {/* Header */}
                  <div className="p-4 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${platformConfig.bg} ${platformConfig.text}`}
                      >
                        {platformConfig.label}
                      </span>
                      <span className="text-xs text-gray-500">
                        #{order.localId}
                      </span>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-4 space-y-4">
                    {/* Customer Info */}
                    <div>
                      <h3 className="font-medium text-gray-900">{order.customer.name || 'İsimsiz'}</h3>
                      <p className="text-sm text-gray-500">{order.customer.phone}</p>
                      <p className="text-sm text-gray-500 mt-1">
                        {order.customer.address}, {order.customer.postcode} {order.customer.city}
                      </p>
                    </div>

                    {/* Items */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Ürünler</h4>
                      <ul className="text-sm text-gray-600 space-y-1">
                        {order.items.map((item, idx) => (
                          <li key={idx} className="flex justify-between">
                            <span>
                              {item.quantity}x {item.name}
                            </span>
                            <span>£{(item.price * item.quantity).toFixed(2)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Total */}
                    <div className="pt-3 border-t border-gray-200">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-700">Toplam</span>
                        <span className="text-lg font-bold text-gray-900">{order.total.amount}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  {order.status === 'new' && (
                    <div className="p-4 bg-gray-50 border-t border-gray-200">
                      <div className="flex gap-2">
                        <button
                          onClick={() => updateStatus(order.id, 'accepted')}
                          className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                        >
                          Kabul Et
                        </button>
                        <button
                          onClick={() => updateStatus(order.id, 'rejected')}
                          className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                        >
                          Reddet
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Status Badge */}
                  {order.status !== 'new' && (
                    <div className="p-4 bg-gray-50 border-t border-gray-200">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                        {STATUS_LABELS[order.status] || order.status}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

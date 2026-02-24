/**
 * Settings - Integrations Page
 * Manage HubRise connection
 */

'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

interface HubRiseStatus {
  connected: boolean;
  location?: {
    id: string;
    name: string;
    connectedAt: string;
    updatedAt: string;
  };
}

export default function IntegrationsSettingsPage() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<HubRiseStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    // Check for success/error from OAuth callback
    if (searchParams.get('success') === 'true') {
      setSuccess('HubRise bağlantısı başarıyla kuruldu!');
      // Clear query param
      window.history.replaceState({}, '', '/settings/integrations');
    }
    if (searchParams.get('error')) {
      const errorCode = searchParams.get('error');
      setError(`HubRise bağlantı hatası: ${errorCode}`);
      window.history.replaceState({}, '', '/settings/integrations');
    }

    fetchStatus();
  }, [searchParams]);

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/hubrise/status');
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
      }
    } catch (err) {
      console.error('Failed to fetch HubRise status:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = () => {
    window.location.href = '/api/hubrise/auth';
  };

  const handleDisconnect = async () => {
    if (!confirm('HubRise bağlantısını kesmek istediğinizden emin misiniz?')) {
      return;
    }

    try {
      const res = await fetch('/api/hubrise/disconnect', {
        method: 'POST',
      });

      if (res.ok) {
        setStatus({ connected: false });
        setSuccess('HubRise bağlantısı kesildi.');
      } else {
        setError('Bağlantı kesilemedi.');
      }
    } catch (err) {
      setError('Bağlantı kesilirken hata oluştu.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Entegrasyonlar</h1>
          <p className="mt-2 text-gray-600">
            HubRise ve diğer platform entegrasyonlarını yönetin.
          </p>
        </div>

        {/* Alert Messages */}
        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-800">{success}</p>
          </div>
        )}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* HubRise Integration Card */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center">
              <div className="flex-shrink-0 h-12 w-12 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">HR</span>
              </div>
              <div className="ml-4">
                <h2 className="text-xl font-semibold text-gray-900">HubRise</h2>
                <p className="text-sm text-gray-500">
                  Sipariş aggregasyon platformu
                </p>
              </div>
            </div>

            {loading ? (
              <div className="animate-pulse h-6 w-24 bg-gray-200 rounded"></div>
            ) : status?.connected ? (
              <div className="flex flex-col items-end">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                  Bağlı
                </span>
                {status.location && (
                  <p className="mt-1 text-sm text-gray-500">
                    {status.location.name}
                  </p>
                )}
              </div>
            ) : (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
                Bağlı değil
              </span>
            )}
          </div>

          <div className="mt-6 border-t border-gray-200 pt-6">
            {loading ? (
              <div className="animate-pulse space-y-3">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            ) : status?.connected ? (
              <div>
                <dl className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Lokasyon ID</dt>
                    <dd className="mt-1 text-sm text-gray-900">{status.location?.id}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Lokasyon Adı</dt>
                    <dd className="mt-1 text-sm text-gray-900">{status.location?.name}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Bağlantı Tarihi</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {status.location?.connectedAt ? new Date(status.location.connectedAt).toLocaleDateString('tr-TR') : '-'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Son Güncelleme</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {status.location?.updatedAt ? new Date(status.location.updatedAt).toLocaleDateString('tr-TR') : '-'}
                    </dd>
                  </div>
                </dl>

                <div className="mt-6">
                  <button
                    onClick={handleDisconnect}
                    className="inline-flex items-center px-4 py-2 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  >
                    Bağlantıyı Kes
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-sm text-gray-600 mb-4">
                  HubRise ile bağlantı kurarak tüm platformlardan gelen siparişleri tek bir
                  dashboard'da yönetebilirsiniz.
                </p>
                <button
                  onClick={handleConnect}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                >
                  HubRise'a Bağlan
                </button>
              </div>
            )}
          </div>

          {/* Info Box */}
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3 flex-1">
                <h3 className="text-sm font-medium text-blue-800">
                  HubRise Nedir?
                </h3>
                <div className="mt-2 text-sm text-blue-700">
                  <p>
                    HubRise, Uber Eats, Just Eat, Deliveroo, Foodhub ve daha fazla teslimat
                    platformundan gelen siparişleri tek bir yerde toplar. Bağlantı kurulduktan
                    sonra siparişler otomatik olarak dashboard'ınıza düşecektir.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

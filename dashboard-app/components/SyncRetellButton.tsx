'use client';

import { useState } from 'react';

export default function SyncRetellButton() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSync = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch('/api/retell/sync', { method: 'POST' });
      const data = await res.json();

      if (!res.ok) {
        setMessage({
          type: 'error',
          text: data.error || 'Sync failed. Add your Retell API key in Profile.',
        });
        return;
      }

      const { synced, failed, total } = data.data ?? {};
      setMessage({
        type: 'success',
        text: total === 0
          ? 'No calls found in Retell.'
          : `Synced ${synced} call(s) from Retell.${failed ? ` ${failed} failed.` : ''}`,
      });
      // Refresh list after short delay so user sees the message
      setTimeout(() => window.location.reload(), 1500);
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Sync failed',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleSync}
        disabled={loading}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 text-sm font-medium"
      >
        {loading ? (
          <>
            <span className="inline-block w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
            Syncing…
          </>
        ) : (
          <>Sync from Retell</>
        )}
      </button>
      {message && (
        <p
          className={`text-sm ${
            message.type === 'success'
              ? 'text-green-600 dark:text-green-400'
              : 'text-red-600 dark:text-red-400'
          }`}
        >
          {message.text}
        </p>
      )}
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';

export function useUserStatus() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStatus() {
      try {
        const response = await fetch('/api/user/status');
        if (!response.ok) throw new Error('Failed to fetch status');
        const json = await response.json();
        setData(json);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchStatus();
    const interval = setInterval(fetchStatus, 30000); // Poll every 30s
    return () => clearInterval(interval);
  }, []);

  return { data, loading, error };
}

export function useLogs() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLogs() {
      try {
        const response = await fetch('/api/user/logs');
        if (!response.ok) throw new Error('Failed to fetch logs');
        const json = await response.json();
        setLogs(json);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    fetchLogs();
    const interval = setInterval(fetchLogs, 5000); // Poll logs every 5s
    return () => clearInterval(interval);
  }, []);

  return { logs, loading };
}

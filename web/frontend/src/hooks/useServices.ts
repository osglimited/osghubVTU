'use client';

import { useEffect, useState } from 'react';
import { getServices, getServiceBySlug, ServiceDoc } from '@/lib/services';

export function useServices() {
  const [services, setServices] = useState<ServiceDoc[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const s = await getServices();
        if (!mounted) return;
        setServices(s);
      } catch (err: any) {
        console.error('Failed to load services', err);
        setError(err?.message || 'Failed to load services');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => { mounted = false; };
  }, []);

  return { services, loading, error } as const;
}

export function useService(slug: string) {
  const [service, setService] = useState<ServiceDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const s = await getServiceBySlug(slug);
        if (!mounted) return;
        setService(s);
      } catch (err: any) {
        console.error('Failed to load service', err);
        setError(err?.message || 'Failed to load service');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => { mounted = false; };
  }, [slug]);

  return { service, loading, error } as const;
}
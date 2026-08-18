import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, setActivePatientId } from '../api/client';
import type { Portal } from '../types';
import { PortalContext } from './PortalContext';

export function PortalProvider({ children }: { children: ReactNode }) {
  const [portal, setPortal] = useState<Portal | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getPortal();
      setPortal(res.data);
      setActivePatientId(res.data.patient.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось загрузить кабинет');
    } finally {
      setLoading(false);
    }
  }, []);

  const selectPatient = useCallback(async (patientId: number) => {
    setActivePatientId(patientId);
    await refresh();
  }, [refresh]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo(
    () => ({ portal, loading, error, refresh, selectPatient }),
    [error, loading, portal, refresh, selectPatient],
  );

  return <PortalContext.Provider value={value}>{children}</PortalContext.Provider>;
}

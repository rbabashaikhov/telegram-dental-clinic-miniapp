import { createContext, useContext } from 'react';
import type { Portal } from '../types';

export interface PortalContextValue {
  portal: Portal | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  selectPatient: (patientId: number) => Promise<void>;
}

export const PortalContext = createContext<PortalContextValue | null>(null);

export function usePortal(): PortalContextValue {
  const value = useContext(PortalContext);
  if (!value) throw new Error('PortalContext missing');
  return value;
}

import { createContext, useContext } from 'react';
import type { AppConfig } from '../types';

export const DEFAULT_APP_CONFIG: AppConfig = {
  businessName: 'DentalCare',
  appTitle: 'DentalCare',
  appDescription: 'Личный кабинет стоматологической клиники',
  timezone: 'Europe/Moscow',
  demoMode: true,
  adminProtected: false,
  branding: { accent: '#1B6B63', logoUrl: null },
  features: { demoTour: true, demoAdminPreview: true },
};

export const BusinessContext = createContext<AppConfig>(DEFAULT_APP_CONFIG);

export function useBusiness(): AppConfig {
  return useContext(BusinessContext);
}

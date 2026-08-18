import { createContext, useContext } from 'react';

export interface DemoTourContextValue {
  start: () => void;
  skip: () => void;
  showChrome: boolean;
  demoTourEnabled: boolean;
  demoAdminPreviewEnabled: boolean;
}

export const DemoTourContext = createContext<DemoTourContextValue>({
  start: () => undefined,
  skip: () => undefined,
  showChrome: false,
  demoTourEnabled: false,
  demoAdminPreviewEnabled: false,
});

export function useDemoTour(): DemoTourContextValue {
  return useContext(DemoTourContext);
}

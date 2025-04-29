import type { ReactNode } from "react";

// Configuration provider component
export interface BasicProviderProps {
  apiUrl?: string;
  children: ReactNode;
  tenantId: string;
  token: string;
}

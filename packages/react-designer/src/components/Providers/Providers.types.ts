import type { ReactNode } from "react";

// Configuration provider component
export interface BasicProviderProps {
  apiUrl?: string;
  children: ReactNode;
  tenantId: string;
  token: string;
}

// Interface for custom image upload function
export interface ImageUploadConfig {
  file: File;
  onProgress?: (progress: number) => void;
}

export interface ImageUploadResponse {
  url: string;
}

export type UploadImageFunction = (config: ImageUploadConfig) => Promise<ImageUploadResponse>;

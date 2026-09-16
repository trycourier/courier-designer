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
  file: Blob; // Accept Blob (File extends Blob)
  onProgress?: (progress: number) => void;
}

export interface ImageUploadResponse {
  url: string;
}

// Support both old API and new API, with Blob or File
export type UploadImageFunction =
  | ((file: Blob) => Promise<string>) // Old API with Blob
  | ((file: File) => Promise<string>) // Old API with File
  | ((config: ImageUploadConfig) => Promise<ImageUploadResponse>); // New API with config

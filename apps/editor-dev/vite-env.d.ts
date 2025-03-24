/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_JWT_TOKEN: string;
  readonly VITE_TEMPLATE_ID: string;
  readonly VITE_TENANT_ID: string;
  readonly VITE_CLIENT_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

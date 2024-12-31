/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_IMAGE_PLACEHOLDER_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

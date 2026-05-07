/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_MIXPANEL_TOKEN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface Window {
  mixpanel?: {
    track: (name: string, properties?: Record<string, string | number | boolean | null | undefined>) => void;
  };
}

/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_SIPEG_URL: string;
  // Tambahkan env variable lain di sini jika diperlukan
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

const CLIENT_URL_KEYS = ['VITE_API_BASE_URL', 'VITE_NOTE_COLLAB_WS_URL'] as const;

export default defineConfig(({ mode }) => {
  // 无前缀：仅构建期使用，不会注入 import.meta.env 到浏览器
  const env = loadEnv(mode, process.cwd(), '');

  const servicesRegistry = env.SERVICES_REGISTRY;
  if (!servicesRegistry) {
    throw new Error(
      `[vite] 缺少 SERVICES_REGISTRY。请在 .env.${mode}（或 .env）中配置，指向 registry.impl.ts 或 registry.mock.ts`
    );
  }

  for (const key of CLIENT_URL_KEYS) {
    const value = env[key];
    if (!value) {
      throw new Error(`[vite] 缺少 ${key}。请检查 .env.${mode}`);
    }
    try {
      new URL(value);
    } catch {
      throw new Error(`[vite] ${key} 必须是绝对 URL。请检查 .env.${mode}`);
    }
  }

  return {
    plugins: [react(), tailwindcss()],
    server: {
      port: 5173,
      host: '0.0.0.0',
      allowedHosts: ['local.wisepen.oriole.cn'],
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@services-registry': path.resolve(__dirname, servicesRegistry),
      },
    },
  };
});

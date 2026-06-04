import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
    plugins: [react(), tailwindcss()],
    base: '/idendent_schedule_management/',
    server: {
        host: '0.0.0.0',
        hmr: { host: 'localhost' },
        watch: { usePolling: true },
    },
    test: {
        environment: 'jsdom',
        globals: true,
        setupFiles: ['./src/test-setup.ts'],
        passWithNoTests: true,
    },
});

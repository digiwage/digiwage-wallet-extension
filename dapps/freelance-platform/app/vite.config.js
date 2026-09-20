import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

export default defineConfig({
  // ethereumjs-abi (used to encode/decode contract calls) expects Node's
  // Buffer to exist globally; this polyfills it for the browser bundle.
  plugins: [react(), nodePolyfills({ include: ['buffer'] })],
  server: {
    host: '0.0.0.0',
    port: 5173
  }
});

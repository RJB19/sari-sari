import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,         // Allows access from local network
    port: 5173,         // Keep this or set another port
    strictPort: true,   // Ensures it won’t fall back to another port if 5173 is busy
  },
});
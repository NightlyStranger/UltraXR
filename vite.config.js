import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    host: true,               // listen on all IPs (0.0.0.0)
    port: 8080,               // your dev server port (adjust if needed)
    strictPort: true,         // fail if port is busy (optional)
    open: false,              // don’t open browser automatically
    allowedHosts: [
      '15de-62-99-136-202.ngrok-free.app',  // your current ngrok hostname here
      'localhost',
      '127.0.0.1',
    ],
  }
})
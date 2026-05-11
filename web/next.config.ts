import type { NextConfig } from "next";
import os from "os";

// Rileva gli IP LAN per allowedDevOrigins (necessario in Next.js 15 per accesso da telefono)
const nets = Object.values(os.networkInterfaces() || {}).flat();
const lanIPs = nets
  .filter((n): n is os.NetworkInterfaceInfo => n != null && n.family === 'IPv4' && !n.internal)
  .map(n => n.address);

const nextConfig: NextConfig = {
  // Permette alle richieste HMR di arrivare da dispositivi in rete locale (es. telefono)
  allowedDevOrigins: lanIPs,

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ]
  },
};

export default nextConfig;

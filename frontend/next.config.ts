import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Redirige llamadas /api/* al backend Python en puerto 8000
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://localhost:8000/:path*",
      },
    ];
  },
};

export default nextConfig;

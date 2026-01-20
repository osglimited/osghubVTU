/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  allowedDevOrigins: ['*.replit.dev', '*.replit.app', 'localhost', '127.0.0.1', '*.picard.replit.dev', '*.worf.replit.dev', '*.kirk.replit.dev'],
  turbopack: {},
  productionBrowserSourceMaps: false,
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
    ],
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  compiler: {
    removeConsole: { production: true },
  },
  webpack: (config, { dev }) => {
    if (!dev) {
      if (config.optimization) {
        config.optimization.minimize = false;
      } else {
        config.optimization = { minimize: false };
      }
      config.devtool = false;
    }
    return config;
  },
  async headers() {
    const isProd = process.env.NODE_ENV === 'production';
    const csp = [
      "default-src 'self'",
      "img-src 'self' data: https://firebasestorage.googleapis.com https://lh3.googleusercontent.com",
      "style-src 'self' 'unsafe-inline'",
      isProd ? "script-src 'self' 'unsafe-inline' blob:" : "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:",
      "font-src 'self' data:",
      [
        "connect-src",
        "'self'",
        "https://firestore.googleapis.com",
        "https://identitytoolkit.googleapis.com",
        "https://securetoken.googleapis.com",
        "http://localhost:5000",
        "https://osghubvtubackend.onrender.com",
      ].join(' '),
      "frame-ancestors 'self'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; ');
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: csp },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'geolocation=(), microphone=(), camera=(), fullscreen=(self)' },
        ],
      },
    ];
  },
}

module.exports = nextConfig

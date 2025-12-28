/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
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
    ignoreBuildErrors: false,
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
        "https://app.sublinkng.com",
        "https://apps.sublinkng.com",
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

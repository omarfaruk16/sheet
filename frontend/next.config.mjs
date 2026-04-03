/** @type {import('next').NextConfig} */
const backendServerUrl = process.env.BACKEND_SERVER_URL || 'http://localhost:5000';

const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'drive.google.com' },
      { protocol: 'https', hostname: '*.googleusercontent.com' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 'i.imgur.com' },
      { protocol: 'https', hostname: '*.imgur.com' },
      { protocol: 'https', hostname: '**' }, // allow any https image URL
      { protocol: 'http', hostname: 'localhost' },
      { protocol: 'http', hostname: 'localhost', port: '5000' },
      { protocol: 'http', hostname: '127.0.0.1' },
      { protocol: 'http', hostname: '127.0.0.1', port: '5000' },
    ],
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${backendServerUrl}/api/:path*`,
      },
      {
        source: '/uploads/:path*',
        destination: `${backendServerUrl}/uploads/:path*`,
      },
      {
        source: '/downloads/:path*',
        destination: `${backendServerUrl}/downloads/:path*`,
      },
    ];
  },
};

export default nextConfig;

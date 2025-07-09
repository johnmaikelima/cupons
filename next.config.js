/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      }
    ],
    domains: ['images.unsplash.com', 'via.placeholder.com', 'res.cloudinary.com'],
  },
  // Configuração de parse do corpo da requisição
  api: {
    bodyParser: {
      sizeLimit: '4mb'
    },
    responseLimit: '4mb',
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '4mb',
      allowedOrigins: ['*']
    }
  },
  typescript: {
    ignoreBuildErrors: true
  },
  eslint: {
    ignoreDuringBuilds: true
  },
  webpack: (config) => {
    config.resolve = {
      ...config.resolve,
      alias: {
        ...config.resolve.alias,
        '@': require('path').resolve(__dirname, './src'),
      },
      modules: [
        ...(config.resolve.modules || []),
        require('path').resolve(__dirname, 'paapi5', 'src')
      ],
      fallback: {
        ...config.resolve.fallback,
        'crypto': require.resolve('crypto-browserify'),
        'stream': require.resolve('stream-browserify'),
        'buffer': require.resolve('buffer/')
      }
    };
    return config;
  },
};

module.exports = nextConfig;

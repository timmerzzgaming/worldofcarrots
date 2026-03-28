/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack(config) {
    config.module.rules.push({
      test: /\.geojson$/,
      type: 'json',
    })
    return config
  },
  async rewrites() {
    return [
      {
        source: '/test',
        destination: '/',
      },
      {
        source: '/test/:path*',
        destination: '/:path*',
      },
    ]
  },
}

module.exports = nextConfig

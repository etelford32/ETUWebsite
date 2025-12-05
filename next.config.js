/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['api.dicebear.com', 'avatars.steamstatic.com'],
  },
  async redirects() {
    return [
      {
        source: '/campaign/megabot',
        destination: '/pages/rise-of-machines.html',
        permanent: false,
      },
    ]
  },
}

module.exports = nextConfig

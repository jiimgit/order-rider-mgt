/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Cache headers so customers and the administrator pick up the latest deployed code
  // on their next page open (instead of running old cached JavaScript for days).
  //   - HTML routes: browser must revalidate with the server on every load.
  //   - /_next/static/*: filenames are content-hashed by Next.js, so they can be cached long-term;
  //     when the code changes the filename changes and the old cache is bypassed automatically.
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' },
        ],
      },
      {
        source: '/_next/static/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
    ];
  },
}

module.exports = nextConfig

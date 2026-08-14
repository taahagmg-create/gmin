/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    // Vehicle photos are published on Autostock's CDN. Stable URLs, no session
    // token, so they can be optimised through next/image directly.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "files.autostock.co.nz",
        pathname: "/Organisations/**",
      },
      {
        // Beautified photos, once the pipeline publishes them. Without this,
        // next/image refuses to optimise them and every enhanced image 400s —
        // the failure would only appear after the first backfill run.
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
      },
    ],
  },
};

export default nextConfig;
